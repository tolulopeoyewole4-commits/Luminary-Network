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

## Private storage (from Milestone 3)

- Private buckets only.
- Short-lived signed URLs.
- Validate MIME type, extension, and size.
- Generate safe internal paths; never trust client-supplied paths.

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
