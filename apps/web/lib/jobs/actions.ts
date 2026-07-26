"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SOURCE_STORAGE_BUCKET, VIDEO_FILE_TYPES } from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";
import type { SourceFileType } from "@/types/database";

export type VideoJobResult =
  | { ok: true; message: string; jobId: string }
  | { ok: false; error: string };

type VideoMetadataResponse = {
  duration_seconds: number;
  width?: number | null;
  height?: number | null;
  video_codec?: string | null;
  audio_codec?: string | null;
  format_name?: string | null;
  size_bytes?: number | null;
  detail?: string;
};

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

function isVideoType(fileType: SourceFileType): boolean {
  return (VIDEO_FILE_TYPES as readonly string[]).includes(fileType);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function runVideoMetadataJob(input: {
  sourceFileId: string;
  existingJobId?: string;
}): Promise<VideoJobResult> {
  const { supabase, user } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, input.sourceFileId);

  if (error) return { ok: false, error };
  if (!file) return { ok: false, error: "File not found or inaccessible." };
  if (!isVideoType(file.file_type)) {
    return { ok: false, error: "Only MP4 and MOV files can be processed here." };
  }
  if (file.processing_status === "uploading") {
    return { ok: false, error: "Finish uploading this video before processing." };
  }

  let jobId = input.existingJobId;

  if (jobId) {
    const { data: existing } = await supabase
      .from("processing_jobs")
      .select("*")
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
        project_id: file.project_id,
        source_file_id: file.id,
        job_type: "video_metadata",
        status: "queued",
        progress_percentage: 0,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create video job", jobError?.message);
      return { ok: false, error: "Unable to queue video processing." };
    }
    jobId = job.id;
  }

  await supabase
    .from("source_files")
    .update({
      processing_status: "processing",
      error_message: null,
    })
    .eq("id", file.id);

  await supabase
    .from("processing_jobs")
    .update({
      status: "processing",
      progress_percentage: 15,
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", jobId);

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .download(file.internal_storage_path);

    if (downloadError || !blob) {
      throw new Error(
        downloadError?.message || "Unable to download the private video file.",
      );
    }

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 45 })
      .eq("id", jobId);

    const form = new FormData();
    form.append("file", blob, file.original_filename);
    form.append("original_filename", file.original_filename);

    const response = await fetch(`${getApiBaseUrl()}/api/v1/videos/metadata`, {
      method: "POST",
      headers: {
        "X-Internal-Token": getInternalApiToken(),
      },
      body: form,
    });

    const payload = (await response.json()) as VideoMetadataResponse;
    if (!response.ok) {
      throw new Error(
        typeof payload.detail === "string"
          ? payload.detail
          : "Video metadata extraction failed.",
      );
    }

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 80 })
      .eq("id", jobId);

    const { error: updateError } = await supabase
      .from("source_files")
      .update({
        processing_status: "ready",
        video_duration_seconds: payload.duration_seconds,
        media_metadata: {
          width: payload.width ?? null,
          height: payload.height ?? null,
          video_codec: payload.video_codec ?? null,
          audio_codec: payload.audio_codec ?? null,
          format_name: payload.format_name ?? null,
        },
        error_message: null,
      })
      .eq("id", file.id);

    if (updateError) {
      throw new Error("Unable to save video metadata.");
    }

    await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId);

    revalidatePath("/dashboard");
    revalidatePath(`/projects/${file.project_id}`);
    revalidatePath(`/projects/${file.project_id}/files/${file.id}`);

    return {
      ok: true,
      jobId,
      message: `Processed video metadata (${payload.duration_seconds.toFixed(1)}s).`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Video processing failed.";

    await supabase
      .from("source_files")
      .update({
        processing_status: "failed",
        error_message: message.slice(0, 500),
      })
      .eq("id", file.id);

    await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
      })
      .eq("id", jobId);

    revalidatePath("/dashboard");
    revalidatePath(`/projects/${file.project_id}`);

    return { ok: false, error: message };
  }
}

export async function processVideoAction(
  sourceFileId: string,
): Promise<VideoJobResult> {
  return runVideoMetadataJob({ sourceFileId });
}

export async function retryProcessingJobAction(
  jobId: string,
): Promise<VideoJobResult> {
  const { supabase } = await requireUser();
  const { data: job } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (!job) {
    return { ok: false, error: "Processing job not found or inaccessible." };
  }

  if (job.status !== "failed") {
    return { ok: false, error: "Only failed jobs can be retried." };
  }

  if (job.job_type === "video_metadata") {
    if (!job.source_file_id) {
      return { ok: false, error: "This job has no linked source file." };
    }
    return runVideoMetadataJob({
      sourceFileId: job.source_file_id,
      existingJobId: job.id,
    });
  }

  if (job.job_type === "document_extract") {
    // Reuse document processing by importing lazily to avoid circular deps.
    const { processDocumentAction } = await import("@/lib/documents/actions");
    if (!job.source_file_id) {
      return { ok: false, error: "This job has no linked source file." };
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
      .eq("id", job.id);

    const result = await processDocumentAction(job.source_file_id);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return {
      ok: true,
      jobId: job.id,
      message: result.message,
    };
  }

  if (job.job_type === "video_transcribe") {
    if (!job.source_file_id) {
      return { ok: false, error: "This job has no linked source file." };
    }
    const { generateMockTranscriptAction } = await import(
      "@/lib/transcripts/actions"
    );
    const result = await generateMockTranscriptAction(job.source_file_id, {
      existingJobId: job.id,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return {
      ok: true,
      jobId: result.jobId ?? job.id,
      message: result.message,
    };
  }

  if (job.job_type === "clip_detect") {
    if (!job.source_file_id) {
      return { ok: false, error: "This job has no linked source file." };
    }
    const { detectClipCandidatesAction } = await import("@/lib/clips/actions");
    const result = await detectClipCandidatesAction(job.source_file_id, {
      existingJobId: job.id,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return {
      ok: true,
      jobId: result.jobId ?? job.id,
      message: result.message,
    };
  }

  return {
    ok: false,
    error: `Retry is not implemented for job type "${job.job_type}" yet.`,
  };
}
