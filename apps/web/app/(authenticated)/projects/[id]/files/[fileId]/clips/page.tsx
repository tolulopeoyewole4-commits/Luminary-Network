import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { DetectClipsButton } from "@/components/clips/DetectClipsButton";
import { ClipCandidatesReview } from "@/components/clips/ClipCandidatesReview";
import { Alert } from "@/components/ui/Alert";
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

  const [{ clips, error: clipsError }, { transcript }] = await Promise.all([
    listClipCandidatesForSourceFile(supabase, file.id),
    getTranscriptForSourceFile(supabase, file.id),
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

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Clip candidate review
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {file.original_filename}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {SOURCE_FILE_TYPE_LABELS[file.file_type]} · Mock detection for MVP
            {transcript ? " · grounded in transcript segments" : " · duration-based fallback"}
            {approvedCount ? ` · ${approvedCount} approved` : ""}
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
        </div>
      </section>

      {!transcript ? (
        <Alert tone="info">
          No transcript yet. Detection still works from duration, but results are
          stronger after you generate a mock transcript.
        </Alert>
      ) : null}

      {clipsError ? <Alert tone="error">{clipsError}</Alert> : null}

      <ClipCandidatesReview
        clips={clips}
        projectId={projectId}
        sourceFileId={file.id}
        signedVideoUrl={signedVideoUrl}
        durationSeconds={file.video_duration_seconds}
      />
    </div>
  );
}
