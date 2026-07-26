"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export async function exportClipCandidateAction(
  clipCandidateId: string,
  options?: { existingJobId?: string },
): Promise<ExportClipResult> {
  const { supabase, user } = await requireUser();

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
        status: "processing",
        progress_percentage: 10,
        error_message: null,
        started_at: new Date().toISOString(),
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
        status: "processing",
        progress_percentage: 10,
        started_at: new Date().toISOString(),
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

  if (exportedClipId) {
    await supabase
      .from("exported_clips")
      .update({
        title: clip.title,
        start_time: startTime,
        end_time: endTime,
        duration_seconds: durationSeconds,
        status: "processing",
        error_message: null,
        processing_job_id: jobId,
        internal_storage_path: storagePath,
      })
      .eq("id", exportedClipId);
  } else {
    const { data: created, error: createError } = await supabase
      .from("exported_clips")
      .insert({
        user_id: user.id,
        project_id: clip.project_id,
        source_file_id: file.id,
        clip_candidate_id: clip.id,
        processing_job_id: jobId,
        title: clip.title,
        start_time: startTime,
        end_time: endTime,
        duration_seconds: durationSeconds,
        mime_type: "video/mp4",
        internal_storage_path: storagePath,
        status: "processing",
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

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .download(file.internal_storage_path);

    if (downloadError || !blob) {
      throw new Error(
        downloadError?.message || "Unable to download the private source video.",
      );
    }

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 35 })
      .eq("id", jobId);

    const form = new FormData();
    form.append("file", blob, file.original_filename);
    form.append("start_time", String(startTime));
    form.append("end_time", String(endTime));
    form.append("original_filename", file.original_filename);

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

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 75 })
      .eq("id", jobId);

    if (existingExport?.internal_storage_path) {
      await supabase.storage
        .from(SOURCE_STORAGE_BUCKET)
        .remove([existingExport.internal_storage_path]);
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
      })
      .eq("id", exportedClipId);

    if (updateExportError) {
      throw new Error("Unable to finalize exported clip metadata.");
    }

    await supabase
      .from("clip_candidates")
      .update({ status: "exported" })
      .eq("id", clip.id);

    await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId);

    const { data: signed } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    revalidateExportPaths(clip.project_id, file.id);

    return {
      ok: true,
      jobId,
      exportedClipId,
      signedUrl: signed?.signedUrl,
      message: `Exported “${clip.title}” (${durationSeconds.toFixed(1)}s).`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Clip export failed.";

    await supabase
      .from("exported_clips")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
      })
      .eq("id", exportedClipId);

    await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
      })
      .eq("id", jobId);

    revalidateExportPaths(clip.project_id, file.id);
    return { ok: false, error: message };
  }
}

export async function exportApprovedClipsAction(
  sourceFileId: string,
): Promise<ExportClipResult> {
  const { supabase } = await requireUser();
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

  let success = 0;
  const failures: string[] = [];

  for (const clip of clips) {
    const result = await exportClipCandidateAction(clip.id);
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
        ? `Exported ${success} approved clip${success === 1 ? "" : "s"}.`
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
