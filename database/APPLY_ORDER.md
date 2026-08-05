# SQL apply order

Run these files in the Supabase SQL editor (or CLI) **in this exact order** on a new project.

For a one-shot paste, generate/use the bundle:

```bash
pnpm sql:bundle
# → database/dist/supabase_schema.sql
```

## Migrations + policies

1. `migrations/0001_profiles.sql`
2. `policies/0001_profiles_rls.sql`
3. `migrations/0002_projects.sql`
4. `policies/0002_projects_rls.sql`
5. `migrations/0003_source_files.sql`
6. `policies/0003_source_files_rls.sql`
7. `policies/0003_source_files_storage.sql`
8. `migrations/0004_document_sections.sql`
9. `policies/0004_document_sections_rls.sql`
10. `migrations/0005_courses.sql`
11. `policies/0005_courses_rls.sql`
12. `migrations/0006_generated_content.sql`
13. `policies/0006_generated_content_rls.sql`
14. `migrations/0007_video_processing.sql`
15. `migrations/0008_transcripts.sql`
16. `policies/0008_transcripts_rls.sql`
17. `migrations/0009_clip_candidates.sql`
18. `policies/0009_clip_candidates_rls.sql`
19. `migrations/0010_exported_clips.sql`
20. `policies/0010_exported_clips_rls.sql`
21. `migrations/0011_captions.sql`
22. `policies/0011_captions_rls.sql`
23. `migrations/0012_ai_generation_jobs.sql`
24. `migrations/0013_cancel_processing_jobs.sql`
25. `migrations/0014_job_worker_claim.sql`
26. `migrations/0015_reel_export_presets.sql`

Print the same list locally:

```bash
pnpm sql:order
# or
bash scripts/print-sql-apply-order.sh
```
