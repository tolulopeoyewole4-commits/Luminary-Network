# Release checklist (MVP cutover)

Use this after Milestones 1–23 are merged (or when promoting the tip of the milestone chain).

## A. Merge train

Draft PRs are stacked. Merge **oldest → newest** so each PR’s base lands before the next:

| Order | PR | Branch | Base |
|------:|----|--------|------|
| 1 | #1 | `cursor/milestone-1-auth-dashboard-c4ad` | `main` |
| 2 | #2 | `cursor/milestone-2-project-management-c4ad` | M1 |
| 3 | #3 | `cursor/milestone-3-private-file-upload-c4ad` | M2 |
| 4 | #4 | `cursor/milestone-4-document-processing-c4ad` | M3 |
| 5 | #5 | `cursor/milestone-5-course-outline-c4ad` | M4 |
| 6 | #6 | `cursor/milestone-6-social-content-c4ad` | M5 |
| 7 | #7 | `cursor/milestone-7-video-processing-c4ad` | M6 |
| 8 | #8 | `cursor/milestone-8-transcript-viewer-c4ad` | M7 |
| 9 | #9 | `cursor/milestone-9-clip-candidates-c4ad` | M8 |
| 10 | #10 | `cursor/milestone-10-ffmpeg-export-c4ad` | M9 |
| 11 | #11 | `cursor/milestone-11-captions-c4ad` | M10 |
| 12 | #12 | `cursor/milestone-12-deployment-c4ad` | M11 |
| 13 | #13 | `cursor/milestone-13-release-readiness-c4ad` | M12 |
| 14 | #14 | `cursor/milestone-14-async-jobs-c4ad` | M13 |
| 15 | #15 | `cursor/milestone-15-async-export-c4ad` | M14 |
| 16 | #16 | `cursor/milestone-16-async-document-extract-c4ad` | M15 |
| 17 | #17 | `cursor/milestone-17-async-mock-jobs-c4ad` | M16 |
| 18 | #18 | `cursor/milestone-18-async-ai-generation-c4ad` | M17 |
| 19 | #19 | `cursor/milestone-19-job-result-links-c4ad` | M18 |
| 20 | #20 | `cursor/milestone-20-cancel-jobs-c4ad` | M19 |
| 21 | #21 | `cursor/milestone-21-export-markdown-c4ad` | M20 |
| 22 | #22 | `cursor/milestone-22-next-proxy-c4ad` | M21 |
| 23 | #23 | `cursor/milestone-23-clipboard-copy-c4ad` | M22 |

After each merge, retarget the next open PR to `main` (or merge via the stack as-is if GitHub keeps parent bases).

Alternative: merge the tip branch `cursor/milestone-23-clipboard-copy-c4ad` (or this release branch) into `main` in one shot once reviews are done.

## B. Supabase

1. Create/select the production project.
2. Enable Email auth; set Site URL + `/auth/callback` redirect.
3. Apply SQL:
   - Preferred: paste `database/dist/supabase_schema.sql` (generated via `pnpm sql:bundle`)
   - Or run files from [`database/APPLY_ORDER.md`](../database/APPLY_ORDER.md)
4. Confirm private bucket `source-files` exists and is not public.

## C. API

1. Deploy `apps/api` Docker image (Fly/Render/Railway) with FFmpeg.
2. Set `INTERNAL_API_TOKEN`, `ALLOWED_ORIGINS`.
3. `pnpm health:api https://<api-host>` → `status=ok`, `ffmpeg=true`, `ffprobe=true`.

## D. Web (Vercel)

1. Root Directory `apps/web` (or root install + filter build — see `docs/deployment.md`).
2. Set public Supabase + app/API URLs and matching `INTERNAL_API_TOKEN` / `API_URL`.
3. Keep `AI_PROVIDER=mock` for MVP.
4. Smoke: register/login → create project → upload TXT → extract → open viewer.
5. Generate a course/content item → Download Markdown (and content plain text) or Copy to clipboard.

## E. Video path smoke

1. Upload a short MP4.
2. Process metadata → generate transcript → detect clips → approve → export → download.
3. Generate captions → download WebVTT + SRT.

## F. Security spot checks

- [ ] No service-role key in Vercel `NEXT_PUBLIC_*`
- [ ] Storage objects are not publicly listed
- [ ] `/api/v1/documents/extract` returns 401 without `X-Internal-Token`
- [ ] Logged-out browser cannot open `/projects`

## G. Local gate before promote

```bash
pnpm gate
pnpm sql:bundle
# with API running:
pnpm health:api
pnpm smoke:local
```
