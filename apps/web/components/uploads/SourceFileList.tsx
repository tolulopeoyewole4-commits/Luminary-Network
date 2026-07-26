"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  createSourceFileSignedUrlAction,
  deleteSourceFileAction,
} from "@/lib/uploads/actions";
import {
  SOURCE_FILE_TYPE_LABELS,
  type SourceFileType,
  type SourceProcessingStatus,
} from "@/lib/uploads/constants";
import { formatBytes } from "@/lib/uploads/limits";
import type { SourceFile } from "@/types/database";

const STATUS_STYLES: Record<SourceProcessingStatus, string> = {
  uploading: "bg-amber-50 text-amber-800",
  uploaded: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  processing: "bg-sky-50 text-sky-800",
  ready: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  failed: "bg-red-50 text-red-800",
};

type SourceFileListProps = {
  files: SourceFile[];
};

export function SourceFileList({ files }: SourceFileListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  if (files.length === 0) {
    return (
      <EmptyState
        title="No source files yet"
        description="Upload a private PDF, Word document, text file, or video to this project."
      />
    );
  }

  function downloadFile(fileId: string) {
    setError(null);
    setActiveId(fileId);
    startTransition(async () => {
      const result = await createSourceFileSignedUrlAction(fileId);
      setActiveId(null);
      if (!result.ok || !result.signedUrl) {
        setError(result.ok ? "Missing signed URL." : result.error);
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    });
  }

  function removeFile(fileId: string, filename: string) {
    const confirmed = window.confirm(
      `Delete "${filename}" permanently from private storage?`,
    );
    if (!confirmed) return;

    setError(null);
    setActiveId(fileId);
    startTransition(async () => {
      const result = await deleteSourceFileAction(fileId);
      setActiveId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ul className="space-y-3">
        {files.map((file) => {
          const busy = pending && activeId === file.id;
          return (
            <li key={file.id} className="surface-card px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {file.original_filename}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {SOURCE_FILE_TYPE_LABELS[file.file_type as SourceFileType]} ·{" "}
                    {formatBytes(file.file_size)}
                  </p>
                  {file.error_message ? (
                    <p className="mt-2 text-sm text-red-700">{file.error_message}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[file.processing_status]}`}
                  >
                    {file.processing_status}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={busy || file.processing_status === "uploading"}
                    onClick={() => downloadFile(file.id)}
                  >
                    {busy ? "Working…" : "Secure download"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy}
                    onClick={() => removeFile(file.id, file.original_filename)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
