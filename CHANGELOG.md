# Changelog

All notable changes to Luminary AI are documented here.

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
