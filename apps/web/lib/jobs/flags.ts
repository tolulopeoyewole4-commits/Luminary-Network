function envFlagEnabled(name: string, defaultEnabled = true): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultEnabled;
  const normalized = raw.trim().toLowerCase();
  return normalized !== "0" && normalized !== "false" && normalized !== "off";
}

/** When true (default), video metadata continues after the server-action response. */
export function isAsyncVideoJobsEnabled(): boolean {
  return envFlagEnabled("ASYNC_VIDEO_JOBS", true);
}

/** When true (default), FFmpeg clip export continues after the server-action response. */
export function isAsyncClipExportEnabled(): boolean {
  return envFlagEnabled("ASYNC_CLIP_EXPORT", true);
}

/** When true (default), document extraction continues after the server-action response. */
export function isAsyncDocumentExtractEnabled(): boolean {
  return envFlagEnabled("ASYNC_DOCUMENT_EXTRACT", true);
}

/**
 * When true (default), mock video jobs (transcribe / clip detect / captions)
 * continue after the server-action response.
 */
export function isAsyncMockVideoJobsEnabled(): boolean {
  return envFlagEnabled("ASYNC_MOCK_VIDEO_JOBS", true);
}

/**
 * When true (default), course/social AI generation continues after the
 * server-action response.
 */
export function isAsyncAiGenerationEnabled(): boolean {
  return envFlagEnabled("ASYNC_AI_GENERATION", true);
}

/**
 * When true, worker-handled jobs (heavy media + mock video + course/social AI)
 * stay queued for the FastAPI worker instead of Next.js `after()`.
 * Default false so local/dev keeps working without a worker process.
 */
export function isDedicatedJobWorkerEnabled(): boolean {
  return envFlagEnabled("DEDICATED_JOB_WORKER", false);
}
