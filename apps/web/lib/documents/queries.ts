import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, DocumentSection, ProcessingJob } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listDocumentSections(
  supabase: Client,
  sourceFileId: string,
): Promise<{ sections: DocumentSection[]; error: string | null }> {
  const { data, error } = await supabase
    .from("document_sections")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .order("section_number", { ascending: true });

  if (error) {
    console.error("Failed to list document sections", error.message);
    return { sections: [], error: "Unable to load document sections." };
  }

  return { sections: data ?? [], error: null };
}

export async function getLatestDocumentJob(
  supabase: Client,
  sourceFileId: string,
): Promise<ProcessingJob | null> {
  const { data, error } = await supabase
    .from("processing_jobs")
    .select("*")
    .eq("source_file_id", sourceFileId)
    .eq("job_type", "document_extract")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to load processing job", error.message);
    return null;
  }

  return data;
}
