# Luminary AI

**The AI Operating System for Knowledge Creators**

> Upload knowledge once. Publish everywhere. Teach forever.

Luminary AI helps authors, speakers, pastors, educators, consultants, coaches, trainers, and businesses transform long-form knowledge (books, PDFs, videos, sermons, podcasts) into courses, social content, short-form video, and teachable materials.

---

## Architecture

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), FFmpeg media jobs |
| Auth / DB / Storage | Supabase (Auth, PostgreSQL + RLS, private Storage) |
| AI | Provider abstraction with `AI_PROVIDER=mock` for MVP |

Monorepo layout:

```text
apps/web          Next.js application
apps/api          FastAPI service
database/         SQL migrations and RLS policies
docs/             Architecture, security, deployment
infrastructure/   Fly/Render deploy configs
scripts/          Health and env helpers
```

---

## Prerequisites

- Node.js 20+
- pnpm 10+
- Python 3.12+
- A Supabase project
- FFmpeg / ffprobe (API host)

---

## Local setup

### 1. Clone and install

```bash
pnpm install
cd apps/api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

### 2. Environment variables

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/api/.env
```

Required for local web:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `API_URL` / `NEXT_PUBLIC_API_URL`
- `INTERNAL_API_TOKEN` (must match API)

### 3. Database

Apply SQL in order — see [`database/APPLY_ORDER.md`](database/APPLY_ORDER.md) or run:

```bash
pnpm sql:order
```

Enable email auth in Supabase Authentication settings. For local development you may disable email confirmation temporarily.

### 4. Run

```bash
# Frontend (http://localhost:3000)
pnpm dev:web

# API (http://localhost:8000)
pnpm dev:api

# Optional: API via Docker
docker compose up --build api
pnpm health:api
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
| `pnpm gate` | Full local CI gate |
| `pnpm sql:order` | Print SQL apply order |
| `pnpm sql:bundle` | Build `database/dist/supabase_schema.sql` |
| `pnpm health:api` | Smoke-check API `/health` |
| `pnpm smoke:local` | CI + SQL bundle (+ API health if up) |

---

## Current milestone

**Milestone 19 — Job result links**

Completed processing jobs deep-link to the right output (course, content, transcript, clips, captions). Course/social generator pages show live job status with auto-refresh.

- Release steps: [`docs/release-checklist.md`](docs/release-checklist.md)
- Host setup: [`docs/deployment.md`](docs/deployment.md)
- SQL order / bundle: `pnpm sql:order` · `pnpm sql:bundle` → `database/dist/supabase_schema.sql`

```bash
# Production secrets (examples)
INTERNAL_API_TOKEN=<long-random-secret>
ALLOWED_ORIGINS=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
API_URL=https://your-api.fly.dev
AI_PROVIDER=mock
```

---

## Security notes

- Never commit `.env` files or service-role keys.
- Browser code may only use the Supabase anon key.
- All user-owned tables must use Row-Level Security.
- Private creator uploads must use signed URLs.
- Internal processing endpoints require `X-Internal-Token`.

See [docs/security.md](docs/security.md) and [AGENTS.md](AGENTS.md).

---

## Deployment

| Surface | Host |
|---------|------|
| Frontend | Vercel (`apps/web`) |
| API | Fly.io / Render / Railway (`apps/api` Docker + FFmpeg) |
| Auth / DB / Storage | Supabase |

Full steps: [docs/deployment.md](docs/deployment.md).
