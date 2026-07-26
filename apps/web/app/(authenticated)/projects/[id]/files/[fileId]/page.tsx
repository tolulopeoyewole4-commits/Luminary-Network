import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DocumentSectionViewer } from "@/components/documents/DocumentSectionViewer";
import { ProcessDocumentButton } from "@/components/documents/ProcessDocumentButton";
import { Alert } from "@/components/ui/Alert";
import { isDocumentProcessableType } from "@/lib/documents/constants";
import {
  getLatestDocumentJob,
  listDocumentSections,
} from "@/lib/documents/queries";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_FILE_TYPE_LABELS } from "@/lib/uploads/constants";
import { formatBytes } from "@/lib/uploads/limits";
import { getOwnSourceFile } from "@/lib/uploads/queries";

type DocumentViewerPageProps = {
  params: Promise<{ id: string; fileId: string }>;
};

export async function generateMetadata({
  params,
}: DocumentViewerPageProps): Promise<Metadata> {
  const { fileId } = await params;
  const supabase = await createClient();
  const { file } = await getOwnSourceFile(supabase, fileId);
  return {
    title: file ? file.original_filename : "Document",
  };
}

export default async function DocumentViewerPage({
  params,
}: DocumentViewerPageProps) {
  const { id: projectId, fileId } = await params;
  const supabase = await createClient();
  const { file, error } = await getOwnSourceFile(supabase, fileId);

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  if (!file || file.project_id !== projectId) {
    notFound();
  }

  const [{ sections, error: sectionsError }, latestJob] = await Promise.all([
    listDocumentSections(supabase, file.id),
    getLatestDocumentJob(supabase, file.id),
  ]);

  const canProcess = isDocumentProcessableType(file.file_type);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Document viewer
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {file.original_filename}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {SOURCE_FILE_TYPE_LABELS[file.file_type]} · {formatBytes(file.file_size)}
            {file.page_count ? ` · ${file.page_count} pages` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg bg-white/80 px-2.5 py-1 font-semibold capitalize text-muted ring-1 ring-[var(--border)]">
              {file.processing_status}
            </span>
            {latestJob ? (
              <span className="rounded-lg bg-white/80 px-2.5 py-1 font-semibold text-muted ring-1 ring-[var(--border)]">
                Last job: {latestJob.status}
                {latestJob.status === "processing"
                  ? ` (${latestJob.progress_percentage}%)`
                  : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/projects/${projectId}`} className="btn-secondary">
            Back to project
          </Link>
          {canProcess ? (
            <ProcessDocumentButton
              sourceFileId={file.id}
              projectId={projectId}
              redirectToViewer={false}
              label={
                file.processing_status === "ready"
                  ? "Re-extract text"
                  : "Extract text"
              }
            />
          ) : null}
        </div>
      </section>

      {file.error_message ? (
        <Alert tone="error">{file.error_message}</Alert>
      ) : null}

      {!canProcess ? (
        <Alert tone="info">
          Video files are stored privately here. Transcript extraction arrives in
          a later milestone.
        </Alert>
      ) : null}

      {file.processing_status === "uploaded" && canProcess ? (
        <Alert tone="info">
          This document is uploaded but not processed yet. Extract text to review
          sections and page references.
        </Alert>
      ) : null}

      {sectionsError ? <Alert tone="error">{sectionsError}</Alert> : null}

      <DocumentSectionViewer sections={sections} />
    </div>
  );
}
