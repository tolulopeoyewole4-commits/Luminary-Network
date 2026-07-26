import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, SourceFile } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listProjectSourceFiles(
  supabase: Client,
  projectId: string,
): Promise<{ files: SourceFile[]; error: string | null }> {
  const { data, error } = await supabase
    .from("source_files")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list source files", error.message);
    return { files: [], error: "Unable to load source files." };
  }

  return { files: data ?? [], error: null };
}

export async function getOwnSourceFile(
  supabase: Client,
  sourceFileId: string,
): Promise<{ file: SourceFile | null; error: string | null }> {
  const { data, error } = await supabase
    .from("source_files")
    .select("*")
    .eq("id", sourceFileId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load source file", error.message);
    return { file: null, error: "Unable to load this file." };
  }

  return { file: data, error: null };
}

export async function countProjectSourceFiles(
  supabase: Client,
  projectId: string,
): Promise<number> {
  const { count } = await supabase
    .from("source_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  return count ?? 0;
}
