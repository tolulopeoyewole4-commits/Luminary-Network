"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { detectClipCandidatesAction } from "@/lib/clips/actions";

type DetectClipsButtonProps = {
  sourceFileId: string;
  projectId: string;
  label?: string;
  redirectToReview?: boolean;
};

export function DetectClipsButton({
  sourceFileId,
  projectId,
  label = "Detect clip candidates",
  redirectToReview = true,
}: DetectClipsButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await detectClipCandidatesAction(sourceFileId);
            if (!result.ok) {
              setError(result.error);
              router.refresh();
              return;
            }
            if (redirectToReview) {
              router.push(`/projects/${projectId}/files/${sourceFileId}/clips`);
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Detecting…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
