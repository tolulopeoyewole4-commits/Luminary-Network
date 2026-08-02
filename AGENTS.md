<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Luminary Network is an AI-driven video creation platform (Next.js 16 App Router + TypeScript + Tailwind v4 + Prisma/SQLite). It turns text prompts and scripts into real, playable MP4s that are rendered locally with `ffmpeg` — no paid/external API is required.

### Services & commands
There is a single service (the Next.js app). Standard scripts live in `package.json`:
- Dev server: `pnpm dev` (http://localhost:3000)
- Lint: `pnpm lint` · Build: `pnpm build` · Prod start: `pnpm start`
- DB: `pnpm db:migrate` (dev), `pnpm db:deploy` (apply committed migrations), `pnpm db:studio`

### First-run bootstrap (needed once per fresh VM — NOT handled by the update script)
`.env` and the SQLite file `prisma/dev.db` are git-ignored, so they will not exist on a fresh machine. Before running the app the first time:
```
cp .env.example .env
pnpm prisma migrate deploy
```
`pnpm install` (the update script) already runs `prisma generate` via the `postinstall` hook, so the Prisma client is always present; only the `.env` + `migrate deploy` step above is required to create the database.

### Non-obvious gotchas
- Video rendering requires the `ffmpeg` binary on PATH (preinstalled in this environment). Rendered files are written to `public/generated/<videoId>.mp4` (git-ignored) and the `POST /api/videos` route renders synchronously, so that request can take a few seconds.
- `@napi-rs/canvas` (native) and `@prisma/client` must stay in `serverExternalPackages` in `next.config.ts`; without this the Turbopack build fails on the native binding.
- Prisma is intentionally pinned to v6. Prisma 7 dropped `url` from `datasource` (requires driver adapters + `prisma.config.ts`) — do not bump without migrating to that setup.
- SQLite does not support Prisma `enum`s; `Video.mode` / `Video.status` are plain strings (see `prisma/schema.prisma`).
- `AI storyboards`: set `OPENAI_API_KEY` (Cursor Secret) to enable richer scene breakdowns; otherwise a deterministic local generator is used and everything still works offline.
