"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  cancelProcessingJobAction,
  retryProcessingJobAction,
} from "@/lib/jobs/actions";
import { isCancellableJob, isRetryableJob } from "@/lib/jobs/cancellation";
import { getJobResultLink } from "@/lib/jobs/result-links";
import type { ProcessingJob } from "@/types/database";

const STATUS_STYLES: Record<ProcessingJob["status"], string> = {
  queued: "bg-amber-50 text-amber-800",
  processing: "bg-sky-50 text-sky-800",
  completed: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  failed: "bg-red-50 text-red-800",
  cancelled: "bg-slate-100 text-slate-700",
};

const JOB_LABELS: Record<ProcessingJob["job_type"], string> = {
  document_extract: "Document extract",
  video_metadata: "Video metadata",
  video_transcribe: "Video transcription",
  clip_detect: "Clip detection",
  video_export: "Video export",
  caption_generate: "Caption generation",
  course_generate: "Course generation",
  social_generate: "Social content generation",
  video_generate: "AI video generation",
};

type ProcessingJobsListProps = {
  jobs: ProcessingJob[];
  emptyDescription?: string;
};

export function ProcessingJobsList({
  jobs,
  emptyDescription = "Processing jobs for uploads and extraction will appear here.",
}: ProcessingJobsListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const hasActiveJobs = jobs.some(
    (job) => job.status === "queued" || job.status === "processing",
  );

  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = window.setInterval(() => {
      router.refresh();
    }, 4000);
    return () => {
      window.clearInterval(timer);
    };
  }, [hasActiveJobs, router]);

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No processing jobs yet"
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <ul className="space-y-3">
        {jobs.map((job) => {
          const busy = pending && activeId === job.id;
          const resultLink = getJobResultLink(job);
          const showResultCta =
            job.status === "completed" ||
            job.status === "queued" ||
            job.status === "processing";

          return (
            <li key={job.id} className="surface-card px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {JOB_LABELS[job.job_type] ?? job.job_type}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Updated{" "}
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(job.updated_at))}
                  </p>
                  {job.error_message ? (
                    <p className="mt-2 text-sm text-red-700">{job.error_message}</p>
                  ) : null}
                  {(job.status === "queued" || job.status === "processing") && (
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-muted">
                        <span className="capitalize">{job.status}</span>
                        <span>{job.progress_percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[var(--accent)] transition-all"
                          style={{ width: `${job.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[job.status]}`}
                  >
                    {job.status}
                  </span>
                  {showResultCta && resultLink ? (
                    <Link href={resultLink.href} className="btn-secondary">
                      {resultLink.label}
                    </Link>
                  ) : null}
                  {isCancellableJob(job) ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={busy}
                      onClick={() => {
                        const confirmed = window.confirm(
                          "Cancel this processing job?",
                        );
                        if (!confirmed) return;
                        setError(null);
                        setActiveId(job.id);
                        startTransition(async () => {
                          const result = await cancelProcessingJobAction(job.id);
                          setActiveId(null);
                          if (!result.ok) {
                            setError(result.error);
                          }
                          router.refresh();
                        });
                      }}
                    >
                      {busy ? "Cancelling…" : "Cancel"}
                    </button>
                  ) : null}
                  {isRetryableJob(job) ? (
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        setActiveId(job.id);
                        startTransition(async () => {
                          const result = await retryProcessingJobAction(job.id);
                          setActiveId(null);
                          if (!result.ok) {
                            setError(result.error);
                          }
                          router.refresh();
                        });
                      }}
                    >
                      {busy ? "Retrying…" : "Retry"}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
