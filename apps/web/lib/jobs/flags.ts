/** When true (default), video metadata continues after the server-action response. */
export function isAsyncVideoJobsEnabled(): boolean {
  const raw = (process.env.ASYNC_VIDEO_JOBS ?? "true").trim().toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}
