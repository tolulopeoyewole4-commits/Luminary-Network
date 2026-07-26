import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, GeneratedContent } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listProjectGeneratedContent(
  supabase: Client,
  projectId: string,
): Promise<{ items: GeneratedContent[]; error: string | null }> {
  const { data, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to list generated content", error.message);
    return { items: [], error: "Unable to load generated content." };
  }

  return { items: data ?? [], error: null };
}

export async function getOwnGeneratedContent(
  supabase: Client,
  contentId: string,
): Promise<{ item: GeneratedContent | null; error: string | null }> {
  const { data, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", contentId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load generated content", error.message);
    return { item: null, error: "Unable to load this content item." };
  }

  return { item: data, error: null };
}
