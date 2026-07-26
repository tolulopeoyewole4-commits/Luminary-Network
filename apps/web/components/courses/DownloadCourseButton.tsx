"use client";

import { useState, useTransition } from "react";

import { downloadCourseMarkdownAction } from "@/lib/courses/export-actions";

type DownloadCourseButtonProps = {
  courseId: string;
  label?: string;
};

export function DownloadCourseButton({
  courseId,
  label = "Download Markdown",
}: DownloadCourseButtonProps) {
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
            const result = await downloadCourseMarkdownAction(courseId);
            if (!result.ok || !result.content || !result.filename) {
              setError(result.ok ? "Missing export file." : result.error);
              return;
            }
            const blob = new Blob([result.content], {
              type: result.mimeType || "text/markdown",
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
        {pending ? "Preparing…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
