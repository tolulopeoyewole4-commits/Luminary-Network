# Changelog

All notable changes to Luminary AI are documented here.

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
