"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isDocumentProcessableType } from "@/lib/documents/constants";
import {
  bumpProcessingJobProgressIfActive,
  completeProcessingJobIfActive,
  failProcessingJobIfActive,
  isProcessingJobActive,
  markProcessingJobRunningIfActive,
} from "@/lib/jobs/cancellation";
import {
  isAsyncDocumentExtractEnabled,
  isDedicatedJobWorkerEnabled,
} from "@/lib/jobs/flags";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_STORAGE_BUCKET } from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";

export type ProcessDocumentResult =
  | {
      ok: true;
      sectionCount?: number;
      warnings?: string[];
      message: string;
      jobId?: string;
      queued?: boolean;
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

type EnqueuedDocumentExtract = {
  sourceFileId: string;
  projectId: string;
  jobId: string;
  userId: string;
  storagePath: string;
  originalFilename: string;
  fileType: string;
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

function revalidateDocumentPaths(projectId: string, sourceFileId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/files/${sourceFileId}`);
}

async function enqueueDocumentExtract(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<
  | { ok: true; work: EnqueuedDocumentExtract }
  | { ok: false; error: string }
> {
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

  let jobId = options?.existingJobId;

  if (jobId) {
    const { data: existing } = await supabase
      .from("processing_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (!existing || existing.user_id !== user.id) {
      return { ok: false, error: "Processing job not found or inaccessible." };
    }

    await supabase
      .from("processing_jobs")
      .update({
        status: "queued",
        progress_percentage: 0,
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq("id", jobId);
  } else {
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        user_id: user.id,
        project_id: file.project_id,
        source_file_id: file.id,
        job_type: "document_extract",
        status: "queued",
        progress_percentage: 0,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create processing job", jobError?.message);
      return { ok: false, error: "Unable to start document processing." };
    }
    jobId = job.id;
  }

  await supabase
    .from("source_files")
    .update({
      processing_status: "processing",
      error_message: null,
    })
    .eq("id", file.id);

  revalidateDocumentPaths(file.project_id, file.id);

  return {
    ok: true,
    work: {
      sourceFileId: file.id,
      projectId: file.project_id,
      jobId,
      userId: user.id,
      storagePath: file.internal_storage_path,
      originalFilename: file.original_filename,
      fileType: file.file_type,
    },
  };
}

async function executeDocumentExtract(
  work: EnqueuedDocumentExtract,
): Promise<ProcessDocumentResult> {
  const supabase = await createClient();
  const {
    sourceFileId,
    projectId,
    jobId,
    userId,
    storagePath,
    originalFilename,
    fileType,
  } = work;

  const started = await markProcessingJobRunningIfActive(supabase, jobId, 10);
  if (!started) {
    return { ok: false, error: "This job was cancelled." };
  }

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .download(storagePath);

    if (downloadError || !blob) {
      throw new Error(
        downloadError?.message || "Unable to download the private source file.",
      );
    }

    await bumpProcessingJobProgressIfActive(supabase, jobId, 40);

    const form = new FormData();
    form.append("file", blob, originalFilename);
    form.append("file_type", fileType);
    form.append("original_filename", originalFilename);

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

    await bumpProcessingJobProgressIfActive(supabase, jobId, 75);

    if (!(await isProcessingJobActive(supabase, jobId))) {
      return { ok: false, error: "This job was cancelled." };
    }

    const { error: deleteError } = await supabase
      .from("document_sections")
      .delete()
      .eq("source_file_id", sourceFileId);

    if (deleteError) {
      throw new Error("Unable to replace previous extracted sections.");
    }

    if (payload.sections.length > 0) {
      const rows = payload.sections.map((section) => ({
        source_file_id: sourceFileId,
        user_id: userId,
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

    const completed = await completeProcessingJobIfActive(supabase, jobId);
    if (!completed) {
      return { ok: false, error: "This job was cancelled." };
    }

    await supabase
      .from("source_files")
      .update({
        processing_status: "ready",
        page_count: payload.page_count,
        error_message: null,
      })
      .eq("id", sourceFileId);

    revalidateDocumentPaths(projectId, sourceFileId);

    return {
      ok: true,
      jobId,
      sectionCount: payload.section_count,
      warnings: payload.warnings ?? [],
      message: `Extracted ${payload.section_count} section${payload.section_count === 1 ? "" : "s"}.`,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Document processing failed.";

    const failed = await failProcessingJobIfActive(supabase, jobId, message);
    if (failed) {
      await supabase
        .from("source_files")
        .update({
          processing_status: "failed",
          error_message: message.slice(0, 500),
        })
        .eq("id", sourceFileId);
    }

    revalidateDocumentPaths(projectId, sourceFileId);

    return { ok: false, error: message };
  }
}

export async function processDocumentAction(
  sourceFileId: string,
  options?: { existingJobId?: string },
): Promise<ProcessDocumentResult> {
  const queued = await enqueueDocumentExtract(sourceFileId, options);
  if (!queued.ok) return queued;

  if (isDedicatedJobWorkerEnabled()) {
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      message:
        "Document extraction queued for the dedicated worker. Watch progress on the jobs list; open the extract when the file shows ready.",
    };
  }

  if (isAsyncDocumentExtractEnabled()) {
    after(() => {
      void executeDocumentExtract(queued.work);
    });
    return {
      ok: true,
      queued: true,
      jobId: queued.work.jobId,
      message:
        "Document extraction queued. Watch progress on the jobs list; open the extract when the file shows ready.",
    };
  }

  return executeDocumentExtract(queued.work);
}
