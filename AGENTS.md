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

**Milestone 19 — Job result links** (complete)

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

## Known issues

- End-to-end flows require Supabase credentials, applied SQL, and a running FastAPI service with FFmpeg/ffprobe.
- A dedicated worker queue can still replace `after()` for very large media workloads.
- Paid AI providers remain disabled until `AI_PROVIDER` is explicitly extended beyond `mock`.
- Transcripts are mocked (no speech-to-text provider); replace `buildMockTranscriptSegments` when a real STT API is approved.
- Clip detection is mocked (no scene/ASR ranking model); replace `buildMockClipCandidates` when a real detector is approved.
- Apply migration `0012_ai_generation_jobs.sql` (or rebundle) before using async course/social jobs in an existing Supabase project.

## Next tasks

- Operator cutover using `docs/release-checklist.md` (merge PRs #1→#19, apply SQL bundle including `0012`, deploy API + web).
- Optional: dedicated worker queue; paid AI providers; real STT/caption providers.
