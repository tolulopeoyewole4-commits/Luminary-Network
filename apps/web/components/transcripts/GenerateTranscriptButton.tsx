"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { generateMockTranscriptAction } from "@/lib/transcripts/actions";

type GenerateTranscriptButtonProps = {
  sourceFileId: string;
  projectId: string;
  label?: string;
  redirectToViewer?: boolean;
};

export function GenerateTranscriptButton({
  sourceFileId,
  projectId,
  label = "Generate mock transcript",
  redirectToViewer = true,
}: GenerateTranscriptButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          setMessage(null);
          startTransition(async () => {
            const result = await generateMockTranscriptAction(sourceFileId);
            if (!result.ok) {
              setError(result.error);
              router.refresh();
              return;
            }
            setMessage(result.message);
            if (redirectToViewer && !result.queued) {
              router.push(
                `/projects/${projectId}/files/${sourceFileId}/transcript`,
              );
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Queuing…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="text-sm text-[var(--accent-strong)]">{message}</p>
      ) : null}
    </div>
  );
}
