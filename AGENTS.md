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

**Milestone 7 — Video Upload and Processing Jobs** (complete; metadata via ffprobe)

## Completed milestones

- **Milestone 0 — Repository Audit**: greenfield repo; no prior application code.
- **Milestone 1 — Authentication and Protected Dashboard**: monorepo scaffold, Supabase auth pages, protected dashboard/settings, profiles migration + RLS, FastAPI health endpoint, tests.
- **Milestone 2 — Project Management**: projects table + RLS, create/list/overview/edit/archive/delete UI, dashboard project summary, validation tests.
- **Milestone 3 — Private File Upload**: `source_files` + private `source-files` bucket, typed uploads with progress, signed downloads, delete, validation tests.
- **Milestone 4 — Document Processing**: PyMuPDF/DOCX/TXT extraction API, `document_sections` + `processing_jobs`, document viewer with page references.
- **Milestone 5 — Course Outline Generator**: AI provider abstraction + mock, courses/modules/lessons with source references, editable save flow.
- **Milestone 6 — Social Content Generator**: generated_content library, multi-platform mock outputs, edit/save/duplicate with source references.
- **Milestone 7 — Video Processing Jobs**: video_metadata jobs, ffprobe extraction, progress UI, retry failed jobs, auto-queue after video upload.

## Known issues

- End-to-end flows require Supabase credentials, applied SQL, and a running FastAPI service with FFmpeg/ffprobe.
- Large video metadata extraction currently runs in a server action (UI stays usable via async client continuation); a dedicated worker queue can replace this later.
- Paid AI providers remain disabled until `AI_PROVIDER` is explicitly extended beyond `mock`.

## Next tasks

- Milestone 8: transcript viewer.
- Milestone 9: clip candidate review.
