import type { SupabaseClient } from "@supabase/supabase-js";

import type { Caption, CaptionCue, Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type CaptionWithCues = Caption & {
  cues: CaptionCue[];
};

export async function getCaptionsForSourceFile(
  supabase: Client,
  sourceFileId: string,
): Promise<{ caption: CaptionWithCues | null; error: string | null }> {
  const { data: caption, error } = await supabase
    .from("captions")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load captions", error.message);
    return { caption: null, error: "Unable to load captions." };
  }

  if (!caption) {
    return { caption: null, error: null };
  }

  const { data: cues, error: cuesError } = await supabase
    .from("caption_cues")
    .select("*")
    .eq("caption_id", caption.id)
    .order("start_time", { ascending: true });

  if (cuesError) {
    console.error("Failed to load caption cues", cuesError.message);
    return { caption: null, error: "Unable to load caption cues." };
  }

  return {
    caption: {
      ...caption,
      cues: cues ?? [],
    },
    error: null,
  };
}
