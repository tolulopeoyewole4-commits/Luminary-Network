# Deployment

Luminary AI deploys as three surfaces:

| Surface | Recommended host | Notes |
|---------|------------------|-------|
| Web (`apps/web`) | [Vercel](https://vercel.com) | Next.js App Router |
| API (`apps/api`) | Fly.io, Render, or Railway | Needs FFmpeg/`ffprobe` |
| Auth / DB / Storage | Supabase | Apply SQL migrations + RLS in order |

Do not put service-role keys or `INTERNAL_API_TOKEN` in `NEXT_PUBLIC_*` variables.

---

## 1. Supabase (required first)

1. Create a Supabase project.
2. Enable Email auth (Authentication → Providers).
3. Apply SQL:
   - **One-shot:** run `pnpm sql:bundle` and paste [`database/dist/supabase_schema.sql`](../database/dist/supabase_schema.sql) into the SQL editor.
   - **Manual:** follow [`database/APPLY_ORDER.md`](../database/APPLY_ORDER.md).
4. Confirm the private `source-files` bucket exists after `0003_source_files_storage.sql`.
5. Copy project URL and anon key for the web app.
6. Keep the service role key server-only (optional for MVP; browser flows use the user JWT).

Full operator checklist (merge train + smoke): [`docs/release-checklist.md`](release-checklist.md).

Site URL / redirect URLs (Authentication → URL configuration):

- Site URL: your production web origin (e.g. `https://app.example.com`)
- Redirect URLs: `https://app.example.com/auth/callback` (and preview URLs if needed)

---

## 2. Web on Vercel

### Project settings

- **Root Directory:** `apps/web`
- **Framework:** Next.js
- **Install Command:** `cd ../.. && pnpm install`
- **Build Command:** `cd ../.. && pnpm --filter web build`
- **Output:** default Next.js output from `apps/web`
- **Node.js:** 20.x

Alternatively deploy from the monorepo root with the root `vercel.json` helpers; Root Directory `apps/web` is the simplest path.

### Environment variables (Production + Preview)

| Name | Required | Notes |
|------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Anon/public key only |
| `NEXT_PUBLIC_APP_URL` | yes | Canonical web origin (`https://…`) |
| `NEXT_PUBLIC_API_URL` | yes | Public API origin (`https://…`) |
| `API_URL` | yes | Same API origin for server actions (no trailing slash) |
| `INTERNAL_API_TOKEN` | yes | Long random secret; must match API |
| `AI_PROVIDER` | yes | `mock` for MVP |
| `ASYNC_VIDEO_JOBS` | optional | default `true` (metadata via `after()`) |
| `ASYNC_CLIP_EXPORT` | optional | default `true` (FFmpeg export via `after()`) |
| `ASYNC_DOCUMENT_EXTRACT` | optional | default `true` (document extract via `after()`) |
| `ASYNC_MOCK_VIDEO_JOBS` | optional | default `true` (transcribe/clips/captions via `after()`) |
| `ASYNC_AI_GENERATION` | optional | default `true` (course/social generate via `after()`) |
| `MAX_PROJECTS_PER_USER` | optional | default `10` |
| `MAX_FILES_PER_PROJECT` | optional | default `25` |
| `MAX_DOCUMENT_UPLOAD_MB` | optional | default `50` |
| `MAX_VIDEO_UPLOAD_MB` | optional | default `500` |

Optional browser mirrors: `NEXT_PUBLIC_MAX_*` (see `.env.example`).

After deploy, open `/login` and confirm auth callback returns to the app.

---

## 3. API (Fly.io / Render / Railway)

The API image is `apps/api/Dockerfile` (Python 3.12 + FFmpeg).

### Required API env

| Name | Required | Notes |
|------|----------|-------|
| `INTERNAL_API_TOKEN` | yes | Must match web |
| `ALLOWED_ORIGINS` | yes in prod | Comma-separated web origins, e.g. `https://app.example.com` |
| `MAX_EXTRACT_UPLOAD_MB` | optional | default `55` (metadata/export ceiling is higher in code) |

### Fly.io (example)

```bash
# from repo root
fly launch --config infrastructure/fly.toml --dockerfile apps/api/Dockerfile --no-deploy
fly secrets set INTERNAL_API_TOKEN='…' ALLOWED_ORIGINS='https://your-app.vercel.app'
fly deploy --config infrastructure/fly.toml --dockerfile apps/api/Dockerfile
```

Health check: `GET /health` should return JSON with `"status":"ok"` and `"ffmpeg":true`.

### Render (example)

Use [`infrastructure/render.yaml`](../infrastructure/render.yaml) as a Blueprint, or create a Docker web service:

- Dockerfile path: `apps/api/Dockerfile`
- Health check path: `/health`
- Disk not required for MVP (temp files use container temp)

### Railway

- New service from repo → Dockerfile at `apps/api/Dockerfile`
- Set the same secrets as above
- Expose port `8000`

### Local Docker smoke

```bash
docker compose up --build api
curl -s http://localhost:8000/health
```

---

## 4. Post-deploy checklist

1. `curl -sS https://<api-host>/health` → `status=ok`, `ffmpeg=true`, `ffprobe=true`
2. Web login / register against production Supabase
3. Create a project and upload a small TXT/PDF
4. Process document → view sections
5. Upload a short MP4 → metadata job → transcript → clips → captions
6. Confirm signed downloads work (no public storage URLs)
7. Confirm browser cannot call `/api/v1/documents/extract` without the internal token

---

## 5. CI

GitHub Actions workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs:

- Web: typecheck, lint, test, build
- API: pytest (with FFmpeg installed on the runner)

Locally, use `pnpm gate` (not `pnpm ci` — that name is reserved by pnpm).

Push protection: never commit `.env` files (see `.gitignore`).

---

## 6. Rollback notes

- **Web:** redeploy the previous Vercel deployment.
- **API:** redeploy the previous image tag / release.
- **SQL:** migrations are forward-only in MVP; restore from a Supabase backup if a bad migration is applied.

---

## 7. Cost controls (MVP)

- Keep `AI_PROVIDER=mock` until a paid provider is explicitly enabled.
- Keep avatar generation disabled (`ENABLE_AVATAR_GENERATION=false`).
- Prefer short test videos while validating export jobs (full-file upload to the API).
