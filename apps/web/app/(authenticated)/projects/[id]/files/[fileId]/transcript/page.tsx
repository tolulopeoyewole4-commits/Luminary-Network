import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { GenerateCaptionsButton } from "@/components/captions/GenerateCaptionsButton";
import { DetectClipsButton } from "@/components/clips/DetectClipsButton";
import { GenerateTranscriptButton } from "@/components/transcripts/GenerateTranscriptButton";
import { TranscriptViewer } from "@/components/transcripts/TranscriptViewer";
import { Alert } from "@/components/ui/Alert";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptForSourceFile } from "@/lib/transcripts/queries";
import {
  SOURCE_FILE_TYPE_LABELS,
  SOURCE_STORAGE_BUCKET,
  VIDEO_FILE_TYPES,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";

type TranscriptPageProps = {
  params: Promise<{ id: string; fileId: string }>;
};

export async function generateMetadata({
  params,
}: TranscriptPageProps): Promise<Metadata> {
  const { fileId } = await params;
  const supabase = await createClient();
  const { file } = await getOwnSourceFile(supabase, fileId);
  return {
    title: file ? `Transcript · ${file.original_filename}` : "Transcript",
  };
}

export default async function TranscriptPage({ params }: TranscriptPageProps) {
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
        Transcripts are available for MP4/MOV sources.{" "}
        <Link href={`/projects/${projectId}/files/${fileId}`} className="underline">
          Back to file
        </Link>
      </Alert>
    );
  }

  const { transcript, error: transcriptError } = await getTranscriptForSourceFile(
    supabase,
    file.id,
  );

  let signedVideoUrl: string | null = null;
  if (file.processing_status !== "uploading") {
    const { data, error: signError } = await supabase.storage
      .from(SOURCE_STORAGE_BUCKET)
      .createSignedUrl(file.internal_storage_path, SIGNED_URL_EXPIRY_SECONDS);

    if (!signError && data?.signedUrl) {
      signedVideoUrl = data.signedUrl;
    }
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Transcript editor
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {file.original_filename}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {SOURCE_FILE_TYPE_LABELS[file.file_type]} · Mock transcription for MVP
            (no external speech API configured)
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
            href={`/projects/${projectId}/files/${fileId}/clips`}
            className="btn-secondary"
          >
            Review clips
          </Link>
          <Link
            href={`/projects/${projectId}/files/${fileId}/captions`}
            className="btn-secondary"
          >
            Captions
          </Link>
          <GenerateTranscriptButton
            sourceFileId={file.id}
            projectId={projectId}
            redirectToViewer={false}
            label={
              transcript ? "Regenerate mock transcript" : "Generate mock transcript"
            }
          />
          {transcript ? (
            <>
              <DetectClipsButton
                sourceFileId={file.id}
                projectId={projectId}
                label="Detect clip candidates"
              />
              <GenerateCaptionsButton
                sourceFileId={file.id}
                projectId={projectId}
                label="Generate captions"
              />
            </>
          ) : null}
        </div>
      </section>

      {transcriptError ? <Alert tone="error">{transcriptError}</Alert> : null}

      {!transcript ? (
        <Alert tone="info">
          No transcript yet. Generate a mocked, timestamped transcript to review,
          edit, search, and jump by time.
        </Alert>
      ) : (
        <TranscriptViewer
          transcript={transcript}
          projectId={projectId}
          sourceFileId={file.id}
          signedVideoUrl={signedVideoUrl}
          durationSeconds={file.video_duration_seconds}
        />
      )}
    </div>
  );
}
