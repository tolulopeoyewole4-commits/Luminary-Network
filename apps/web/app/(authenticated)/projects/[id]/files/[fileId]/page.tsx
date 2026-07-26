import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DocumentSectionViewer } from "@/components/documents/DocumentSectionViewer";
import { ProcessDocumentButton } from "@/components/documents/ProcessDocumentButton";
import { ProcessVideoButton } from "@/components/jobs/ProcessVideoButton";
import { DetectClipsButton } from "@/components/clips/DetectClipsButton";
import { GenerateTranscriptButton } from "@/components/transcripts/GenerateTranscriptButton";
import { Alert } from "@/components/ui/Alert";
import { listClipCandidatesForSourceFile } from "@/lib/clips/queries";
import { isDocumentProcessableType } from "@/lib/documents/constants";
import {
  getLatestDocumentJob,
  listDocumentSections,
} from "@/lib/documents/queries";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptForSourceFile } from "@/lib/transcripts/queries";
import {
  SOURCE_FILE_TYPE_LABELS,
  VIDEO_FILE_TYPES,
} from "@/lib/uploads/constants";
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
    title: file ? file.original_filename : "Source file",
  };
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
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

  const [
    { sections, error: sectionsError },
    latestJob,
    transcriptResult,
    clipsResult,
  ] = await Promise.all([
    listDocumentSections(supabase, file.id),
    getLatestDocumentJob(supabase, file.id),
    getTranscriptForSourceFile(supabase, file.id),
    listClipCandidatesForSourceFile(supabase, file.id),
  ]);

  const canProcessDoc = isDocumentProcessableType(file.file_type);
  const canProcessVideo = (VIDEO_FILE_TYPES as readonly string[]).includes(
    file.file_type,
  );
  const duration = formatDuration(file.video_duration_seconds);
  const meta = file.media_metadata ?? {};
  const hasTranscript = Boolean(transcriptResult.transcript);
  const clipCount = clipsResult.clips.length;
  const approvedClips = clipsResult.clips.filter(
    (clip) => clip.status === "approved",
  ).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            {canProcessVideo ? "Video source" : "Document viewer"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {file.original_filename}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {SOURCE_FILE_TYPE_LABELS[file.file_type]} · {formatBytes(file.file_size)}
            {file.page_count ? ` · ${file.page_count} pages` : ""}
            {duration ? ` · ${duration}` : ""}
            {meta.width && meta.height ? ` · ${meta.width}×${meta.height}` : ""}
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
            {meta.video_codec ? (
              <span className="rounded-lg bg-white/80 px-2.5 py-1 font-semibold text-muted ring-1 ring-[var(--border)]">
                {meta.video_codec}
                {meta.audio_codec ? ` / ${meta.audio_codec}` : ""}
              </span>
            ) : null}
            {hasTranscript ? (
              <span className="rounded-lg bg-white/80 px-2.5 py-1 font-semibold text-muted ring-1 ring-[var(--border)]">
                Transcript ready
              </span>
            ) : null}
            {clipCount > 0 ? (
              <span className="rounded-lg bg-white/80 px-2.5 py-1 font-semibold text-muted ring-1 ring-[var(--border)]">
                {clipCount} clip candidates
                {approvedClips ? ` · ${approvedClips} approved` : ""}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/projects/${projectId}`} className="btn-secondary">
            Back to project
          </Link>
          {canProcessDoc ? (
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
          {canProcessVideo ? (
            <ProcessVideoButton
              sourceFileId={file.id}
              label={
                file.processing_status === "ready" ||
                file.processing_status === "failed"
                  ? "Reprocess video"
                  : "Process video"
              }
            />
          ) : null}
          {canProcessVideo && file.processing_status !== "uploading" ? (
            <>
              <Link
                href={`/projects/${projectId}/files/${file.id}/transcript`}
                className="btn-secondary"
              >
                {hasTranscript ? "Open transcript" : "Transcript"}
              </Link>
              <GenerateTranscriptButton
                sourceFileId={file.id}
                projectId={projectId}
                label={
                  hasTranscript
                    ? "Regenerate mock transcript"
                    : "Generate mock transcript"
                }
              />
              <Link
                href={`/projects/${projectId}/files/${file.id}/clips`}
                className="btn-secondary"
              >
                {clipCount > 0 ? "Review clips" : "Clips"}
              </Link>
              <DetectClipsButton
                sourceFileId={file.id}
                projectId={projectId}
                label={
                  clipCount > 0 ? "Re-detect clips" : "Detect clip candidates"
                }
              />
            </>
          ) : null}
        </div>
      </section>

      {file.error_message ? (
        <Alert tone="error">{file.error_message}</Alert>
      ) : null}

      {canProcessVideo ? (
        <Alert tone="info">
          Generate a mock transcript, then detect clip candidates to approve
          short-form windows. FFmpeg export lands in the next milestone.
        </Alert>
      ) : null}

      {file.processing_status === "uploaded" && canProcessDoc ? (
        <Alert tone="info">
          This document is uploaded but not processed yet. Extract text to review
          sections and page references.
        </Alert>
      ) : null}

      {sectionsError ? <Alert tone="error">{sectionsError}</Alert> : null}

      {canProcessDoc ? <DocumentSectionViewer sections={sections} /> : null}
    </div>
  );
}
