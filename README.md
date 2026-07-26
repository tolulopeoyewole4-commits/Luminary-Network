# Luminary AI

**The AI Operating System for Knowledge Creators**

> Upload knowledge once. Publish everywhere. Teach forever.

Luminary AI helps authors, speakers, pastors, educators, consultants, coaches, trainers, and businesses transform long-form knowledge (books, PDFs, videos, sermons, podcasts) into courses, social content, short-form video, and teachable materials.

---

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), background workers for media jobs |
| Auth / DB / Storage | Supabase (Auth, PostgreSQL + RLS, private Storage) |
| Media | FFmpeg (later milestones) |
| AI | Provider abstraction with `AI_PROVIDER=mock` for MVP |

Monorepo layout:

```text
apps/web          Next.js application
apps/api          FastAPI service
database/         SQL migrations and RLS policies
docs/             Architecture and security docs
packages/         Shared packages (future)
```

---

## Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.11+
- A Supabase project
- FFmpeg (for later video milestones)

---

## Local setup

### 1. Clone and install

```bash
pnpm install
cd apps/api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

### 2. Environment variables

Copy `.env.example` to `apps/web/.env.local` and fill in Supabase values:

```bash
cp .env.example apps/web/.env.local
```

Required for Milestone 1:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

### 3. Database

In the Supabase SQL editor, run in order:

1. `database/migrations/0001_profiles.sql`
2. `database/policies/0001_profiles_rls.sql`

Enable email auth in Supabase Authentication settings. For local development you may disable email confirmation temporarily.

### 4. Run

```bash
# Frontend (http://localhost:3000)
pnpm dev:web

# API health service (http://localhost:8000)
pnpm dev:api
```

---

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev:web` | Start Next.js |
| `pnpm build:web` | Production build |
| `pnpm lint:web` | ESLint |
| `pnpm typecheck:web` | TypeScript check |
| `pnpm test:web` | Frontend tests (Vitest) |
| `pnpm dev:api` | Start FastAPI |
| `pnpm test:api` | Backend tests |
| `pnpm test` | All tests |

---

## Current milestone

**Milestone 1 — Authentication and Protected Dashboard**

Completed foundations: registration, login, logout, password recovery, protected dashboard, profile creation via database trigger, RLS on `profiles`.

---

## Security notes

- Never commit `.env` files or service-role keys.
- Browser code may only use the Supabase anon key.
- All user-owned tables must use Row-Level Security.
- Private creator uploads must use signed URLs (Milestone 3+).

See [docs/security.md](docs/security.md) and [AGENTS.md](AGENTS.md).

---

## Deployment (preview)

- Frontend: Vercel
- API: low-cost Python host
- Database / Auth / Storage: Supabase

Full deployment guidance lands in Milestone 12.
