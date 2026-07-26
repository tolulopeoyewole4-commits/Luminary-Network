"use client";

import { useState, useTransition } from "react";

import { downloadGeneratedContentAction } from "@/lib/content/export-actions";

type DownloadContentButtonProps = {
  contentId: string;
  format: "md" | "txt";
  label?: string;
};

export function DownloadContentButton({
  contentId,
  format,
  label,
}: DownloadContentButtonProps) {
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
            const result = await downloadGeneratedContentAction({
              contentId,
              format,
            });
            if (!result.ok || !result.content || !result.filename) {
              setError(result.ok ? "Missing export file." : result.error);
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
          : label || (format === "txt" ? "Download text" : "Download Markdown")}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
