import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, GeneratedVideo } from "@/types/database";

type Client = SupabaseClient<Database>;

export async function listProjectGeneratedVideos(
  supabase: Client,
  projectId: string,
): Promise<{ videos: GeneratedVideo[]; error: string | null }> {
  const { data, error } = await supabase
    .from("generated_videos")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to list generated videos", error.message);
    return { videos: [], error: "Unable to load generated videos right now." };
  }

  return { videos: data ?? [], error: null };
}

export async function getOwnGeneratedVideo(
  supabase: Client,
  generatedVideoId: string,
): Promise<{ video: GeneratedVideo | null; error: string | null }> {
  const { data, error } = await supabase
    .from("generated_videos")
    .select("*")
    .eq("id", generatedVideoId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load generated video", error.message);
    return { video: null, error: "Unable to load this generated video." };
  }

  return { video: data, error: null };
}
