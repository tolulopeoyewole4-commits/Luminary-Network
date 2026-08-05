"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type UpdateProfileResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function updateDisplayNameAction(
  formData: FormData,
): Promise<UpdateProfileResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("display_name") ?? "").trim();
  if (!displayName) {
    return { ok: false, error: "Display name is required for brand identity." };
  }
  if (displayName.length > 48) {
    return { ok: false, error: "Display name must be 48 characters or fewer." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update display name", error.message);
    return { ok: false, error: "Unable to update display name." };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Display name updated." };
}
