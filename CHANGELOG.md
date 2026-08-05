# Changelog

All notable changes to Luminary AI are documented here.

## [0.26.0] — Milestone 26

### Added

- Vertical reel/short export presets: `original` | `9:16` | `1:1` framing via FFmpeg scale+crop.
- Burn-in captions on exported clips from overlapping `caption_cues` (WebVTT → FFmpeg subtitles).
- Creator brand identity stamp from profile display name (editable in Settings).
- Migration `0015_reel_export_presets.sql` (`aspect_ratio`, `burn_captions`, `brand_stamp` on `exported_clips`).
- Clips-page reel preset controls; exports list shows applied presets.
- API Docker image installs `fonts-dejavu-core` for brand-stamp drawtext.
- Unit coverage for caption slicing, vertical export sizing, and preset helpers.
- Electron desktop shell (`apps/desktop`, `pnpm dev:desktop`) and public desktop mock at `/demo/reel-export`.
- Pilot edits demo at `/demo/pilot-edits` using the two shared Drive sources (vertical 9:16 exports with captions + brand); regenerate via `pnpm pilot:prepare`.

## [0.24.0] — Milestone 24

### Added

- Dedicated FastAPI job worker (`python -m app.workers.run` / `pnpm worker`) that claims queued heavy media jobs via Supabase service role.
- Migration `0014_job_worker_claim.sql` (`claim_processing_job` with `FOR UPDATE SKIP LOCKED`).
- Web flag `DEDICATED_JOB_WORKER` (default off): skip Next.js `after()` for `document_extract`, `video_metadata`, and `video_export`.
- Docker Compose `worker` profile and `/health` fields for worker configuration.
- Unit/SQL contract coverage for worker claim, config, and handlers.

## [0.23.0] — Milestone 23

### Added

- Copy Markdown / Copy text buttons on course and content editors (clipboard).
- Shared `copyTextToClipboard` helper with clipboard API + execCommand fallback.
- Unit coverage for clipboard copying.

## [0.22.0] — Milestone 22

### Changed

- Migrated Next.js `middleware.ts` to the `proxy.ts` convention (Next.js 16).
- Renamed Supabase session helper to `lib/supabase/session.ts`.

## [0.21.0] — Milestone 21

### Added

- Download course outlines as Markdown from the course editor.
- Download social/content items as Markdown or plain text for pasting into platforms.
- Pure export formatters with unit coverage.

## [0.20.0] — Milestone 20

### Added

- Cancel queued/processing jobs from the jobs list (`cancelled` status).
- Cooperative cancellation helpers so in-flight `after()` work cannot overwrite a cancelled job.
- Retry support for cancelled jobs; document/video cancel restores source-file status.
- Migration `0013_cancel_processing_jobs.sql` + unit/SQL contract coverage.

## [0.19.0] — Milestone 19

### Added

- Processing jobs list deep-links to the right result (course, content, transcript, clips, captions, extract).
- Course/social generator pages show live active-job status with auto-refresh.
- Unit coverage for job result link resolution.

## [0.18.0] — Milestone 18

### Added

- Async course/social AI generation via Next.js `after()` (flag `ASYNC_AI_GENERATION`, default on).
- New job types `course_generate` / `social_generate` with `processing_jobs.payload` for retryable inputs.
- Migration `0012_ai_generation_jobs.sql` (enum values + payload column).
- Generator forms show queued messaging; sync path still redirects on completion.
- Flag unit coverage + SQL contract tests.

## [0.17.0] — Milestone 17

### Added

- Async mock video jobs via Next.js `after()` (flag `ASYNC_MOCK_VIDEO_JOBS`, default on).
- `video_transcribe`, `clip_detect`, and `caption_generate` enqueue as `queued` and return immediately.
- Generate/detect buttons show “Queuing…” and skip redirects until work finishes (sync path still redirects).
- Flag unit coverage for async mock video jobs.

## [0.16.0] — Milestone 16

### Added

- Async document extraction via Next.js `after()` (flag `ASYNC_DOCUMENT_EXTRACT`, default on).
- Extract actions enqueue `document_extract` jobs and return immediately; file/pages refresh while processing.
- Document-extract retry reuses the existing job id (no duplicate job rows).
- Flag unit coverage for async document extract.

## [0.15.0] — Milestone 15

### Added

- Async FFmpeg clip export via Next.js `after()` (flag `ASYNC_CLIP_EXPORT`, default on).
- Export actions enqueue `video_export` jobs and return immediately; downloads when ready.
- Exported clips list auto-refreshes while status is `processing`.
- Flag unit coverage for async clip export.

## [0.14.0] — Milestone 14

### Added

- Async video metadata processing via Next.js `after()` (flag `ASYNC_VIDEO_JOBS`, default on).
- Server actions enqueue `video_metadata` jobs and return immediately; work continues after the response.
- Processing jobs list auto-refreshes every 4s while jobs are queued/processing.
- Unit coverage for the async jobs feature flag.

## [0.13.0] — Milestone 13

### Added

- Release cutover checklist with PR merge train (`docs/release-checklist.md`).
- `pnpm sql:bundle` to generate `database/dist/supabase_schema.sql` for one-shot Supabase apply.
- `pnpm smoke:local` local release smoke (CI gate + SQL bundle + optional API health).
- Contract tests for SQL apply-order paths and release assets.
- Architecture/docs refresh for the completed MVP surface.

## [0.12.0] — Milestone 12

### Added

- Deployment guide (`docs/deployment.md`) for Vercel, Fly/Render/Railway, and Supabase.
- `database/APPLY_ORDER.md` covering migrations through captions.
- GitHub Actions CI for web (typecheck/lint/test/build) and API (pytest + FFmpeg).
- Infrastructure samples: `infrastructure/fly.toml`, `infrastructure/render.yaml`, root `vercel.json`.
- API `ALLOWED_ORIGINS` CORS configuration and `/health` FFmpeg/ffprobe reporting.
- Hardened API Dockerfile (non-root user, curl healthcheck).
- Helper scripts: SQL order, API health smoke, env verification.
- Baseline security headers on the Next.js app.

## [0.11.0] — Milestone 11

### Added

- `captions` and `caption_cues` migrations with owner-scoped RLS.
- `caption_generate` processing jobs grounded in transcript segments (mock fallback).
- Caption editor with signed video preview, WebVTT track overlay, search, and cue edits.
- WebVTT and SRT download actions.
- Entry points from file page, file list, transcript, and clips pages.
- Retry support for failed `caption_generate` jobs.
- Caption format unit tests and SQL contract tests.

## [0.10.0] — Milestone 10

### Added

- `exported_clips` migration with owner-scoped RLS and unique candidate link.
- FastAPI `/api/v1/videos/export-clip` endpoint (FFmpeg re-encode, internal-token protected).
- `video_export` jobs that download private sources, cut clips, and upload to `{user}/{project}/exports/`.
- Export one / export-all-approved actions with signed download URLs.
- Exported clips list on the clip review page; retry support for failed exports.
- FFmpeg export tests and SQL contract tests.

## [0.9.0] — Milestone 9

### Added

- `clip_candidates` migration with `clip_candidate_status` and owner-scoped RLS.
- Mock `clip_detect` processing jobs grounded in transcript segments when available.
- Clip review UI with signed video preview, filter, edit start/end/title/reason, approve/reject.
- Entry points from file page, project file list, and transcript page.
- Retry support for failed `clip_detect` jobs.
- Mock clip unit tests and SQL contract tests.

## [0.8.0] — Milestone 8

### Added

- `transcripts` and `transcript_segments` migrations with owner-scoped RLS.
- Mock `video_transcribe` processing jobs (no external speech API).
- Transcript viewer with private signed video preview, search, speaker/text edit, and jump-to-time.
- Generate/regenerate entry points from project file list and video file page.
- Retry support for failed `video_transcribe` jobs.
- Mock transcript unit tests and SQL contract tests.

## [0.7.0] — Milestone 7

### Added

- `video_metadata` processing job type and `source_files.media_metadata`.
- FastAPI `/api/v1/videos/metadata` endpoint using ffprobe.
- Video process/retry actions with queued → processing → completed/failed states.
- Processing jobs panels on dashboard and project overview.
- Auto-queue metadata extraction after MP4/MOV upload.
- FFmpeg-backed API tests.

## [0.6.0] — Milestone 6

### Added

- `generated_content` migration and owner-scoped RLS.
- Social content generation via mock AI provider (LinkedIn, Instagram, X, YouTube, TikTok, newsletter, blog).
- Generator controls for platform, tone, length, audience, CTA, and output count.
- Content library with edit, save, duplicate, and delete.
- Source references retained on every generated item.
- Social generator tests and SQL contract tests.

## [0.5.0] — Milestone 5

### Added

- `courses`, `course_modules`, and `course_lessons` migrations with RLS.
- AI provider interface with mock course-outline generator.
- Zod schemas and separate prompt module for course generation.
- Course generator UI (source/section selection + teaching controls).
- Editable course outline viewer/editor with source references.
- Generator and mock-provider tests.

## [0.4.0] — Milestone 4

### Added

- `document_sections` and `processing_jobs` migrations with RLS.
- FastAPI `/api/v1/documents/extract` endpoint (internal-token protected).
- PDF (PyMuPDF), DOCX, and TXT extraction with heading/section detection.
- Page-aware section storage and document viewer UI.
- Process/re-extract actions with visible success and failure states.
- Extraction unit/API tests.

## [0.3.0] — Milestone 3

### Added

- `source_files` migration and owner-scoped RLS.
- Private Supabase Storage bucket `source-files` with path policies `{user_id}/{project_id}/...`.
- Secure upload flow with validation, progress, finalize/fail handlers.
- Short-lived signed download URLs (2 minutes).
- Project overview source library with delete support.
- Upload validation tests and SQL/storage contract tests.

## [0.2.0] — Milestone 2

### Added

- `projects` table migration with `project_type` and `project_status` enums.
- RLS policies so users can only CRUD their own projects.
- Project list, create, overview, edit, archive, restore, and delete flows.
- Dashboard recent-projects summary and active/archived counts.
- Project form validation tests and SQL contract tests.
- Active project quota via `MAX_PROJECTS_PER_USER`.

## [0.1.0] — Milestone 1

### Added

- Monorepo scaffolding (`apps/web`, `apps/api`, `database`, `docs`).
- Next.js app with Luminary AI branding, auth pages, and protected dashboard.
- Supabase Auth integration: register, login, logout, password recovery.
- `profiles` table migration, signup trigger, and RLS policies.
- FastAPI health-check endpoint.
- Frontend Vitest coverage for auth form validation and route helpers.
- Root documentation: README, AGENTS, architecture, security, `.env.example`.
