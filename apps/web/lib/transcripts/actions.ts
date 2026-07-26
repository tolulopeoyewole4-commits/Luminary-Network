"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  bumpProcessingJobProgressIfActive,
  completeProcessingJobIfActive,
  failProcessingJobIfActive,
  isProcessingJobActive,
  markProcessingJobRunningIfActive,
} from "@/lib/jobs/cancellation";
import {
  isAsyncMockVideoJobsEnabled,
  isDedicatedJobWorkerEnabled,
} from "@/lib/jobs/flags";
import { createClient } from "@/lib/supabase/server";
import { buildMockTranscriptSegments } from "@/lib/transcripts/mock";
import { VIDEO_FILE_TYPES } from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";
import type { SourceFileType } from "@/types/database";

export type TranscriptActionResult =
  | {
      ok: true;
      message: string;
      transcriptId?: string;
      jobId?: string;
      queued?: boolean;
    }
  | { ok: false; error: string };

type EnqueuedTranscript = {
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

function revalidateTranscriptPaths(projectId: string, sourceFileId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}/transcript`);
}

async function enqueueMockTranscript(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<
  | { ok: true; work: EnqueuedTranscript }
  | { ok: false; error: string }
> {
  const { supabase, user } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, sourceFileId);

  if (error) return { ok: false, error };
  if (!file) return { ok: false, error: "File not found or inaccessible." };
  if (!isVideoType(file.file_type)) {
    return { ok: false, error: "Transcripts are available for video files only." };
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
        job_type: "video_transcribe",
        status: "queued",
        progress_percentage: 0,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create transcript job", jobError?.message);
      return { ok: false, error: "Unable to start transcript generation." };
    }
    jobId = job.id;
  }

  revalidateTranscriptPaths(file.project_id, file.id);

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

async function executeMockTranscript(
  work: EnqueuedTranscript,
): Promise<TranscriptActionResult> {
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
    const mockSegments = buildMockTranscriptSegments({
      durationSeconds,
      title,
    });
    const fullText = mockSegments.map((segment) => segment.text).join(" ");

    await bumpProcessingJobProgressIfActive(supabase, jobId, 40);
    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, error: "This job was cancelled." };
    }

    const { data: existing } = await supabase
      .from("transcripts")
      .select("id")
      .eq("source_file_id", sourceFileId)
      .maybeSingle();

    let transcriptId = existing?.id;

    if (transcriptId) {
      await supabase
        .from("transcript_segments")
        .delete()
        .eq("transcript_id", transcriptId);

      const { error: updateError } = await supabase
        .from("transcripts")
        .update({
          language: "en",
          full_text: fullText,
          status: "ready",
          error_message: null,
        })
        .eq("id", transcriptId);

      if (updateError) {
        throw new Error("Unable to update transcript.");
      }
    } else {
      const { data: created, error: createError } = await supabase
        .from("transcripts")
        .insert({
          user_id: userId,
          project_id: projectId,
          source_file_id: sourceFileId,
          language: "en",
          full_text: fullText,
          status: "ready",
        })
        .select("id")
        .single();

      if (createError || !created) {
        throw new Error("Unable to create transcript.");
      }
      transcriptId = created.id;
    }

    await bumpProcessingJobProgressIfActive(supabase, jobId, 70);

    const rows = mockSegments.map((segment) => ({
      transcript_id: transcriptId!,
      user_id: userId,
      start_time: segment.startTime,
      end_time: segment.endTime,
      speaker: segment.speaker,
      text: segment.text,
      confidence: segment.confidence,
    }));

    const { error: segmentsError } = await supabase
      .from("transcript_segments")
      .insert(rows);

    if (segmentsError) {
      throw new Error("Unable to save transcript segments.");
    }

    const completed = await completeProcessingJobIfActive(supabase, jobId);
    if (!completed) {
      return { ok: false, error: "This job was cancelled." };
    }

    revalidateTranscriptPaths(projectId, sourceFileId);

    return {
      ok: true,
      transcriptId,
      jobId,
      message: `Generated ${mockSegments.length} mock transcript segments.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcript generation failed.";

    await failProcessingJobIfActive(supabase, jobId, message);
    revalidateTranscriptPaths(projectId, sourceFileId);
    return { ok: false, error: message };
  }
}

export async function generateMockTranscriptAction(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<TranscriptActionResult> {
  const queued = await enqueueMockTranscript(sourceFileId, options);
  if (!queued.ok) return queued;

  if (isDedicatedJobWorkerEnabled()) {
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      message:
        "Transcript generation queued for the dedicated worker. Watch progress on the jobs list; open the transcript when ready.",
    };
  }

  if (isAsyncMockVideoJobsEnabled()) {
    after(() => {
      void executeMockTranscript(queued.work);
    });
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      message:
        "Transcript generation queued. Watch progress on the jobs list; open the transcript when ready.",
    };
  }

  return executeMockTranscript(queued.work);
}

export async function updateTranscriptSegmentAction(input: {
  segmentId: string;
  text: string;
  speaker: string;
  projectId: string;
  sourceFileId: string;
}): Promise<TranscriptActionResult> {
  const { supabase } = await requireUser();
  const text = input.text.trim();
  const speaker = input.speaker.trim() || "Speaker 1";

  if (!text) {
    return { ok: false, error: "Segment text cannot be empty." };
  }

  const { data: segment, error } = await supabase
    .from("transcript_segments")
    .update({
      text,
      speaker,
    })
    .eq("id", input.segmentId)
    .select("id, transcript_id")
    .maybeSingle();

  if (error || !segment) {
    return { ok: false, error: "Unable to save segment changes." };
  }

  const { data: segments } = await supabase
    .from("transcript_segments")
    .select("text")
    .eq("transcript_id", segment.transcript_id)
    .order("start_time", { ascending: true });

  const fullText = (segments ?? []).map((row) => row.text).join(" ");
  await supabase
    .from("transcripts")
    .update({ full_text: fullText })
    .eq("id", segment.transcript_id);

  revalidatePath(
    `/projects/${input.projectId}/files/${input.sourceFileId}/transcript`,
  );

  return { ok: true, message: "Segment saved." };
}

export async function updateTranscriptLanguageAction(input: {
  transcriptId: string;
  language: string;
  projectId: string;
  sourceFileId: string;
}): Promise<TranscriptActionResult> {
  const { supabase } = await requireUser();
  const language = input.language.trim() || "en";

  const { data, error } = await supabase
    .from("transcripts")
    .update({ language })
    .eq("id", input.transcriptId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Unable to update transcript language." };
  }

  revalidatePath(
    `/projects/${input.projectId}/files/${input.sourceFileId}/transcript`,
  );
  return { ok: true, message: "Language updated." };
}
