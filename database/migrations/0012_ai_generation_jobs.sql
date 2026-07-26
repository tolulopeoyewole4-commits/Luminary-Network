-- Milestone 18: async course/social AI generation jobs + payload storage.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'course_generate'
  ) then
    alter type public.processing_job_type add value 'course_generate';
  end if;

  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'social_generate'
  ) then
    alter type public.processing_job_type add value 'social_generate';
  end if;
end $$;

alter table public.processing_jobs
  add column if not exists payload jsonb;
