"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  exportApprovedClipsAction,
  exportClipCandidateAction,
} from "@/lib/clips/export-actions";

type ExportClipButtonProps =
  | {
      mode: "one";
      clipCandidateId: string;
      label?: string;
      className?: string;
    }
  | {
      mode: "approved";
      sourceFileId: string;
      label?: string;
      className?: string;
    };

export function ExportClipButton(props: ExportClipButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const label =
    props.label ??
    (props.mode === "approved" ? "Export approved clips" : "Export with FFmpeg");

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={props.className ?? "btn-primary"}
        disabled={pending}
        onClick={() => {
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result =
              props.mode === "one"
                ? await exportClipCandidateAction(props.clipCandidateId)
                : await exportApprovedClipsAction(props.sourceFileId);
            if (!result.ok) {
              setError(result.error);
              router.refresh();
              return;
            }
            setMessage(result.message);
            if (result.signedUrl && !result.queued && props.mode === "one") {
              window.open(result.signedUrl, "_blank", "noopener,noreferrer");
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Queuing…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--accent-strong)]">{message}</p> : null}
    </div>
  );
}
