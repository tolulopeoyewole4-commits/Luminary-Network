# Luminary AI — Desktop shell (Electron)

Runs the existing Luminary AI web app in a native desktop window instead of a
browser tab. The Electron shell boots the local **web** server (and optionally
the **FastAPI** API), waits for `http://localhost:3000`, then loads it in a
window. If those servers are already running, it just attaches to them.

This package is part of the pnpm workspace, but the Electron **binary** download
is intentionally deferred (not run during a normal `pnpm install`, so the cloud
update script stays fast and reliable). Fetch it once with `pnpm setup:desktop`
on the machine where you want the desktop app.

## Prerequisites

- Node.js 20+, `pnpm`, and (for the API) Python 3.12 + `ffmpeg`
- The app's Supabase env configured (`apps/web/.env.local`, `apps/api/.env`) —
  see the repo root `README.md` / `.env.example`.

## Run in development

From the repo root:

```bash
pnpm install            # installs all workspace deps (Electron JS, binary deferred)
pnpm setup:desktop      # one-time: downloads the Electron binary

# one-time: API venv (if you haven't already)
cd apps/api && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ../..

# launch the desktop app (boots web + api, opens the native window)
pnpm dev:desktop
```

The first launch may take a few seconds while the Next.js dev server compiles.
On some Linux setups add `--no-sandbox` (use `pnpm --filter luminary-desktop dev:nosandbox`).

### Options (environment variables)

- `LUMINARY_START_BACKENDS=0` — don't start any servers; just open the window
  (use when you already run `pnpm dev:web` / `pnpm dev:api` yourself).
- `LUMINARY_START_API=0` — start only the web server, not the API.
- `LUMINARY_WEB_URL` / `LUMINARY_API_URL` — override the URLs.

On some Linux setups you may need `pnpm dev:nosandbox` (adds `--no-sandbox`).

## Packaging installers (follow-up)

Producing signed `.dmg` / `.exe` / AppImage installers (via `electron-builder`)
that bundle Node + the app is a larger, per‑OS task and is not set up yet.
