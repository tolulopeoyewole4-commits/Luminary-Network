"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { processVideoAction } from "@/lib/jobs/actions";
import {
  completeSourceUploadAction,
  failSourceUploadAction,
  prepareSourceUploadAction,
} from "@/lib/uploads/actions";
import {
  DEFAULT_MAX_DOCUMENT_UPLOAD_MB,
  DEFAULT_MAX_VIDEO_UPLOAD_MB,
  VIDEO_FILE_TYPES,
} from "@/lib/uploads/constants";
import { formatBytes } from "@/lib/uploads/limits";
import { uploadSourceFileWithProgress } from "@/lib/uploads/upload-client";
import { validateSourceUpload } from "@/lib/uploads/validation";

type SourceUploadFormProps = {
  projectId: string;
  disabled?: boolean;
};

type UploadPhase =
  | "idle"
  | "validating"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "done"
  | "error";

export function SourceUploadForm({
  projectId,
  disabled = false,
}: SourceUploadFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const accept = useMemo(
    () => ".pdf,.docx,.txt,.mp4,.mov,application/pdf,text/plain,video/mp4,video/quicktime",
    [],
  );

  const busy =
    phase === "validating" ||
    phase === "preparing" ||
    phase === "uploading" ||
    phase === "finalizing";

  async function onUpload() {
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setPhase("validating");
    const validation = validateSourceUpload({
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    if (!validation.ok) {
      setPhase("error");
      setError(validation.error);
      return;
    }

    setPhase("preparing");
    const prepared = await prepareSourceUploadAction({
      projectId,
      originalFilename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    if (!prepared.ok) {
      setPhase("error");
      setError(prepared.error);
      return;
    }

    setPhase("uploading");
    setProgress(0);

    try {
      await uploadSourceFileWithProgress({
        storagePath: prepared.storagePath,
        file,
        mimeType: prepared.mimeType,
        onProgress: setProgress,
      });
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed unexpectedly.";
      await failSourceUploadAction(prepared.sourceFileId, message);
      setPhase("error");
      setError(message);
      router.refresh();
      return;
    }

    setPhase("finalizing");
    const finalized = await completeSourceUploadAction(prepared.sourceFileId);
    if (!finalized.ok) {
      setPhase("error");
      setError(finalized.error);
      router.refresh();
      return;
    }

    setPhase("done");
    setProgress(100);
    setFile(null);

    const isVideo = (VIDEO_FILE_TYPES as readonly string[]).includes(
      validation.fileType,
    );

    if (isVideo) {
      setSuccess(
        `Uploaded ${validation.safeOriginalFilename}. Video metadata processing has been queued.`,
      );
      router.refresh();
      // Do not block the upload UI on long metadata work.
      void processVideoAction(prepared.sourceFileId).finally(() => {
        router.refresh();
      });
      return;
    }

    setSuccess(`Uploaded ${validation.safeOriginalFilename} securely.`);
    router.refresh();
  }

  return (
    <div className="surface-card space-y-4 px-6 py-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Upload source</h2>
        <p className="mt-1 text-sm text-muted">
          Private storage only. Supported: PDF, DOCX, TXT (up to{" "}
          {DEFAULT_MAX_DOCUMENT_UPLOAD_MB} MB) and MP4/MOV (up to{" "}
          {DEFAULT_MAX_VIDEO_UPLOAD_MB} MB). Downloads use short-lived signed
          URLs.
        </p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <div>
        <label htmlFor="source-file" className="field-label">
          Source file
        </label>
        <input
          id="source-file"
          type="file"
          accept={accept}
          className="field-input file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent-soft)] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-[var(--accent-strong)]"
          disabled={disabled || busy}
          onChange={(event) => {
            setError(null);
            setSuccess(null);
            setPhase("idle");
            setProgress(0);
            setFile(event.target.files?.[0] ?? null);
          }}
        />
        {file ? (
          <p className="mt-2 text-sm text-muted">
            Selected: {file.name} ({formatBytes(file.size)})
          </p>
        ) : null}
      </div>

      {busy || phase === "done" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              {phase === "preparing" && "Preparing secure upload…"}
              {phase === "uploading" && "Uploading to private storage…"}
              {phase === "finalizing" && "Verifying upload…"}
              {phase === "done" && "Upload complete"}
              {phase === "validating" && "Validating file…"}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="btn-primary"
        disabled={disabled || busy || !file}
        onClick={onUpload}
      >
        {busy ? "Uploading…" : "Upload privately"}
      </button>
    </div>
  );
}
