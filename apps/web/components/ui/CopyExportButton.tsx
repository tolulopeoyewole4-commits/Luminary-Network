"use client";

import { useState, useTransition } from "react";

import { copyTextToClipboard } from "@/lib/clipboard";

type CopyExportButtonProps = {
  label: string;
  busyLabel?: string;
  successLabel?: string;
  loadContent: () => Promise<
    | { ok: true; content: string }
    | { ok: false; error: string }
  >;
};

export function CopyExportButton({
  label,
  busyLabel = "Copying…",
  successLabel = "Copied",
  loadContent,
}: CopyExportButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setCopied(false);
          startTransition(async () => {
            const result = await loadContent();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            try {
              await copyTextToClipboard(result.content);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Unable to copy to the clipboard.",
              );
            }
          });
        }}
      >
        {pending ? busyLabel : copied ? successLabel : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
