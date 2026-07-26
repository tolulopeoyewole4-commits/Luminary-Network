import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ProcessingJob } from "@/types/database";

type Client = SupabaseClient<Database>;

export const ACTIVE_JOB_STATUSES = ["queued", "processing"] as const;

/** Returns true when the job is still allowed to run. */
export async function isProcessingJobActive(
  supabase: Client,
  jobId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("processing_jobs")
    .select("status")
    .eq("id", jobId)
    .maybeSingle();

  return data?.status === "queued" || data?.status === "processing";
}

/** Marks a job processing only if it has not been cancelled. */
export async function markProcessingJobRunningIfActive(
  supabase: Client,
  jobId: string,
  progressPercentage = 10,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("processing_jobs")
    .update({
      status: "processing",
      progress_percentage: progressPercentage,
      started_at: new Date().toISOString(),
      error_message: null,
      completed_at: null,
    })
    .eq("id", jobId)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to mark job processing", error.message);
    return false;
  }
  return Boolean(data);
}

export async function bumpProcessingJobProgressIfActive(
  supabase: Client,
  jobId: string,
  progressPercentage: number,
): Promise<void> {
  await supabase
    .from("processing_jobs")
    .update({ progress_percentage: progressPercentage })
    .eq("id", jobId)
    .in("status", [...ACTIVE_JOB_STATUSES]);
}

/**
 * Completes a job only if it was not cancelled while work was in flight.
 * Returns false when the completion write was skipped (cancelled/missing).
 */
export async function completeProcessingJobIfActive(
  supabase: Client,
  jobId: string,
  patch: {
    progress_percentage?: number;
    error_message?: string | null;
    payload?: Record<string, unknown> | null;
  } = {},
): Promise<boolean> {
  const { data, error } = await supabase
    .from("processing_jobs")
    .update({
      status: "completed",
      progress_percentage: patch.progress_percentage ?? 100,
      completed_at: new Date().toISOString(),
      error_message: patch.error_message ?? null,
      ...(patch.payload !== undefined ? { payload: patch.payload } : {}),
    })
    .eq("id", jobId)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to complete processing job", error.message);
    return false;
  }

  return Boolean(data);
}

export async function failProcessingJobIfActive(
  supabase: Client,
  jobId: string,
  message: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("processing_jobs")
    .update({
      status: "failed",
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
      error_message: message.slice(0, 500),
    })
    .eq("id", jobId)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to fail processing job", error.message);
    return false;
  }

  return Boolean(data);
}

export function isCancellableJob(job: Pick<ProcessingJob, "status">): boolean {
  return job.status === "queued" || job.status === "processing";
}

export function isRetryableJob(job: Pick<ProcessingJob, "status">): boolean {
  return job.status === "failed" || job.status === "cancelled";
}
