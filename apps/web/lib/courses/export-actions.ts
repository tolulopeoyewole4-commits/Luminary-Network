"use server";

import { redirect } from "next/navigation";

import {
  buildCourseMarkdown,
  courseExportFilename,
} from "@/lib/courses/export";
import { getCourseWithStructure } from "@/lib/courses/queries";
import { createClient } from "@/lib/supabase/server";

export type DownloadCourseResult =
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

export async function downloadCourseMarkdownAction(
  courseId: string,
): Promise<DownloadCourseResult> {
  const { supabase } = await requireUser();
  const { course, error } = await getCourseWithStructure(supabase, courseId);

  if (error) return { ok: false, error };
  if (!course) return { ok: false, error: "Course not found or inaccessible." };

  const content = buildCourseMarkdown(course);
  return {
    ok: true,
    message: "Markdown ready.",
    content,
    filename: courseExportFilename(course.title),
    mimeType: "text/markdown;charset=utf-8",
  };
}
