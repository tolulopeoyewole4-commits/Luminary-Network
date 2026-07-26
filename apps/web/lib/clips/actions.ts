"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildMockClipCandidates } from "@/lib/clips/mock";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptForSourceFile } from "@/lib/transcripts/queries";
import { VIDEO_FILE_TYPES } from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";
import type { ClipCandidateStatus, SourceFileType } from "@/types/database";

export type ClipActionResult =
  | { ok: true; message: string; jobId?: string; count?: number }
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

function revalidateClipPaths(projectId: string, sourceFileId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}/clips`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}/transcript`);
}

export async function detectClipCandidatesAction(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<ClipActionResult> {
  const { supabase, user } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, sourceFileId);

  if (error) return { ok: false, error };
  if (!file) return { ok: false, error: "File not found or inaccessible." };
  if (!isVideoType(file.file_type)) {
    return { ok: false, error: "Clip detection is available for video files only." };
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
        job_type: "clip_detect",
        status: "processing",
        progress_percentage: 10,
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create clip detect job", jobError?.message);
      return { ok: false, error: "Unable to start clip detection." };
    }
    jobId = job.id;
  }

  try {
    const { transcript } = await getTranscriptForSourceFile(supabase, file.id);
    const duration = file.video_duration_seconds ?? 60;

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 40 })
      .eq("id", jobId);

    const mocks = buildMockClipCandidates({
      durationSeconds: Number(duration),
      title: file.original_filename,
      segments: transcript?.segments.map((segment) => ({
        startTime: Number(segment.start_time),
        endTime: Number(segment.end_time),
        text: segment.text,
        speaker: segment.speaker,
      })),
    });

    // Replace prior suggestions for this source (keep approved/exported).
    await supabase
      .from("clip_candidates")
      .delete()
      .eq("source_file_id", file.id)
      .in("status", ["suggested", "rejected"]);

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 70 })
      .eq("id", jobId);

    const rows = mocks.map((clip) => ({
      user_id: user.id,
      project_id: file.project_id,
      source_file_id: file.id,
      transcript_id: transcript?.id ?? null,
      title: clip.title,
      reason: clip.reason,
      start_time: clip.startTime,
      end_time: clip.endTime,
      score: clip.score,
      status: "suggested" as const,
      rank: clip.rank,
    }));

    const { error: insertError } = await supabase
      .from("clip_candidates")
      .insert(rows);

    if (insertError) {
      throw new Error("Unable to save clip candidates.");
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

    revalidateClipPaths(file.project_id, file.id);

    return {
      ok: true,
      jobId,
      count: mocks.length,
      message: `Suggested ${mocks.length} mock clip candidates for review.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Clip detection failed.";

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

export async function updateClipCandidateAction(input: {
  clipId: string;
  projectId: string;
  sourceFileId: string;
  title: string;
  reason: string;
  startTime: number;
  endTime: number;
}): Promise<ClipActionResult> {
  const { supabase } = await requireUser();
  const title = input.title.trim();
  const reason = input.reason.trim();
  const startTime = Number(input.startTime);
  const endTime = Number(input.endTime);

  if (!title) return { ok: false, error: "Clip title cannot be empty." };
  if (!Number.isFinite(startTime) || startTime < 0) {
    return { ok: false, error: "Start time must be zero or greater." };
  }
  if (!Number.isFinite(endTime) || endTime <= startTime) {
    return { ok: false, error: "End time must be after start time." };
  }
  if (endTime - startTime > 180) {
    return { ok: false, error: "Clip duration cannot exceed 3 minutes." };
  }

  const { data, error } = await supabase
    .from("clip_candidates")
    .update({
      title,
      reason,
      start_time: Number(startTime.toFixed(3)),
      end_time: Number(endTime.toFixed(3)),
    })
    .eq("id", input.clipId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Unable to save clip changes." };
  }

  revalidateClipPaths(input.projectId, input.sourceFileId);
  return { ok: true, message: "Clip candidate saved." };
}

export async function setClipCandidateStatusAction(input: {
  clipId: string;
  projectId: string;
  sourceFileId: string;
  status: Extract<ClipCandidateStatus, "suggested" | "approved" | "rejected">;
}): Promise<ClipActionResult> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("clip_candidates")
    .update({ status: input.status })
    .eq("id", input.clipId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Unable to update clip status." };
  }

  revalidateClipPaths(input.projectId, input.sourceFileId);
  return {
    ok: true,
    message:
      input.status === "approved"
        ? "Clip approved for export."
        : input.status === "rejected"
          ? "Clip rejected."
          : "Clip marked as suggested.",
  };
}
