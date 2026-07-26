"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { buildMockTranscriptSegments } from "@/lib/transcripts/mock";
import { VIDEO_FILE_TYPES } from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";
import type { SourceFileType } from "@/types/database";

export type TranscriptActionResult =
  | { ok: true; message: string; transcriptId?: string; jobId?: string }
  | { ok: false; error: string };

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

export async function generateMockTranscriptAction(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<TranscriptActionResult> {
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
        project_id: file.project_id,
        source_file_id: file.id,
        job_type: "video_transcribe",
        status: "processing",
        progress_percentage: 10,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create transcript job", jobError?.message);
      return { ok: false, error: "Unable to start transcript generation." };
    }
    jobId = job.id;
  }

  try {
    const duration = file.video_duration_seconds ?? 60;
    const mockSegments = buildMockTranscriptSegments({
      durationSeconds: Number(duration),
      title: file.original_filename,
    });
    const fullText = mockSegments.map((segment) => segment.text).join(" ");

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 40 })
      .eq("id", jobId);

    const { data: existing } = await supabase
      .from("transcripts")
      .select("id")
      .eq("source_file_id", file.id)
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
          user_id: user.id,
          project_id: file.project_id,
          source_file_id: file.id,
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

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 70 })
      .eq("id", jobId);

    const rows = mockSegments.map((segment) => ({
      transcript_id: transcriptId!,
      user_id: user.id,
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

    await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", jobId);

    revalidatePath(`/projects/${file.project_id}`);
    revalidatePath(`/projects/${file.project_id}/files/${file.id}`);
    revalidatePath(`/projects/${file.project_id}/files/${file.id}/transcript`);

    return {
      ok: true,
      transcriptId,
      jobId,
      message: `Generated ${mockSegments.length} mock transcript segments.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcript generation failed.";

    await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
      })
      .eq("id", jobId);

    return { ok: false, error: message };
  }
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
