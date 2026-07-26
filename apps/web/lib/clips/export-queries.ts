import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, ExportedClip } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listExportedClipsForSourceFile(
  supabase: Client,
  sourceFileId: string,
): Promise<{ exports: ExportedClip[]; error: string | null }> {
  const { data, error } = await supabase
    .from("exported_clips")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load exported clips", error.message);
    return { exports: [], error: "Unable to load exported clips." };
  }

  return { exports: data ?? [], error: null };
}

export async function getExportedClipForCandidate(
  supabase: Client,
  clipCandidateId: string,
): Promise<{ exportClip: ExportedClip | null; error: string | null }> {
  const { data, error } = await supabase
    .from("exported_clips")
    .select("*")
    .eq("clip_candidate_id", clipCandidateId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load exported clip", error.message);
    return { exportClip: null, error: "Unable to load exported clip." };
  }

  return { exportClip: data, error: null };
}
