import { describe, expect, it } from "vitest";

import { getJobResultLink } from "@/lib/jobs/result-links";
import type { ProcessingJob } from "@/types/database";

function job(partial: Partial<ProcessingJob> & Pick<ProcessingJob, "job_type">): ProcessingJob {
  return {
    id: "job-1",
    user_id: "user-1",
    project_id: "proj-1",
    source_file_id: "file-1",
    status: "completed",
    progress_percentage: 100,
    error_message: null,
    payload: null,
    started_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("getJobResultLink", () => {
  it("links completed course jobs to the course editor", () => {
    const link = getJobResultLink(
      job({
        job_type: "course_generate",
        source_file_id: "file-1",
        payload: { resultCourseId: "course-9" },
      }),
    );
    expect(link).toEqual({
      href: "/projects/proj-1/courses/course-9",
      label: "Open course",
    });
  });

  it("links single social result to the content editor", () => {
    const link = getJobResultLink(
      job({
        job_type: "social_generate",
        payload: { resultContentIds: ["content-3"] },
      }),
    );
    expect(link).toEqual({
      href: "/projects/proj-1/content/content-3",
      label: "Open content",
    });
  });

  it("links multi social results to the content library tab", () => {
    const link = getJobResultLink(
      job({
        job_type: "social_generate",
        payload: { resultContentIds: ["a", "b"] },
      }),
    );
    expect(link).toEqual({
      href: "/projects/proj-1?tab=content",
      label: "Open content library",
    });
  });

  it("links video job types to specialized pages", () => {
    expect(getJobResultLink(job({ job_type: "video_transcribe" }))?.href).toBe(
      "/projects/proj-1/files/file-1/transcript",
    );
    expect(getJobResultLink(job({ job_type: "clip_detect" }))?.label).toBe(
      "Open clips",
    );
    expect(getJobResultLink(job({ job_type: "caption_generate" }))?.href).toBe(
      "/projects/proj-1/files/file-1/captions",
    );
  });

  it("falls back to project when course payload lacks a result id", () => {
    const link = getJobResultLink(
      job({
        job_type: "course_generate",
        status: "processing",
        payload: { sourceFileId: "file-1" },
      }),
    );
    expect(link).toEqual({
      href: "/projects/proj-1",
      label: "Open project",
    });
  });
});
