"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { processVideoAction } from "@/lib/jobs/actions";

type ProcessVideoButtonProps = {
  sourceFileId: string;
  label?: string;
};

export function ProcessVideoButton({
  sourceFileId,
  label = "Process video",
}: ProcessVideoButtonProps) {
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
            const result = await processVideoAction(sourceFileId);
            if (!result.ok) {
              setError(result.error);
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Processing…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
