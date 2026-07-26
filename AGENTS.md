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

**Milestone 3 — Private File Upload** (complete; requires Supabase migrations + storage policies)

## Completed milestones

- **Milestone 0 — Repository Audit**: greenfield repo; no prior application code.
- **Milestone 1 — Authentication and Protected Dashboard**: monorepo scaffold, Supabase auth pages, protected dashboard/settings, profiles migration + RLS, FastAPI health endpoint, tests.
- **Milestone 2 — Project Management**: projects table + RLS, create/list/overview/edit/archive/delete UI, dashboard project summary, validation tests.
- **Milestone 3 — Private File Upload**: `source_files` + private `source-files` bucket, typed uploads with progress, signed downloads, delete, validation tests.

## Known issues

- End-to-end auth/upload against a live Supabase project requires project credentials in `apps/web/.env.local` and applied SQL migrations/policies.
- Email verification behaviour depends on Supabase Auth settings.
- FastAPI is still a health/stub service; uploads use Next.js server actions + Supabase Storage RLS.
- Document extraction / processing starts in Milestone 4 (`processing_status` is prepared).

## Next tasks

- Milestone 4: PDF and document processing.
- Milestone 5: course outline generator (mocked AI).
