import { afterEach, describe, expect, it } from "vitest";

import { isAsyncVideoJobsEnabled } from "@/lib/jobs/flags";

const ORIGINAL = process.env.ASYNC_VIDEO_JOBS;

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.ASYNC_VIDEO_JOBS;
  } else {
    process.env.ASYNC_VIDEO_JOBS = ORIGINAL;
  }
});

describe("isAsyncVideoJobsEnabled", () => {
  it("defaults to enabled", () => {
    delete process.env.ASYNC_VIDEO_JOBS;
    expect(isAsyncVideoJobsEnabled()).toBe(true);
  });

  it("can be disabled with falsey values", () => {
    process.env.ASYNC_VIDEO_JOBS = "false";
    expect(isAsyncVideoJobsEnabled()).toBe(false);
    process.env.ASYNC_VIDEO_JOBS = "0";
    expect(isAsyncVideoJobsEnabled()).toBe(false);
    process.env.ASYNC_VIDEO_JOBS = "off";
    expect(isAsyncVideoJobsEnabled()).toBe(false);
  });
});
