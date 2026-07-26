"use client";

import { useState, useTransition } from "react";

import { downloadCaptionsAction } from "@/lib/captions/actions";

type DownloadCaptionsButtonProps = {
  sourceFileId: string;
  format: "vtt" | "srt";
  label?: string;
};

export function DownloadCaptionsButton({
  sourceFileId,
  format,
  label,
}: DownloadCaptionsButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await downloadCaptionsAction({
              sourceFileId,
              format,
            });
            if (!result.ok || !result.content || !result.filename) {
              setError(result.ok ? "Missing caption file." : result.error);
              return;
            }
            const blob = new Blob([result.content], {
              type: result.mimeType || "text/plain",
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = result.filename;
            anchor.click();
            URL.revokeObjectURL(url);
          });
        }}
      >
        {pending
          ? "Preparing…"
          : label || (format === "srt" ? "Download SRT" : "Download WebVTT")}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
