import type { SupabaseClient } from "@supabase/supabase-js";

import type { ClipCandidate, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listClipCandidatesForSourceFile(
  supabase: Client,
  sourceFileId: string,
): Promise<{ clips: ClipCandidate[]; error: string | null }> {
  const { data, error } = await supabase
    .from("clip_candidates")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .order("rank", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Failed to load clip candidates", error.message);
    return { clips: [], error: "Unable to load clip candidates." };
  }

  return { clips: data ?? [], error: null };
}
