"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isDocumentProcessableType } from "@/lib/documents/constants";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_STORAGE_BUCKET } from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";

export type ProcessDocumentResult =
  | {
      ok: true;
      sectionCount: number;
      warnings: string[];
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

type ExtractApiResponse = {
  file_type: string;
  page_count: number | null;
  section_count: number;
  warnings?: string[];
  sections: Array<{
    section_title: string;
    section_number: number;
    page_start: number | null;
    page_end: number | null;
    extracted_text: string;
    token_count: number;
  }>;
  detail?: string;
};

function getApiBaseUrl(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000"
  ).replace(/\/$/, "");
}

function getInternalApiToken(): string {
  return process.env.INTERNAL_API_TOKEN ?? "dev-internal-token";
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function processDocumentAction(
  sourceFileId: string,
): Promise<ProcessDocumentResult> {
  const { supabase, user } = await requireUser();
  const { file, error } = await getOwnSourceFile(supabase, sourceFileId);

  if (error) return { ok: false, error };
  if (!file) {
    return { ok: false, error: "File not found or inaccessible." };
  }

  if (!isDocumentProcessableType(file.file_type)) {
    return {
      ok: false,
      error: "Only PDF, DOCX, and TXT files can be processed in this milestone.",
    };
  }

  if (file.processing_status === "uploading") {
    return { ok: false, error: "Finish uploading this file before processing." };
  }

  const { data: job, error: jobError } = await supabase
    .from("processing_jobs")
    .insert({
      user_id: user.id,
      project_id: file.project_id,
      source_file_id: file.id,
      job_type: "document_extract",
      status: "processing",
      progress_percentage: 10,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    console.error("Failed to create processing job", jobError?.message);
    return { ok: false, error: "Unable to start document processing." };
  }

  await supabase
    .from("source_files")
    .update({
      processing_status: "processing",
      error_message: null,
    })
    .eq("id", file.id);

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .download(file.internal_storage_path);

    if (downloadError || !blob) {
      throw new Error(
        downloadError?.message || "Unable to download the private source file.",
      );
    }

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 40 })
      .eq("id", job.id);

    const form = new FormData();
    form.append("file", blob, file.original_filename);
    form.append("file_type", file.file_type);
    form.append("original_filename", file.original_filename);

    const response = await fetch(`${getApiBaseUrl()}/api/v1/documents/extract`, {
      method: "POST",
      headers: {
        "X-Internal-Token": getInternalApiToken(),
      },
      body: form,
    });

    const payload = (await response.json()) as ExtractApiResponse;

    if (!response.ok) {
      throw new Error(
        typeof payload.detail === "string"
          ? payload.detail
          : "Document extraction failed.",
      );
    }

    await supabase
      .from("processing_jobs")
      .update({ progress_percentage: 75 })
      .eq("id", job.id);

    const { error: deleteError } = await supabase
      .from("document_sections")
      .delete()
      .eq("source_file_id", file.id);

    if (deleteError) {
      throw new Error("Unable to replace previous extracted sections.");
    }

    if (payload.sections.length > 0) {
      const rows = payload.sections.map((section) => ({
        source_file_id: file.id,
        user_id: user.id,
        section_title: section.section_title,
        section_number: section.section_number,
        page_start: section.page_start,
        page_end: section.page_end,
        extracted_text: section.extracted_text,
        token_count: section.token_count,
      }));

      const { error: insertError } = await supabase
        .from("document_sections")
        .insert(rows);

      if (insertError) {
        throw new Error("Unable to save extracted document sections.");
      }
    }

    await supabase
      .from("source_files")
      .update({
        processing_status: "ready",
        page_count: payload.page_count,
        error_message: null,
      })
      .eq("id", file.id);

    await supabase
      .from("processing_jobs")
      .update({
        status: "completed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", job.id);

    revalidatePath(`/projects/${file.project_id}`);
    revalidatePath(`/projects/${file.project_id}/files/${file.id}`);

    return {
      ok: true,
      sectionCount: payload.section_count,
      warnings: payload.warnings ?? [],
      message: `Extracted ${payload.section_count} section${payload.section_count === 1 ? "" : "s"}.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Document processing failed.";

    await supabase
      .from("source_files")
      .update({
        processing_status: "failed",
        error_message: message.slice(0, 500),
      })
      .eq("id", file.id);

    await supabase
      .from("processing_jobs")
      .update({
        status: "failed",
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        error_message: message.slice(0, 500),
      })
      .eq("id", job.id);

    revalidatePath(`/projects/${file.project_id}`);
    revalidatePath(`/projects/${file.project_id}/files/${file.id}`);

    return { ok: false, error: message };
  }
}
