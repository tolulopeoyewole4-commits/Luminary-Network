# AGENTS.md — Luminary AI

## Product vision

Luminary AI is the AI operating system for knowledge creators. Creators upload knowledge once and publish courses, social content, and video everywhere.

Primary tagline: **Upload knowledge once. Publish everywhere. Teach forever.**

## Engineering rules

1. Work in small, testable milestones.
2. Prefer TypeScript strict mode and production-quality Python.
3. Include error, loading, and empty states for user-facing flows.
4. Never expose service-role keys or secrets in frontend code.
5. Never commit `.env` files.
6. Store database changes as migrations; enable RLS on user-owned tables.
7. Use mocked AI (`AI_PROVIDER=mock`) until paid providers are explicitly enabled.
8. Ask before major architectural changes.

## Security rules

- Protect all authenticated routes with session checks.
- Enforce ownership in RLS and again in API handlers.
- Private storage + short-lived signed URLs for creator files.
- Validate file type, size, and ownership before processing.
- Do not log secrets or full document contents.
- AI avatar generation is disabled until a consent/security spec is approved.

## Current milestone

**Milestone 24 — Dedicated worker queue** (complete)

## Completed milestones

- **Milestone 0 — Repository Audit**: greenfield repo; no prior application code.
- **Milestone 1 — Authentication and Protected Dashboard**: monorepo scaffold, Supabase auth pages, protected dashboard/settings, profiles migration + RLS, FastAPI health endpoint, tests.
- **Milestone 2 — Project Management**: projects table + RLS, create/list/overview/edit/archive/delete UI, dashboard project summary, validation tests.
- **Milestone 3 — Private File Upload**: `source_files` + private `source-files` bucket, typed uploads with progress, signed downloads, delete, validation tests.
- **Milestone 4 — Document Processing**: PyMuPDF/DOCX/TXT extraction API, `document_sections` + `processing_jobs`, document viewer with page references.
- **Milestone 5 — Course Outline Generator**: AI provider abstraction + mock, courses/modules/lessons with source references, editable save flow.
- **Milestone 6 — Social Content Generator**: generated_content library, multi-platform mock outputs, edit/save/duplicate with source references.
- **Milestone 7 — Video Processing Jobs**: video_metadata jobs, ffprobe extraction, progress UI, retry failed jobs, auto-queue after video upload.
- **Milestone 8 — Transcript Viewer**: `transcripts` / `transcript_segments` + RLS, mock `video_transcribe` jobs, editable segments, search, jump-to-time with signed video preview.
- **Milestone 9 — Clip Candidate Review**: `clip_candidates` + RLS, mock `clip_detect` jobs, approve/reject/edit windows with signed preview.
- **Milestone 10 — FFmpeg Clip Export**: `exported_clips` + RLS, FastAPI `/api/v1/videos/export-clip`, private storage paths, signed downloads, retry failed `video_export` jobs.
- **Milestone 11 — Captions**: `captions` / `caption_cues` + RLS, `caption_generate` jobs, cue editor with WebVTT preview, WebVTT/SRT download.
- **Milestone 12 — Deployment**: Vercel/Fly/Render guidance, SQL apply order, GitHub Actions CI, production CORS/`ALLOWED_ORIGINS`, hardened API Docker image, deploy smoke scripts.
- **Milestone 13 — Release readiness**: merge-train/release checklist, SQL bundle for one-shot Supabase apply, local smoke script, docs refresh.
- **Milestone 14 — Async video metadata**: enqueue + `next/server` `after()` execution (`ASYNC_VIDEO_JOBS`), jobs list auto-refresh while queued/processing.
- **Milestone 15 — Async clip export**: enqueue FFmpeg exports via `after()` (`ASYNC_CLIP_EXPORT`), exported-clips list auto-refresh while processing.
- **Milestone 16 — Async document extract**: enqueue `document_extract` via `after()` (`ASYNC_DOCUMENT_EXTRACT`), retry reuses job id, file list/page auto-refresh while processing.
- **Milestone 17 — Async mock video jobs**: enqueue `video_transcribe` / `clip_detect` / `caption_generate` via `after()` (`ASYNC_MOCK_VIDEO_JOBS`).
- **Milestone 18 — Async AI generation**: enqueue `course_generate` / `social_generate` via `after()` (`ASYNC_AI_GENERATION`), store retry payload on jobs.
- **Milestone 19 — Job result links**: jobs list deep-links to completed outputs; generator pages show live AI job status.
- **Milestone 20 — Cancel processing jobs**: cancel queued/processing jobs; cooperative in-flight guards; retry cancelled jobs.
- **Milestone 21 — Markdown/text exports**: download courses as Markdown; download social content as Markdown or plain text.
- **Milestone 22 — Next.js proxy migration**: replace deprecated `middleware.ts` with `proxy.ts` session guard.
- **Milestone 23 — Clipboard copy exports**: copy course Markdown and content Markdown/text to the clipboard.
- **Milestone 24 — Dedicated worker queue**: FastAPI worker claims heavy media jobs (`DEDICATED_JOB_WORKER`); mock/AI jobs still use `after()`.

## Known issues

- End-to-end flows require Supabase credentials, applied SQL, and a running FastAPI service with FFmpeg/ffprobe.
- With `DEDICATED_JOB_WORKER=true`, run `pnpm worker` (or compose worker); otherwise leave the flag off so `after()` handles heavy jobs.
- Paid AI providers remain disabled until `AI_PROVIDER` is explicitly extended beyond `mock`.
- Transcripts are mocked (no speech-to-text provider); replace `buildMockTranscriptSegments` when a real STT API is approved.
- Clip detection is mocked (no scene/ASR ranking model); replace `buildMockClipCandidates` when a real detector is approved.
- Apply migrations through `0014_job_worker_claim.sql` (or rebundle) on existing Supabase projects.

## Next tasks

- Operator cutover using `docs/release-checklist.md` (merge PRs #1→#24, apply SQL bundle including `0014`, deploy API + web).
- Optional: move mock/AI jobs onto the worker; paid AI providers; real STT/caption providers.

## Cursor Cloud specific instructions

Monorepo dev commands live in the root `package.json` (`dev:web`, `dev:api`, `worker`, `test`, `gate`, `sql:bundle`) and `README.md`; prefer those over ad-hoc commands.

Environment setup (not handled by the dependency update script):
- The FastAPI service needs a Python venv at `apps/api/.venv`. Creating it requires the `python3-venv`/`python3.12-venv` system package (installed via `apt`, not the update script). Then: `python3 -m venv apps/api/.venv && apps/api/.venv/bin/pip install -r apps/api/requirements.txt`.
- Run the API for local end-to-end flows: `pnpm dev:api` (FastAPI on :8000). Web talks to it via `API_URL` using the `X-Internal-Token` shared secret.

Non-obvious notes for the AI video generation feature (`video_generate`):
- Rendering needs the `ffmpeg` binary on PATH and Python `pillow` (in `apps/api/requirements.txt`). Scene frames are drawn with Pillow using DejaVu fonts at `/usr/share/fonts/truetype/dejavu`.
- The self-contained render path is `POST /api/v1/videos/generate` (accepts `scenes` or `source_text`+`mode`, returns MP4 bytes). It needs no Supabase, so it is the fastest way to verify rendering: `.venv/bin/pytest app/tests/test_video_generate.py`.
- Full browser flow (create video from the `/projects/[id]/videos` page) requires Supabase creds + the SQL bundle applied (now including `0015_generated_videos.sql`) and a private `source-files` storage bucket. Generated MP4s are stored at `{userId}/{projectId}/generated/{uuid}.mp4` and played via short-lived signed URLs.
- Storyboards come from the `AI_PROVIDER=mock` provider (`generateVideoStoryboard`); everything works offline without a paid provider.
- The dedicated worker only claims `video_generate` when `WORKER_JOB_TYPES` includes it (now in the default). With `DEDICATED_JOB_WORKER=false` (default), Next.js `after()` renders via the API instead.
- Worker auth caveat: `supabase-py==2.15.3` rejects the new `sb_secret_...` API keys at `create_client` ("Invalid API key"), so the Python worker needs a legacy `service_role` JWT in `SUPABASE_SERVICE_ROLE_KEY` (or a `supabase-py` upgrade). The web `after()` path is unaffected because `supabase-js` accepts the new publishable key. Do not set `DEDICATED_JOB_WORKER=true` unless the worker has a working service credential, or generated videos will stay stuck in `processing`.
