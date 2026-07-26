# Security

## Authentication

- Email/password via Supabase Auth.
- Sessions handled with `@supabase/ssr` cookies.
- Middleware blocks unauthenticated access to `/dashboard`, `/settings`, and future app routes.
- Password recovery uses Supabase reset-email flow.

## Row-Level Security

- Enabled on every user-owned table.
- `profiles`: users may `SELECT`/`UPDATE` only where `id = auth.uid()`.
- Profile inserts are performed by a security-definer trigger, not by clients.
- `projects`: users may `SELECT`/`INSERT`/`UPDATE`/`DELETE` only where `user_id = auth.uid()`.
- Project mutations always use the authenticated Supabase session (anon key + user JWT), never the service role from the browser.

## Secret management

- `.env` files are gitignored.
- Only `NEXT_PUBLIC_*` values may appear in browser bundles.
- `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_JWT_SECRET` are server-only.

## Private storage (Milestone 3)

- Private bucket `source-files` only (`public = false`).
- Storage policies require the first path segment to equal `auth.uid()`.
- Metadata RLS requires `user_id = auth.uid()` and project ownership on insert.
- Short-lived signed URLs (120 seconds) for downloads.
- Validate MIME type, extension, and size on client and server.
- Block common executable/script extensions.
- Generate safe internal paths server-side; never trust client-supplied paths.
- No public object URLs for creator content.

## API security (expanding in later milestones)

- Validate Supabase access tokens.
- Re-check ownership before processing files.
- Rate-limit sensitive endpoints.
- Never log secrets or full document content.

## AI avatar (future)

Do not implement until a dedicated consent and verification specification is approved, including:

- explicit creator consent;
- rights confirmation;
- identity verification;
- avatar revocation;
- audit logs;
- visible AI-generated disclosure;
- bans on impersonation.
