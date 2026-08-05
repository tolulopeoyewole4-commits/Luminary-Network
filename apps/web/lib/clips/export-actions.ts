"use server";

import { randomUUID } from "node:crypto";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildWebVtt } from "@/lib/captions/format";
import { getCaptionsForSourceFile } from "@/lib/captions/queries";
import {
  bumpProcessingJobProgressIfActive,
  completeProcessingJobIfActive,
  failProcessingJobIfActive,
  isProcessingJobActive,
  markProcessingJobRunningIfActive,
} from "@/lib/jobs/cancellation";
import {
  isAsyncClipExportEnabled,
  isDedicatedJobWorkerEnabled,
} from "@/lib/jobs/flags";
import {
  brandLabelFromProfile,
  describeExportPresets,
  parseClipExportPresets,
  sliceCaptionsForClip,
  type ClipExportPresets,
} from "@/lib/clips/export-presets";
import { getOwnProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import {
  SIGNED_URL_EXPIRY_SECONDS,
  SOURCE_STORAGE_BUCKET,
} from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";

export type ExportClipResult =
  | {
      ok: true;
      message: string;
      jobId?: string;
      exportedClipId?: string;
      signedUrl?: string;
      queued?: boolean;
    }
  | { ok: false; error: string };

function getApiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000"
  ).replace(/\/$/, "");
}

function getInternalApiToken(): string {
  return process.env.INTERNAL_API_TOKEN ?? "dev-internal-token";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function revalidateExportPaths(projectId: string, sourceFileId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}/clips`);
  revalidatePath("/dashboard");
}

type EnqueuedExport = {
  clipCandidateId: string;
  sourceFileId: string;
  projectId: string;
  jobId: string;
  exportedClipId: string;
  storagePath: string;
  previousStoragePath: string | null;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  originalFilename: string;
  sourceStoragePath: string;
  presets: ClipExportPresets;
  userId: string;
};

async function resolveExportOverlays(
  work: Pick<
    EnqueuedExport,
    "sourceFileId" | "startTime" | "endTime" | "presets" | "userId"
  >,
): Promise<
  | { ok: true; captionsVtt: string | null; brandText: string | null }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  let captionsVtt: string | null = null;
  let brandText: string | null = null;

  if (work.presets.burnCaptions) {
    const { caption, error } = await getCaptionsForSourceFile(
      supabase,
      work.sourceFileId,
    );
    if (error) return { ok: false, error };
    if (!caption?.cues.length) {
      return {
        ok: false,
        error:
          "Burn-in captions requested, but this video has no captions yet. Generate captions first, or turn off burn captions.",
      };
    }
    const sliced = sliceCaptionsForClip(
      caption.cues.map((cue) => ({
        startTime: Number(cue.start_time),
        endTime: Number(cue.end_time),
        text: cue.text,
      })),
      work.startTime,
      work.endTime,
    );
    if (sliced.length === 0) {
      return {
        ok: false,
        error:
          "Burn-in captions requested, but no caption cues overlap this clip window.",
      };
    }
    captionsVtt = buildWebVtt(sliced);
  }

  if (work.presets.brandStamp) {
    const profile = await getOwnProfile(supabase, work.userId);
    brandText = brandLabelFromProfile(profile);
    if (!brandText) {
      return {
        ok: false,
        error:
          "Brand stamp requested, but your profile has no display name. Set one in Settings.",
      };
    }
  }

  return { ok: true, captionsVtt, brandText };
}

async function enqueueClipExport(
  clipCandidateId: string,
  options?: { existingJobId?: string; presets?: Partial<ClipExportPresets> },
): Promise<{ ok: true; work: EnqueuedExport } | { ok: false; error: string }> {
  const { supabase, user } = await requireUser();
  const presets = parseClipExportPresets(options?.presets);

  const { data: clip, error: clipError } = await supabase
    .from("clip_candidates")
    .select("*")
    .eq("id", clipCandidateId)
    .maybeSingle();

  if (clipError || !clip) {
    return { ok: false, error: "Clip candidate not found or inaccessible." };
  }

  if (clip.status !== "approved" && clip.status !== "exported") {
    return {
      ok: false,
      error: "Approve the clip candidate before exporting.",
    };
  }

  const { file, error: fileError } = await getOwnSourceFile(
    supabase,
    clip.source_file_id,
  );
  if (fileError) return { ok: false, error: fileError };
  if (!file) return { ok: false, error: "Source video not found or inaccessible." };
  if (file.processing_status === "uploading") {
    return { ok: false, error: "Finish uploading the source video before export." };
  }

  // Validate overlays early so queued worker/after jobs fail fast in the UI.
  const preview = await resolveExportOverlays({
    sourceFileId: file.id,
    startTime: Number(clip.start_time),
    endTime: Number(clip.end_time),
    presets,
    userId: user.id,
  });
  if (!preview.ok) return preview;

  let jobId = options?.existingJobId;

  if (jobId) {
    const { data: existing } = await supabase
      .from("processing_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .maybeSingle();
    if (!existing || existing.user_id !== user.id) {
      return { ok: false, error: "Processing job not found or inaccessible." };
    }
    await supabase
      .from("processing_jobs")
      .update({
        status: "queued",
        progress_percentage: 0,
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq("id", jobId);
  } else {
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        user_id: user.id,
        project_id: clip.project_id,
        source_file_id: file.id,
        job_type: "video_export",
        status: "queued",
        progress_percentage: 0,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create export job", jobError?.message);
      return { ok: false, error: "Unable to start clip export." };
    }
    jobId = job.id;
  }

  const objectId = randomUUID();
  const storagePath = `${user.id}/${clip.project_id}/exports/${objectId}.mp4`;
  const startTime = Number(clip.start_time);
  const endTime = Number(clip.end_time);
  const durationSeconds = Number((endTime - startTime).toFixed(3));

  const { data: existingExport } = await supabase
    .from("exported_clips")
    .select("*")
    .eq("clip_candidate_id", clip.id)
    .maybeSingle();

  let exportedClipId = existingExport?.id;
  const previousStoragePath = existingExport?.internal_storage_path ?? null;

  const exportFields = {
    title: clip.title,
    start_time: startTime,
    end_time: endTime,
    duration_seconds: durationSeconds,
    status: "processing" as const,
    error_message: null,
    processing_job_id: jobId,
    internal_storage_path: storagePath,
    aspect_ratio: presets.aspectRatio,
    burn_captions: presets.burnCaptions,
    brand_stamp: presets.brandStamp,
  };

  if (exportedClipId) {
    await supabase
      .from("exported_clips")
      .update(exportFields)
      .eq("id", exportedClipId);
  } else {
    const { data: created, error: createError } = await supabase
      .from("exported_clips")
      .insert({
        user_id: user.id,
        project_id: clip.project_id,
        source_file_id: file.id,
        clip_candidate_id: clip.id,
        mime_type: "video/mp4",
        ...exportFields,
      })
      .select("id")
      .single();

    if (createError || !created) {
      await supabase
        .from("processing_jobs")
        .update({
          status: "failed",
          progress_percentage: 100,
          completed_at: new Date().toISOString(),
          error_message: "Unable to create exported clip record.",
        })
        .eq("id", jobId);
      return { ok: false, error: "Unable to create exported clip record." };
    }
    exportedClipId = created.id;
  }

  revalidateExportPaths(clip.project_id, file.id);

  return {
    ok: true,
    work: {
      clipCandidateId: clip.id,
      sourceFileId: file.id,
      projectId: clip.project_id,
      jobId,
      exportedClipId,
      storagePath,
      previousStoragePath,
      title: clip.title,
      startTime,
      endTime,
      durationSeconds,
      originalFilename: file.original_filename,
      sourceStoragePath: file.internal_storage_path,
      presets,
      userId: user.id,
    },
  };
}

async function executeClipExport(work: EnqueuedExport): Promise<ExportClipResult> {
  const supabase = await createClient();
  const {
    jobId,
    exportedClipId,
    storagePath,
    previousStoragePath,
    title,
    startTime,
    endTime,
    durationSeconds,
    originalFilename,
    sourceStoragePath,
    projectId,
    sourceFileId,
    clipCandidateId,
    presets,
  } = work;

  const started = await markProcessingJobRunningIfActive(supabase, jobId, 10);
  if (!started) {
    return { ok: false, error: "This job was cancelled." };
  }

  try {
    const overlays = await resolveExportOverlays(work);
    if (!overlays.ok) {
      throw new Error(overlays.error);
    }

    const { data: blob, error: downloadError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .download(sourceStoragePath);

    if (downloadError || !blob) {
      throw new Error(
        downloadError?.message || "Unable to download the private source video.",
      );
    }

    await bumpProcessingJobProgressIfActive(supabase, jobId, 35);

    const form = new FormData();
    form.append("file", blob, originalFilename);
    form.append("start_time", String(startTime));
    form.append("end_time", String(endTime));
    form.append("original_filename", originalFilename);
    form.append("aspect_ratio", presets.aspectRatio);
    if (overlays.captionsVtt) {
      form.append("captions_vtt", overlays.captionsVtt);
    }
    if (overlays.brandText) {
      form.append("brand_text", overlays.brandText);
    }

    const response = await fetch(`${getApiBaseUrl()}/api/v1/videos/export-clip`, {
      method: "POST",
      headers: {
        "X-Internal-Token": getInternalApiToken(),
      },
      body: form,
    });

    if (!response.ok) {
      let detail = "Clip export failed.";
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { detail?: string };
        if (typeof payload.detail === "string") detail = payload.detail;
      }
      throw new Error(detail);
    }

    const clipBytes = await response.arrayBuffer();
    if (!clipBytes.byteLength) {
      throw new Error("Exported clip was empty.");
    }

    await bumpProcessingJobProgressIfActive(supabase, jobId, 75);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, error: "This job was cancelled." };
    }

    if (previousStoragePath && previousStoragePath !== storagePath) {
      await supabase.storage
        .from(SOURCE_STORAGE_BUCKET)
        .remove([previousStoragePath]);
    }

    const { error: uploadError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .upload(storagePath, clipBytes, {
        contentType: "video/mp4",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Unable to store exported clip.");
    }

    const { error: updateExportError } = await supabase
      .from("exported_clips")
      .update({
        status: "ready",
        file_size: clipBytes.byteLength,
        mime_type: "video/mp4",
        internal_storage_path: storagePath,
        error_message: null,
        processing_job_id: jobId,
        aspect_ratio: presets.aspectRatio,
        burn_captions: presets.burnCaptions,
        brand_stamp: presets.brandStamp,
      })
      .eq("id", exportedClipId);

    if (updateExportError) {
      throw new Error("Unable to finalize exported clip metadata.");
    }

    const completed = await completeProcessingJobIfActive(supabase, jobId);
    if (!completed) {
      await supabase
        .from("exported_clips")
        .update({
          status: "failed",
          error_message: "Export cancelled by user.",
        })
        .eq("id", exportedClipId);
      return { ok: false, error: "This job was cancelled." };
    }

    await supabase
      .from("clip_candidates")
      .update({ status: "exported" })
      .eq("id", clipCandidateId);

    const { data: signed } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    revalidateExportPaths(projectId, sourceFileId);

    return {
      ok: true,
      jobId,
      exportedClipId,
      signedUrl: signed?.signedUrl,
      message: `Exported “${title}” (${durationSeconds.toFixed(1)}s · ${describeExportPresets(presets)}).`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clip export failed.";

    const failed = await failProcessingJobIfActive(supabase, jobId, message);
    if (failed) {
      await supabase
        .from("exported_clips")
        .update({
          status: "failed",
          error_message: message.slice(0, 500),
        })
        .eq("id", exportedClipId);
    }

    revalidateExportPaths(projectId, sourceFileId);
    return { ok: false, error: message };
  }
}

export async function exportClipCandidateAction(
  clipCandidateId: string,
  options?: { existingJobId?: string; presets?: Partial<ClipExportPresets> },
): Promise<ExportClipResult> {
  const queued = await enqueueClipExport(clipCandidateId, options);
  if (!queued.ok) return queued;

  if (isDedicatedJobWorkerEnabled()) {
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      exportedClipId: queued.work.exportedClipId,
      message:
        "Reel export queued for the dedicated worker. Watch progress on the jobs list; download when the export shows ready.",
    };
  }

  if (isAsyncClipExportEnabled()) {
    after(() => {
      void executeClipExport(queued.work);
    });
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      exportedClipId: queued.work.exportedClipId,
      message:
        "Reel export queued. Watch progress on the jobs list; download when the export shows ready.",
    };
  }

  return executeClipExport(queued.work);
}

export async function exportApprovedClipsAction(
  sourceFileId: string,
  options?: { presets?: Partial<ClipExportPresets> },
): Promise<ExportClipResult> {
  const { supabase } = await requireUser();
  const presets = parseClipExportPresets(options?.presets);
  const { data: clips, error } = await supabase
    .from("clip_candidates")
    .select("id, title")
    .eq("source_file_id", sourceFileId)
    .eq("status", "approved")
    .order("rank", { ascending: true });

  if (error) {
    return { ok: false, error: "Unable to load approved clips." };
  }

  if (!clips?.length) {
    return { ok: false, error: "No approved clips to export." };
  }

  if (isAsyncClipExportEnabled() || isDedicatedJobWorkerEnabled()) {
    let queued = 0;
    const failures: string[] = [];

    for (const clip of clips) {
      const result = await exportClipCandidateAction(clip.id, { presets });
      if (result.ok) {
        queued += 1;
      } else {
        failures.push(`${clip.title}: ${result.error}`);
      }
    }

    if (queued === 0) {
      return {
        ok: false,
        error: failures[0] || "Unable to queue approved clips.",
      };
    }

    return {
      ok: true,
      queued: true,
      message:
        failures.length === 0
          ? `Queued ${queued} approved reel export${queued === 1 ? "" : "s"} (${describeExportPresets(presets)}).`
          : `Queued ${queued} export(s); ${failures.length} failed to queue.`,
    };
  }

  let success = 0;
  const failures: string[] = [];

  for (const clip of clips) {
    const result = await exportClipCandidateAction(clip.id, { presets });
    if (result.ok) {
      success += 1;
    } else {
      failures.push(`${clip.title}: ${result.error}`);
    }
  }

  if (success === 0) {
    return {
      ok: false,
      error: failures[0] || "Unable to export approved clips.",
    };
  }

  return {
    ok: true,
    message:
      failures.length === 0
        ? `Exported ${success} approved clip${success === 1 ? "" : "s"} (${describeExportPresets(presets)}).`
        : `Exported ${success} clip(s); ${failures.length} failed.`,
  };
}

export async function createExportedClipSignedUrlAction(
  exportedClipId: string,
): Promise<ExportClipResult> {
  const { supabase } = await requireUser();
  const { data: exported, error } = await supabase
    .from("exported_clips")
    .select("*")
    .eq("id", exportedClipId)
    .maybeSingle();

  if (error || !exported) {
    return { ok: false, error: "Exported clip not found or inaccessible." };
  }
  if (exported.status !== "ready") {
    return { ok: false, error: "This export is not ready for download." };
  }

  const { data, error: signError } = await supabase.storage
    .from(SOURCE_STORAGE_BUCKET)
    .createSignedUrl(exported.internal_storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !data?.signedUrl) {
    return { ok: false, error: "Unable to create a secure download link." };
  }

  return {
    ok: true,
    message: `Download ready for “${exported.title || "clip"}”.`,
    signedUrl: data.signedUrl,
    exportedClipId: exported.id,
  };
}
