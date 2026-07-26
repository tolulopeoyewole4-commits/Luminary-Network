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
- Middleware refreshes the Supabase session and guards authenticated routes (`/dashboard`, `/settings`, `/projects`).
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

## Document processing (Milestone 4)

1. Authenticated Next.js server action downloads the private object with the user session.
2. Bytes are posted to FastAPI `/api/v1/documents/extract` using `INTERNAL_API_TOKEN`.
3. FastAPI extracts text (PyMuPDF / python-docx / plain text), detects headings, and returns sections with page ranges.
4. Next.js replaces `document_sections` for that file and updates `processing_jobs` + `source_files.processing_status`.
5. The document viewer lets creators review section text and source page references.

## Course generation (Milestone 5)

1. Creator selects a processed document and one or more sections.
2. Server action loads only those owned sections and calls `getAIProvider()`.
3. Mock provider builds a structured outline from section text (no external claims).
4. Outline is validated, saved to `courses` / `course_modules` / `course_lessons`, and opened for editing.

## Social content generation (Milestone 6)

1. Creator selects processed sections and platform controls.
2. Server action calls `AIProvider.generateSocialContent()` (mock in MVP).
3. Outputs are Zod-validated, include source references, and are stored in `generated_content`.
4. Creators can edit, duplicate, and archive items in the project content library.

## Video processing jobs (Milestone 7 + 14)

1. MP4/MOV uploads complete through private storage (non-blocking XHR upload).
2. A `video_metadata` processing job is inserted as `queued`.
3. With `ASYNC_VIDEO_JOBS=true` (default), the server action returns immediately and continues via Next.js `after()`.
4. The continuation downloads the private object and posts it to FastAPI `/api/v1/videos/metadata`.
5. FastAPI uses `ffprobe` to extract duration, dimensions, and codecs.
6. Results are stored on `source_files` (`video_duration_seconds`, `media_metadata`).
7. The jobs UI auto-refreshes while status is `queued`/`processing`; failed jobs can be retried.
8. Set `ASYNC_VIDEO_JOBS=false` to force synchronous metadata processing (useful for debugging).

## Transcript viewer (Milestone 8)

1. Creators open a video source and start a `video_transcribe` job.
2. With no speech API configured, Next.js builds deterministic mock segments from duration/title.
3. One `transcripts` row per source file stores language + full text; segments store start/end, speaker, text, confidence.
4. The transcript page signs a short-lived URL for private video preview.
5. UI supports search, speaker/text edits (persisted), and click-to-seek by timestamp.
6. Failed transcription jobs can be retried from the jobs UI (reuses the job row).

## Clip candidate review (Milestone 9)

1. Creators start a `clip_detect` job on a video source.
2. Mock detector prefers transcript windows; otherwise uses evenly spaced duration slices.
3. Candidates are stored in `clip_candidates` (`suggested` / `approved` / `rejected` / `exported`).
4. Re-detection replaces suggested and rejected rows; approved/exported rows are kept.
5. Review UI supports preview seek, edit title/reason/start/end, and approve/reject.
6. Failed `clip_detect` jobs can be retried from the jobs UI.

## FFmpeg clip export (Milestone 10)

1. Creators approve a candidate, then start a `video_export` job.
2. Next.js downloads the private source and posts it to FastAPI `/api/v1/videos/export-clip` with start/end.
3. FastAPI cuts the window with FFmpeg (H.264/AAC, faststart) and returns MP4 bytes.
4. Next.js uploads the result to private storage at `{user_id}/{project_id}/exports/{uuid}.mp4`.
5. `exported_clips` stores metadata; the candidate status becomes `exported`.
6. Downloads use short-lived signed URLs; failed export jobs can be retried.

## Captions (Milestone 11)

1. Creators start a `caption_generate` job on a video source.
2. Cues are built from transcript segments when present; otherwise from mock transcript windows.
3. One `captions` row per source file stores language/status; `caption_cues` store start/end/text.
4. The captions page signs a short-lived URL for private video preview and overlays a generated WebVTT track.
5. Creators can edit cues and download WebVTT or SRT (generated on demand, not stored as separate objects).
6. Failed `caption_generate` jobs can be retried from the jobs UI.

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
