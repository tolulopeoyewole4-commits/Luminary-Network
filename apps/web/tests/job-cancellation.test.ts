import { describe, expect, it } from "vitest";

import { isCancellableJob, isRetryableJob } from "@/lib/jobs/cancellation";

describe("job cancellation helpers", () => {
  it("allows cancel only while queued or processing", () => {
    expect(isCancellableJob({ status: "queued" })).toBe(true);
    expect(isCancellableJob({ status: "processing" })).toBe(true);
    expect(isCancellableJob({ status: "completed" })).toBe(false);
    expect(isCancellableJob({ status: "failed" })).toBe(false);
    expect(isCancellableJob({ status: "cancelled" })).toBe(false);
  });

  it("allows retry for failed and cancelled jobs", () => {
    expect(isRetryableJob({ status: "failed" })).toBe(true);
    expect(isRetryableJob({ status: "cancelled" })).toBe(true);
    expect(isRetryableJob({ status: "queued" })).toBe(false);
    expect(isRetryableJob({ status: "completed" })).toBe(false);
  });
});
