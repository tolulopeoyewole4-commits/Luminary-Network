"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import {
  archiveProjectAction,
  deleteProjectAction,
  restoreProjectAction,
} from "@/lib/projects/actions";
import type { ProjectStatus } from "@/types/database";

type ProjectDangerZoneProps = {
  projectId: string;
  status: ProjectStatus;
};

export function ProjectDangerZone({
  projectId,
  status,
}: ProjectDangerZoneProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function run(
    action: () => Promise<{ ok: boolean; message?: string }>,
    options?: { refresh?: boolean },
  ) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "Something went wrong.");
        return;
      }
      if (result.message) {
        setMessage(result.message);
      }
      if (options?.refresh !== false) {
        router.refresh();
      }
    });
  }

  return (
    <section className="surface-card space-y-4 border-red-100 px-6 py-6">
      <div>
        <h2 className="font-display text-xl font-semibold">Project actions</h2>
        <p className="mt-1 text-sm text-muted">
          Archive hides a project from your active list. Delete removes it
          permanently.
        </p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <div className="flex flex-wrap gap-3">
        {status === "active" ? (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => run(() => archiveProjectAction(projectId))}
          >
            {pending ? "Working…" : "Archive project"}
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => run(() => restoreProjectAction(projectId))}
          >
            {pending ? "Working…" : "Restore project"}
          </button>
        )}

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={pending}
          onClick={() => {
            const confirmed = window.confirm(
              "Delete this project permanently? This cannot be undone.",
            );
            if (!confirmed) return;
            run(() => deleteProjectAction(projectId), { refresh: false });
          }}
        >
          Delete permanently
        </button>
      </div>
    </section>
  );
}
