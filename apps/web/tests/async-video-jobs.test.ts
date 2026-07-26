import { afterEach, describe, expect, it } from "vitest";

import {
  isAsyncClipExportEnabled,
  isAsyncDocumentExtractEnabled,
  isAsyncVideoJobsEnabled,
} from "@/lib/jobs/flags";

const ORIGINAL_VIDEO = process.env.ASYNC_VIDEO_JOBS;
const ORIGINAL_EXPORT = process.env.ASYNC_CLIP_EXPORT;
const ORIGINAL_DOCUMENT = process.env.ASYNC_DOCUMENT_EXTRACT;

afterEach(() => {
  if (ORIGINAL_VIDEO === undefined) {
    delete process.env.ASYNC_VIDEO_JOBS;
  } else {
    process.env.ASYNC_VIDEO_JOBS = ORIGINAL_VIDEO;
  }
  if (ORIGINAL_EXPORT === undefined) {
    delete process.env.ASYNC_CLIP_EXPORT;
  } else {
    process.env.ASYNC_CLIP_EXPORT = ORIGINAL_EXPORT;
  }
  if (ORIGINAL_DOCUMENT === undefined) {
    delete process.env.ASYNC_DOCUMENT_EXTRACT;
  } else {
    process.env.ASYNC_DOCUMENT_EXTRACT = ORIGINAL_DOCUMENT;
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

describe("isAsyncClipExportEnabled", () => {
  it("defaults to enabled", () => {
    delete process.env.ASYNC_CLIP_EXPORT;
    expect(isAsyncClipExportEnabled()).toBe(true);
  });

  it("can be disabled with falsey values", () => {
    process.env.ASYNC_CLIP_EXPORT = "false";
    expect(isAsyncClipExportEnabled()).toBe(false);
  });
});

describe("isAsyncDocumentExtractEnabled", () => {
  it("defaults to enabled", () => {
    delete process.env.ASYNC_DOCUMENT_EXTRACT;
    expect(isAsyncDocumentExtractEnabled()).toBe(true);
  });

  it("can be disabled with falsey values", () => {
    process.env.ASYNC_DOCUMENT_EXTRACT = "false";
    expect(isAsyncDocumentExtractEnabled()).toBe(false);
    process.env.ASYNC_DOCUMENT_EXTRACT = "0";
    expect(isAsyncDocumentExtractEnabled()).toBe(false);
  });
});
