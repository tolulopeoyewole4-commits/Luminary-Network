import Link from "next/link";

import { ProcessingAutoRefresh } from "@/components/jobs/ProcessingAutoRefresh";
import { getJobResultLink } from "@/lib/jobs/result-links";
import type { ProcessingJob } from "@/types/database";

type ActiveGenerationStatusProps = {
  jobs: ProcessingJob[];
  projectId: string;
  kind: "course_generate" | "social_generate";
};

export function ActiveGenerationStatus({
  jobs,
  projectId,
  kind,
}: ActiveGenerationStatusProps) {
  const relevant = jobs.filter((job) => job.job_type === kind);
  if (relevant.length === 0) return null;

  const active = relevant.filter(
    (job) => job.status === "queued" || job.status === "processing",
  );
  const latestCompleted = relevant.find((job) => job.status === "completed");
  const latestFailed = relevant.find((job) => job.status === "failed");

  const completedLink = latestCompleted
    ? getJobResultLink(latestCompleted)
    : null;

  return (
    <div className="space-y-3">
      <ProcessingAutoRefresh active={active.length > 0} />
      {active.length > 0 ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          <p className="font-semibold">
            {kind === "course_generate"
              ? "Course generation in progress"
              : "Content generation in progress"}
          </p>
          <p className="mt-1">
            {active[0].status === "queued" ? "Queued" : "Processing"} ·{" "}
            {active[0].progress_percentage}% — this page refreshes automatically.
          </p>
          <p className="mt-2">
            <Link href={`/projects/${projectId}`} className="font-semibold underline">
              View all jobs
            </Link>
          </p>
        </div>
      ) : null}
      {active.length === 0 && completedLink && latestCompleted ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          <p className="font-semibold">Latest generation ready</p>
          <p className="mt-1">
            <Link href={completedLink.href} className="font-semibold underline">
              {completedLink.label}
            </Link>
          </p>
        </div>
      ) : null}
      {active.length === 0 && latestFailed ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Latest generation failed</p>
          <p className="mt-1">
            {latestFailed.error_message || "Retry from the project jobs list."}
          </p>
          <p className="mt-2">
            <Link href={`/projects/${projectId}`} className="font-semibold underline">
              Open jobs
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
