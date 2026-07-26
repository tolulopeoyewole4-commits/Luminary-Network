import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { CaptionEditor } from "@/components/captions/CaptionEditor";
import { DownloadCaptionsButton } from "@/components/captions/DownloadCaptionsButton";
import { GenerateCaptionsButton } from "@/components/captions/GenerateCaptionsButton";
import { Alert } from "@/components/ui/Alert";
import { getCaptionsForSourceFile } from "@/lib/captions/queries";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptForSourceFile } from "@/lib/transcripts/queries";
import {
  SIGNED_URL_EXPIRY_SECONDS,
  SOURCE_FILE_TYPE_LABELS,
  SOURCE_STORAGE_BUCKET,
  VIDEO_FILE_TYPES,
} from "@/lib/uploads/constants";
import { getOwnSourceFile } from "@/lib/uploads/queries";

type CaptionsPageProps = {
  params: Promise<{ id: string; fileId: string }>;
};

export async function generateMetadata({
  params,
}: CaptionsPageProps): Promise<Metadata> {
  const { fileId } = await params;
  const supabase = await createClient();
  const { file } = await getOwnSourceFile(supabase, fileId);
  return {
    title: file ? `Captions · ${file.original_filename}` : "Captions",
  };
}

export default async function CaptionsPage({ params }: CaptionsPageProps) {
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
        Captions are available for MP4/MOV sources.{" "}
        <Link href={`/projects/${projectId}/files/${fileId}`} className="underline">
          Back to file
        </Link>
      </Alert>
    );
  }

  const [{ caption, error: captionError }, { transcript }] = await Promise.all([
    getCaptionsForSourceFile(supabase, file.id),
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

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-accent">
            Caption editor
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            {file.original_filename}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {SOURCE_FILE_TYPE_LABELS[file.file_type]} · Timed cues for WebVTT/SRT
            {transcript ? " · grounded in transcript" : " · mock fallback available"}
            {caption ? ` · ${caption.cues.length} cues` : ""}
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
          <GenerateCaptionsButton
            sourceFileId={file.id}
            projectId={projectId}
            redirectToEditor={false}
            label={caption ? "Regenerate captions" : "Generate captions"}
          />
          {caption ? (
            <>
              <DownloadCaptionsButton sourceFileId={file.id} format="vtt" />
              <DownloadCaptionsButton sourceFileId={file.id} format="srt" />
            </>
          ) : null}
        </div>
      </section>

      {!transcript ? (
        <Alert tone="info">
          No transcript yet. Caption generation can still build cues from a mock
          fallback; regenerate after you create a transcript for better results.
        </Alert>
      ) : null}

      {captionError ? <Alert tone="error">{captionError}</Alert> : null}

      {!caption ? (
        <Alert tone="info">
          No captions yet. Generate timed cues, edit them, then download WebVTT or
          SRT.
        </Alert>
      ) : (
        <CaptionEditor
          caption={caption}
          projectId={projectId}
          sourceFileId={file.id}
          signedVideoUrl={signedVideoUrl}
          durationSeconds={file.video_duration_seconds}
        />
      )}
    </div>
  );
}
