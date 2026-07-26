import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Project } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listOwnProjects(
  supabase: Client,
  options: { includeArchived?: boolean; limit?: number } = {},
): Promise<{ projects: Project[]; error: string | null }> {
  let query = supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!options.includeArchived) {
    query = query.eq("status", "active");
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to list projects", error.message);
    return { projects: [], error: "Unable to load projects right now." };
  }

  return { projects: data ?? [], error: null };
}

export async function getOwnProject(
  supabase: Client,
  projectId: string,
): Promise<{ project: Project | null; error: string | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load project", error.message);
    return { project: null, error: "Unable to load this project." };
  }

  return { project: data, error: null };
}

export async function countOwnProjects(
  supabase: Client,
): Promise<{ activeCount: number; archivedCount: number }> {
  const [active, archived] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "archived"),
  ]);

  return {
    activeCount: active.count ?? 0,
    archivedCount: archived.count ?? 0,
  };
}
