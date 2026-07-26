# Architecture

## Overview

Luminary AI is a monorepo with a Next.js frontend, a FastAPI processing API, and Supabase for authentication, PostgreSQL, and private storage.

```text
Browser
  └── apps/web (Next.js)
        ├── Supabase Auth (session cookies)
        ├── Supabase Postgres (RLS)
        └── apps/api (FastAPI) — processing jobs (later)
              └── workers (FFmpeg, document extraction)
```

## Frontend (`apps/web`)

- Next.js App Router with TypeScript strict mode.
- Server Components for protected pages; client components for forms.
- Middleware refreshes the Supabase session and guards authenticated routes.
- Tailwind CSS for styling.

## Backend (`apps/api`)

- FastAPI service for long-running and privileged work.
- Milestone 1 exposes `/health` only.
- Later milestones add document extraction, AI generation (server-side), and FFmpeg export.

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

## Storage

- Supabase Storage (private buckets) starting Milestone 3.
- Signed URLs with short expiry; no public URLs for creator content.

## AI layer

- Provider interface with a mock implementation for development.
- Browser never calls AI providers directly.
- Feature flag: `AI_PROVIDER=mock`.

## Deployment

- Web → Vercel
- API → Python host
- Auth/DB/Storage → Supabase
