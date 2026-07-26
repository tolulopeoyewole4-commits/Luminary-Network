import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  Database,
  Transcript,
  TranscriptSegment,
} from "@/types/database";

type Client = SupabaseClient<Database>;

export type TranscriptWithSegments = Transcript & {
  segments: TranscriptSegment[];
};

export async function getTranscriptForSourceFile(
  supabase: Client,
  sourceFileId: string,
): Promise<{ transcript: TranscriptWithSegments | null; error: string | null }> {
  const { data: transcript, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load transcript", error.message);
    return { transcript: null, error: "Unable to load transcript." };
  }

  if (!transcript) {
    return { transcript: null, error: null };
  }

  const { data: segments, error: segmentsError } = await supabase
    .from("transcript_segments")
    .select("*")
    .eq("transcript_id", transcript.id)
    .order("start_time", { ascending: true });

  if (segmentsError) {
    console.error("Failed to load transcript segments", segmentsError.message);
    return { transcript: null, error: "Unable to load transcript segments." };
  }

  return {
    transcript: {
      ...transcript,
      segments: segments ?? [],
    },
    error: null,
  };
}
