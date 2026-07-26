"use server";

import { redirect } from "next/navigation";

import {
  buildContentMarkdown,
  buildContentPlainText,
  contentExportFilename,
} from "@/lib/content/export";
import { createClient } from "@/lib/supabase/server";

export type DownloadContentResult =
  | {
      ok: true;
      message: string;
      content: string;
      filename: string;
      mimeType: string;
    }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function downloadGeneratedContentAction(input: {
  contentId: string;
  format: "md" | "txt";
}): Promise<DownloadContentResult> {
  const { supabase } = await requireUser();
  const { data: item, error } = await supabase
    .from("generated_content")
    .select("*")
    .eq("id", input.contentId)
    .maybeSingle();

  if (error || !item) {
    return { ok: false, error: "Content not found or inaccessible." };
  }

  const content =
    input.format === "txt"
      ? buildContentPlainText(item)
      : buildContentMarkdown(item);

  return {
    ok: true,
    message: input.format === "txt" ? "Text ready." : "Markdown ready.",
    content,
    filename: contentExportFilename(item.title, input.format),
    mimeType:
      input.format === "txt"
        ? "text/plain;charset=utf-8"
        : "text/markdown;charset=utf-8",
  };
}
