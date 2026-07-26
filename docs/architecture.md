# Architecture

## Overview

Luminary AI is a monorepo with a Next.js frontend, a FastAPI processing API, and Supabase for authentication, PostgreSQL, and private storage.

```text
Browser
  └── apps/web (Next.js)
        ├── Supabase Auth (session cookies)
        ├── Supabase Postgres (RLS + private Storage)
        └── apps/api (FastAPI) — documents + FFmpeg video jobs
              (called only from Next.js server actions via INTERNAL_API_TOKEN)
```

## Frontend (`apps/web`)

- Next.js App Router with TypeScript strict mode.
- Server Components for protected pages; client components for forms.
- Next.js `proxy.ts` refreshes the Supabase session and guards authenticated routes (`/dashboard`, `/settings`, `/projects`).
- Tailwind CSS for styling.
- Baseline security headers configured in `next.config.ts`.

## Backend (`apps/api`)

- FastAPI service for privileged/media work: document extract, video metadata, clip export.
- `/health` reports process liveness plus `ffmpeg`/`ffprobe` availability.
- CORS allow-list via `ALLOWED_ORIGINS` (localhost defaults always included).

## Database

- Supabase PostgreSQL.
- Migrations live in `database/migrations/`.
- RLS policies live in `database/policies/`.
- Profile rows are created by a `security definer` trigger on `auth.users`.
- Projects are owned by `user_id` and filtered exclusively by RLS.

## Project management (Milestone 2)

- Next.js server actions create/update/archive/delete projects.
- Ownership is enforced by Supabase RLS (`auth.uid() = user_id`) and by querying only the authenticated session.
- Dashboard and `/projects` pages list the current user's projects with empty and error states.

## Private uploads (Milestone 3)

1. Client validates extension, MIME, and size.
2. Server action verifies project ownership and inserts a `source_files` row (`uploading`).
3. Client uploads bytes to the private bucket at the server-provided path (progress via XHR).
4. Server verifies the object exists and marks the row `uploaded`.
5. Downloads go through `createSignedUrl` (short expiry); public URLs are never used.

## Document processing (Milestone 4 + 16 + 24)

1. A `document_extract` processing job is inserted as `queued`; the source file moves to `processing`.
2. With `DEDICATED_JOB_WORKER=true`, the action returns immediately and a FastAPI worker claims the job (see Dedicated worker queue).
3. Otherwise, with `ASYNC_DOCUMENT_EXTRACT=true` (default), the server action returns immediately and continues via Next.js `after()`.
4. The `after()` continuation downloads the private object and posts bytes to FastAPI `/api/v1/documents/extract` using `INTERNAL_API_TOKEN`.
5. Extraction uses PyMuPDF / python-docx / plain text, detects headings, and returns sections with page ranges.
6. Sections replace `document_sections` for that file; the job completes and the file becomes `ready`.
7. Jobs list and source-file/file pages auto-refresh while queued/processing; failed jobs retry with the same job id.
8. Set `ASYNC_DOCUMENT_EXTRACT=false` (and leave worker mode off) to force synchronous extraction (useful for debugging).

## Course generation (Milestone 5 + 18)

1. Creator selects a processed document and one or more sections.
2. A `course_generate` job is inserted as `queued` with the form inputs stored in `processing_jobs.payload`.
3. With `ASYNC_AI_GENERATION=true` (default), the server action returns immediately and continues via Next.js `after()`.
4. The continuation loads owned sections and calls `getAIProvider()` (mock in MVP).
5. Outline is validated, saved to `courses` / `course_modules` / `course_lessons`; job payload records `resultCourseId`.
6. Failed jobs can be retried from the jobs UI using the stored payload.
7. Set `ASYNC_AI_GENERATION=false` to force synchronous generation (still redirects to the new course).

## Social content generation (Milestone 6 + 18)

1. Creator selects processed sections and platform controls.
2. A `social_generate` job is inserted as `queued` with inputs in `processing_jobs.payload`.
3. With `ASYNC_AI_GENERATION=true` (default), work continues via Next.js `after()`.
4. Continuation calls `AIProvider.generateSocialContent()` (mock in MVP).
5. Outputs are Zod-validated, include source references, and are stored in `generated_content`; payload records `resultContentIds`.
6. Creators can edit, duplicate, and archive items; failed jobs retry from the jobs UI.

## Video processing jobs (Milestone 7 + 14 + 24)

1. MP4/MOV uploads complete through private storage (non-blocking XHR upload).
2. A `video_metadata` processing job is inserted as `queued`.
3. With `DEDICATED_JOB_WORKER=true`, the action returns immediately and a FastAPI worker claims the job.
4. Otherwise, with `ASYNC_VIDEO_JOBS=true` (default), the server action returns immediately and continues via Next.js `after()`.
5. The `after()` continuation downloads the private object and posts it to FastAPI `/api/v1/videos/metadata`.
6. `ffprobe` extracts duration, dimensions, and codecs; results land on `source_files`.
7. The jobs UI auto-refreshes while status is `queued`/`processing`; failed jobs can be retried.
8. Set `ASYNC_VIDEO_JOBS=false` (and leave worker mode off) to force synchronous metadata processing.

## Transcript viewer (Milestone 8 + 17)

1. Creators open a video source and start a `video_transcribe` job (`queued`).
2. With `ASYNC_MOCK_VIDEO_JOBS=true` (default), the server action returns immediately and continues via Next.js `after()`.
3. With no speech API configured, Next.js builds deterministic mock segments from duration/title.
4. One `transcripts` row per source file stores language + full text; segments store start/end, speaker, text, confidence.
5. The transcript page signs a short-lived URL for private video preview.
6. UI supports search, speaker/text edits (persisted), and click-to-seek by timestamp.
7. Failed transcription jobs can be retried from the jobs UI (reuses the job row).
8. Set `ASYNC_MOCK_VIDEO_JOBS=false` to force synchronous mock transcript/clip/caption jobs.

## Clip candidate review (Milestone 9 + 17)

1. Creators start a `clip_detect` job on a video source (`queued`, continues via `after()` when async mock jobs are enabled).
2. Mock detector prefers transcript windows; otherwise uses evenly spaced duration slices.
3. Candidates are stored in `clip_candidates` (`suggested` / `approved` / `rejected` / `exported`).
4. Re-detection replaces suggested and rejected rows; approved/exported rows are kept.
5. Review UI supports preview seek, edit title/reason/start/end, and approve/reject.
6. Failed `clip_detect` jobs can be retried from the jobs UI.

## FFmpeg clip export (Milestone 10 + 15 + 24)

1. Creators approve a candidate, then start a `video_export` job (`queued`).
2. With `DEDICATED_JOB_WORKER=true`, the action returns immediately and a FastAPI worker claims the job.
3. Otherwise, with `ASYNC_CLIP_EXPORT=true` (default), the server action returns immediately and continues via Next.js `after()`.
4. The `after()` continuation downloads the private source and posts it to FastAPI `/api/v1/videos/export-clip` with start/end.
5. FFmpeg cuts the window (H.264/AAC, faststart); the MP4 is stored at `{user_id}/{project_id}/exports/{uuid}.mp4`.
6. `exported_clips` stores metadata; the candidate status becomes `exported` when ready.
7. Downloads use short-lived signed URLs; the exports list auto-refreshes while processing; failed jobs can be retried.
8. Set `ASYNC_CLIP_EXPORT=false` (and leave worker mode off) to force synchronous export.

## Captions (Milestone 11 + 17)

1. Creators start a `caption_generate` job on a video source (`queued`, continues via `after()` when async mock jobs are enabled).
2. Cues are built from transcript segments when present; otherwise from mock transcript windows.
3. One `captions` row per source file stores language/status; `caption_cues` store start/end/text.
4. The captions page signs a short-lived URL for private video preview and overlays a generated WebVTT track.
5. Creators can edit cues and download WebVTT or SRT (generated on demand, not stored as separate objects).
6. Failed `caption_generate` jobs can be retried from the jobs UI.

## Job result navigation (Milestone 19)

1. `getJobResultLink()` maps each `processing_jobs` row to the best destination (course editor, content item/library, transcript, clips, captions, or file extract).
2. Course/social completed jobs read `payload.resultCourseId` / `payload.resultContentIds`.
3. The jobs list shows that deep-link CTA; generator pages poll while `course_generate` / `social_generate` are queued or processing.

## Job cancellation (Milestone 20)

1. Creators can cancel jobs while status is `queued` or `processing`.
2. Cancel sets status `cancelled` and restores source-file status for extract/metadata jobs when appropriate.
3. In-flight `after()` workers use cooperative helpers (`mark/complete/fail…IfActive`) so they cannot overwrite a cancelled row.
4. Cancelled jobs are retryable from the jobs list (same as failed).

## Publish exports (Milestone 21 + 23)

1. Course editor downloads a Markdown outline (`buildCourseMarkdown`) including modules, lessons, outcomes, and source references.
2. Content editor downloads Markdown (structured) or plain text (body-first for pasting into social tools).
3. Exports are generated on demand in server actions; no separate storage objects are created.
4. Editors can also copy the same export payloads to the clipboard (`copyTextToClipboard`, with `execCommand` fallback).

## Dedicated worker queue (Milestone 24)

1. Migration `0014_job_worker_claim.sql` adds `claim_processing_job(text[])` (service-role only, `FOR UPDATE SKIP LOCKED`).
2. Set `DEDICATED_JOB_WORKER=true` on the web app so enqueue paths for `document_extract`, `video_metadata`, and `video_export` skip Next.js `after()` and leave rows `queued`.
3. Run `pnpm worker` (or `docker compose --profile worker up worker`) with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
4. The worker polls, claims one job, downloads from private storage, runs extract/metadata/export in-process, and writes results with cooperative cancel checks.
5. Mock/AI jobs (`video_transcribe`, `clip_detect`, `caption_generate`, `course_generate`, `social_generate`) still use `after()` in this milestone.
6. Default `DEDICATED_JOB_WORKER=false` keeps the existing `after()` path for local/dev without a worker process.

## Storage

- Private Supabase Storage bucket: `source-files`.
- Object paths are server-generated: `{user_id}/{project_id}/{uuid}.{ext}`.
- Browser uploads use the authenticated user JWT; downloads use short-lived signed URLs.
- Metadata lives in `source_files` and is protected by RLS.

## AI layer

- Provider interface (`AIProvider`) with a mock implementation for development.
- Browser never calls AI providers directly; generation runs in Next.js server actions.
- Feature flag: `AI_PROVIDER=mock`.
- Course outlines are validated with Zod and always include source section references.

## Deployment (Milestone 12+)

- Web → Vercel (`apps/web`, see `docs/deployment.md` and root `vercel.json`)
- API → Docker on Fly.io / Render / Railway (`apps/api/Dockerfile`, FFmpeg required)
- Auth/DB/Storage → Supabase (`database/APPLY_ORDER.md` or bundled `database/dist/supabase_schema.sql`)
- CI → GitHub Actions (`.github/workflows/ci.yml`)
- Cutover checklist → `docs/release-checklist.md`
- API CORS origins come from `ALLOWED_ORIGINS` (plus localhost defaults)
- Internal processing remains server-to-server via `INTERNAL_API_TOKEN`
