import type { ProcessingJob } from "@/types/database";

export type JobResultLink = {
  href: string;
  label: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/**
 * Best navigation target for a completed (or in-progress) processing job.
 * Returns null when no useful destination exists yet.
 */
export function getJobResultLink(job: ProcessingJob): JobResultLink | null {
  const projectBase = `/projects/${job.project_id}`;
  const fileBase = job.source_file_id
    ? `${projectBase}/files/${job.source_file_id}`
    : null;
  const payload = asRecord(job.payload);

  if (job.job_type === "course_generate") {
    const courseId =
      typeof payload?.resultCourseId === "string" ? payload.resultCourseId : null;
    if (job.status === "completed" && courseId) {
      return { href: `${projectBase}/courses/${courseId}`, label: "Open course" };
    }
    return { href: projectBase, label: "Open project" };
  }

  if (job.job_type === "social_generate") {
    const ids = Array.isArray(payload?.resultContentIds)
      ? payload.resultContentIds.map(String).filter(Boolean)
      : [];
    if (job.status === "completed" && ids.length === 1) {
      return {
        href: `${projectBase}/content/${ids[0]}`,
        label: "Open content",
      };
    }
    if (job.status === "completed" && ids.length > 1) {
      return {
        href: `${projectBase}?tab=content`,
        label: "Open content library",
      };
    }
    return { href: projectBase, label: "Open project" };
  }

  if (!fileBase) {
    return { href: projectBase, label: "Open project" };
  }

  switch (job.job_type) {
    case "document_extract":
      return {
        href: fileBase,
        label: job.status === "completed" ? "View extract" : "Open file",
      };
    case "video_metadata":
      return { href: fileBase, label: "Open file" };
    case "video_transcribe":
      return {
        href: `${fileBase}/transcript`,
        label: job.status === "completed" ? "Open transcript" : "Open file",
      };
    case "clip_detect":
    case "video_export":
      return {
        href: `${fileBase}/clips`,
        label: job.status === "completed" ? "Open clips" : "Open file",
      };
    case "caption_generate":
      return {
        href: `${fileBase}/captions`,
        label: job.status === "completed" ? "Open captions" : "Open file",
      };
    default:
      return { href: fileBase, label: "Open file" };
  }
}
