import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ProcessingJob } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listProjectProcessingJobs(
  supabase: Client,
  projectId: string,
  options: { limit?: number } = {},
): Promise<{ jobs: ProcessingJob[]; error: string | null }> {
  let query = supabase
    .from("processing_jobs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to list processing jobs", error.message);
    return { jobs: [], error: "Unable to load processing jobs." };
  }

  return { jobs: data ?? [], error: null };
}

export async function listRecentProcessingJobs(
  supabase: Client,
  options: { limit?: number } = {},
): Promise<{ jobs: ProcessingJob[]; error: string | null }> {
  let query = supabase
    .from("processing_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to list recent jobs", error.message);
    return { jobs: [], error: "Unable to load processing jobs." };
  }

  return { jobs: data ?? [], error: null };
}

export async function countActiveProcessingJobs(
  supabase: Client,
): Promise<number> {
  const { count } = await supabase
    .from("processing_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "processing"]);

  return count ?? 0;
}

export async function getOwnProcessingJob(
  supabase: Client,
  jobId: string,
): Promise<ProcessingJob | null> {
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load processing job", error.message);
    return null;
  }

  return data;
}

export async function listRecentGenerationJobs(
  supabase: Client,
  projectId: string,
  jobType: "course_generate" | "social_generate",
  options: { limit?: number } = {},
): Promise<ProcessingJob[]> {
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("project_id", projectId)
    .eq("job_type", jobType)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 5);

  if (error) {
    console.error("Failed to list generation jobs", error.message);
    return [];
  }

  return data ?? [];
}
