# Changelog

All notable changes to Luminary AI are documented here.

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
