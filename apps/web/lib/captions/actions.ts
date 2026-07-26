"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildCaptionCuesFromSegments,
  buildSrt,
  buildWebVtt,
} from "@/lib/captions/format";
import {
  bumpProcessingJobProgressIfActive,
  completeProcessingJobIfActive,
  failProcessingJobIfActive,
  isProcessingJobActive,
  markProcessingJobRunningIfActive,
} from "@/lib/jobs/cancellation";
import { isAsyncMockVideoJobsEnabled } from "@/lib/jobs/flags";
import { createClient } from "@/lib/supabase/server";
import { buildMockTranscriptSegments } from "@/lib/transcripts/mock";
import { getTranscriptForSourceFile } from "@/lib/transcripts/queries";
import { VIDEO_FILE_TYPES } from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";
import type { SourceFileType } from "@/types/database";

export type CaptionActionResult =
  | {
      ok: true;
      message: string;
      jobId?: string;
      captionId?: string;
      content?: string;
      filename?: string;
      mimeType?: string;
      queued?: boolean;
    }
  | { ok: false; error: string };

type EnqueuedCaptions = {
  sourceFileId: string;
  projectId: string;
  jobId: string;
  userId: string;
  durationSeconds: number;
  title: string;
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function isVideoType(fileType: SourceFileType): boolean {
  return (VIDEO_FILE_TYPES as readonly string[]).includes(fileType);
}

function revalidateCaptionPaths(projectId: string, sourceFileId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}/captions`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}/transcript`);
}

async function enqueueCaptionGenerate(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<
  | { ok: true; work: EnqueuedCaptions }
  | { ok: false; error: string }
> {
  const { supabase, user } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, sourceFileId);

  if (error) return { ok: false, error };
  if (!file) return { ok: false, error: "File not found or inaccessible." };
  if (!isVideoType(file.file_type)) {
    return { ok: false, error: "Captions are available for video files only." };
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
        job_type: "caption_generate",
        status: "queued",
        progress_percentage: 0,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create caption job", jobError?.message);
      return { ok: false, error: "Unable to start caption generation." };
    }
    jobId = job.id;
  }

  revalidateCaptionPaths(file.project_id, file.id);

  return {
    ok: true,
    work: {
      sourceFileId: file.id,
      projectId: file.project_id,
      jobId,
      userId: user.id,
      durationSeconds: Number(file.video_duration_seconds ?? 60),
      title: file.original_filename,
    },
  };
}

async function executeCaptionGenerate(
  work: EnqueuedCaptions,
): Promise<CaptionActionResult> {
  const supabase = await createClient();
  const {
    sourceFileId,
    projectId,
    jobId,
    userId,
    durationSeconds,
    title,
  } = work;

  const started = await markProcessingJobRunningIfActive(supabase, jobId, 10);
  if (!started) {
    return { ok: false, error: "This job was cancelled." };
  }

  try {
    const { transcript } = await getTranscriptForSourceFile(
      supabase,
      sourceFileId,
    );

    await bumpProcessingJobProgressIfActive(supabase, jobId, 40);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, error: "This job was cancelled." };
    }

    const segments =
      transcript?.segments.map((segment) => ({
        startTime: Number(segment.start_time),
        endTime: Number(segment.end_time),
        text: segment.text,
      })) ??
      buildMockTranscriptSegments({
        durationSeconds,
        title,
      }).map((segment) => ({
        startTime: segment.startTime,
        endTime: segment.endTime,
        text: segment.text,
      }));

    const cues = buildCaptionCuesFromSegments({ segments });
    if (cues.length === 0) {
      throw new Error("No caption cues could be generated.");
    }

    const { data: existing } = await supabase
      .from("captions")
      .select("id")
      .eq("source_file_id", sourceFileId)
      .maybeSingle();

    let captionId = existing?.id;

    if (captionId) {
      await supabase.from("caption_cues").delete().eq("caption_id", captionId);
      const { error: updateError } = await supabase
        .from("captions")
        .update({
          language: transcript?.language ?? "en",
          transcript_id: transcript?.id ?? null,
          status: "ready",
          error_message: null,
        })
        .eq("id", captionId);
      if (updateError) throw new Error("Unable to update captions.");
    } else {
      const { data: created, error: createError } = await supabase
        .from("captions")
        .insert({
          user_id: userId,
          project_id: projectId,
          source_file_id: sourceFileId,
          transcript_id: transcript?.id ?? null,
          language: transcript?.language ?? "en",
          status: "ready",
        })
        .select("id")
        .single();

      if (createError || !created) {
        throw new Error("Unable to create captions.");
      }
      captionId = created.id;
    }

    await bumpProcessingJobProgressIfActive(supabase, jobId, 70);

    const rows = cues.map((cue) => ({
      caption_id: captionId!,
      user_id: userId,
      start_time: cue.startTime,
      end_time: cue.endTime,
      text: cue.text,
    }));

    const { error: cuesError } = await supabase.from("caption_cues").insert(rows);
    if (cuesError) throw new Error("Unable to save caption cues.");

    const completed = await completeProcessingJobIfActive(supabase, jobId);
    if (!completed) {
      return { ok: false, error: "This job was cancelled." };
    }

    revalidateCaptionPaths(projectId, sourceFileId);

    return {
      ok: true,
      jobId,
      captionId,
      message: `Generated ${cues.length} caption cues${
        transcript ? " from the transcript" : " from a mock fallback"
      }.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Caption generation failed.";

    await failProcessingJobIfActive(supabase, jobId, message);
    revalidateCaptionPaths(projectId, sourceFileId);
    return { ok: false, error: message };
  }
}

export async function generateCaptionsAction(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<CaptionActionResult> {
  const queued = await enqueueCaptionGenerate(sourceFileId, options);
  if (!queued.ok) return queued;

  if (isAsyncMockVideoJobsEnabled()) {
    after(() => {
      void executeCaptionGenerate(queued.work);
    });
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      message:
        "Caption generation queued. Watch progress on the jobs list; open captions when ready.",
    };
  }

  return executeCaptionGenerate(queued.work);
}

export async function updateCaptionCueAction(input: {
  cueId: string;
  projectId: string;
  sourceFileId: string;
  text: string;
  startTime: number;
  endTime: number;
}): Promise<CaptionActionResult> {
  const { supabase } = await requireUser();
  const text = input.text.trim();
  const startTime = Number(input.startTime);
  const endTime = Number(input.endTime);

  if (!text) return { ok: false, error: "Caption text cannot be empty." };
  if (!Number.isFinite(startTime) || startTime < 0) {
    return { ok: false, error: "Start time must be zero or greater." };
  }
  if (!Number.isFinite(endTime) || endTime <= startTime) {
    return { ok: false, error: "End time must be after start time." };
  }

  const { data, error } = await supabase
    .from("caption_cues")
    .update({
      text,
      start_time: Number(startTime.toFixed(3)),
      end_time: Number(endTime.toFixed(3)),
    })
    .eq("id", input.cueId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Unable to save caption cue." };
  }

  revalidateCaptionPaths(input.projectId, input.sourceFileId);
  return { ok: true, message: "Caption cue saved." };
}

export async function downloadCaptionsAction(input: {
  sourceFileId: string;
  format: "vtt" | "srt";
}): Promise<CaptionActionResult> {
  const { supabase } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, input.sourceFileId);
  if (error) return { ok: false, error };
  if (!file) return { ok: false, error: "File not found or inaccessible." };

  const { data: caption, error: captionError } = await supabase
    .from("captions")
    .select("id, language")
    .eq("source_file_id", file.id)
    .maybeSingle();

  if (captionError || !caption) {
    return { ok: false, error: "Generate captions before downloading." };
  }

  const { data: cues, error: cuesError } = await supabase
    .from("caption_cues")
    .select("start_time, end_time, text")
    .eq("caption_id", caption.id)
    .order("start_time", { ascending: true });

  if (cuesError || !cues?.length) {
    return { ok: false, error: "No caption cues available to export." };
  }

  const mapped = cues.map((cue) => ({
    startTime: Number(cue.start_time),
    endTime: Number(cue.end_time),
    text: cue.text,
  }));

  const base = file.original_filename.replace(/\.[^.]+$/, "") || "captions";
  if (input.format === "srt") {
    return {
      ok: true,
      message: "SRT ready.",
      content: buildSrt(mapped),
      filename: `${base}.${caption.language || "en"}.srt`,
      mimeType: "application/x-subrip",
    };
  }

  return {
    ok: true,
    message: "WebVTT ready.",
    content: buildWebVtt(mapped),
    filename: `${base}.${caption.language || "en"}.vtt`,
    mimeType: "text/vtt",
  };
}
