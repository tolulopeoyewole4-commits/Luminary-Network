"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { processDocumentAction } from "@/lib/documents/actions";

type ProcessDocumentButtonProps = {
  sourceFileId: string;
  projectId: string;
  label?: string;
  redirectToViewer?: boolean;
};

export function ProcessDocumentButton({
  sourceFileId,
  projectId,
  label = "Extract text",
  redirectToViewer = true,
}: ProcessDocumentButtonProps) {
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
            const result = await processDocumentAction(sourceFileId);
            if (!result.ok) {
              setError(result.error);
              router.refresh();
              return;
            }
            if (redirectToViewer) {
              router.push(`/projects/${projectId}/files/${sourceFileId}`);
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Extracting…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
