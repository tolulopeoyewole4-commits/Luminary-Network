"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { generateCaptionsAction } from "@/lib/captions/actions";

type GenerateCaptionsButtonProps = {
  sourceFileId: string;
  projectId: string;
  label?: string;
  redirectToEditor?: boolean;
};

export function GenerateCaptionsButton({
  sourceFileId,
  projectId,
  label = "Generate captions",
  redirectToEditor = true,
}: GenerateCaptionsButtonProps) {
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
            const result = await generateCaptionsAction(sourceFileId);
            if (!result.ok) {
              setError(result.error);
              router.refresh();
              return;
            }
            if (redirectToEditor) {
              router.push(
                `/projects/${projectId}/files/${sourceFileId}/captions`,
              );
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Generating…" : label}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
