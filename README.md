# Luminary Network

An AI-driven video creation platform. Turn text prompts and scripts into real,
playable videos — and convert full scripts into short films — rendered locally
with `ffmpeg`. No paid or external API is required to run it.

## Features

- **Text → Video**: describe a scene and get a rendered MP4.
- **Script → Film**: paste a script (scenes split on blank lines / `INT.`/`EXT.`
  headings) and get a multi-scene film.
- **Projects**: organize videos into projects (persisted in SQLite via Prisma).
- **Pluggable AI**: a deterministic local storyboard generator by default; set
  `OPENAI_API_KEY` to use OpenAI for richer scene breakdowns.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Prisma 6 ORM with a local SQLite database
- `@napi-rs/canvas` for scene frames + `ffmpeg` for video encoding

## Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io)
- `ffmpeg` available on your `PATH`

## Getting started

```bash
pnpm install                 # installs deps and generates the Prisma client
cp .env.example .env         # local SQLite connection string
pnpm prisma migrate deploy   # creates prisma/dev.db
pnpm dev                     # http://localhost:3000
```

Then create a project and generate your first video from the dashboard.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | Lint with ESLint |
| `pnpm db:migrate` | Create/apply a dev migration |
| `pnpm db:deploy` | Apply committed migrations |
| `pnpm db:studio` | Open Prisma Studio |

## Configuration

Environment variables (see `.env.example`):

- `DATABASE_URL` — SQLite connection string (default `file:./dev.db`).
- `OPENAI_API_KEY` — optional; enables OpenAI-backed storyboards.
- `OPENAI_MODEL` — optional; defaults to `gpt-4o-mini`.

## How rendering works

1. Input text is turned into an ordered **storyboard** of scenes
   (`src/lib/storyboard.ts`).
2. Each scene is drawn to a 1280×720 frame with `@napi-rs/canvas`.
3. Frames are encoded to H.264 segments and concatenated into a single MP4 with
   `ffmpeg` (`src/lib/render.ts`), written to `public/generated/`.
