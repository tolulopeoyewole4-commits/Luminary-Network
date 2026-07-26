import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ClipCandidatesReview } from "@/components/clips/ClipCandidatesReview";
import { DetectClipsButton } from "@/components/clips/DetectClipsButton";
import { ExportClipButton } from "@/components/clips/ExportClipButton";
import { ExportedClipsList } from "@/components/clips/ExportedClipsList";
import { Alert } from "@/components/ui/Alert";
import { listExportedClipsForSourceFile } from "@/lib/clips/export-queries";
import { listClipCandidatesForSourceFile } from "@/lib/clips/queries";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptForSourceFile } from "@/lib/transcripts/queries";
import {
  SIGNED_URL_EXPIRY_SECONDS,
  SOURCE_FILE_TYPE_LABELS,
  SOURCE_STORAGE_BUCKET,
  VIDEO_FILE_TYPES,
} from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";

type ClipsPageProps = {
  params: Promise<{ id: string; fileId: string }>;
};

export async function generateMetadata({
  params,
}: ClipsPageProps): Promise<Metadata> {
  const { fileId } = await params;
  const supabase = await createClient();
  const { file } = await getOwnSourceFile(supabase, fileId);
  return {
    title: file ? `Clips · ${file.original_filename}` : "Clip candidates",
  };
}

export default async function ClipsPage({ params }: ClipsPageProps) {
  const { id: projectId, fileId } = await params;
  const supabase = await createClient();
  const { file, error } = await getOwnSourceFile(supabase, fileId);

  if (error) return <Alert tone="error">{error}</Alert>;
  if (!file || file.project_id !== projectId) notFound();

  const isVideo = (VIDEO_FILE_TYPES as readonly string[]).includes(
    file.file_type,
  );
  if (!isVideo) {
    return (
      <Alert tone="info">
        Clip candidates are available for MP4/MOV sources.{" "}
        <Link href={`/projects/${projectId}/files/${fileId}`} className="underline">
          Back to file
        </Link>
      </Alert>
    );
  }

  const [
    { clips, error: clipsError },
    { transcript },
    { exports, error: exportsError },
  ] = await Promise.all([
    listClipCandidatesForSourceFile(supabase, file.id),
    getTranscriptForSourceFile(supabase, file.id),
    listExportedClipsForSourceFile(supabase, file.id),
  ]);

  let signedVideoUrl: string | null = null;
  if (file.processing_status !== "uploading") {
    const { data, error: signError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .createSignedUrl(file.internal_storage_path, SIGNED_URL_EXPIRY_SECONDS);

    if (!signError && data?.signedUrl) {
      signedVideoUrl = data.signedUrl;
    }
  }

  const approvedCount = clips.filter((clip) => clip.status === "approved").length;
  const exportedCount = exports.filter((item) => item.status === "ready").length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Clip review and export
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {file.original_filename}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {SOURCE_FILE_TYPE_LABELS[file.file_type]} · Mock detection + FFmpeg export
            {transcript ? " · grounded in transcript segments" : " · duration-based fallback"}
            {approvedCount ? ` · ${approvedCount} approved` : ""}
            {exportedCount ? ` · ${exportedCount} exported` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/projects/${projectId}/files/${fileId}`}
            className="btn-secondary"
          >
            Back to file
          </Link>
          <Link
            href={`/projects/${projectId}/files/${fileId}/transcript`}
            className="btn-secondary"
          >
            Transcript
          </Link>
          <DetectClipsButton
            sourceFileId={file.id}
            projectId={projectId}
            redirectToReview={false}
            label={
              clips.length > 0
                ? "Re-detect mock clips"
                : "Detect mock clip candidates"
            }
          />
          {approvedCount > 0 ? (
            <ExportClipButton
              mode="approved"
              sourceFileId={file.id}
              label={`Export ${approvedCount} approved`}
            />
          ) : null}
        </div>
      </section>

      {!transcript ? (
        <Alert tone="info">
          No transcript yet. Detection still works from duration, but results are
          stronger after you generate a mock transcript.
        </Alert>
      ) : null}

      {clipsError ? <Alert tone="error">{clipsError}</Alert> : null}
      {exportsError ? <Alert tone="error">{exportsError}</Alert> : null}

      <ExportedClipsList exports={exports} />

      <ClipCandidatesReview
        clips={clips}
        projectId={projectId}
        sourceFileId={file.id}
        signedVideoUrl={signedVideoUrl}
        durationSeconds={file.video_duration_seconds}
        approvedCount={approvedCount}
      />
    </div>
  );
}
