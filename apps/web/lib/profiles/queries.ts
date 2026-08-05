import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Profile } from "@/types/database";

export async function getOwnProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error.message);
    return null;
  }

  return data;
}
