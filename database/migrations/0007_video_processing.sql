-- Milestone 7: video metadata fields and job type for processing.

alter table public.source_files
  add column if not exists media_metadata jsonb not null default '{}'::jsonb;

-- Add video_metadata to processing_job_type when missing.
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'video_metadata'
  ) then
    alter type public.processing_job_type add value 'video_metadata';
  end if;
end $$;
