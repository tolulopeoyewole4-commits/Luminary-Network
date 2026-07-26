-- Milestone 20: allow creators to cancel queued/processing jobs.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_status'
      and e.enumlabel = 'cancelled'
  ) then
    alter type public.processing_job_status add value 'cancelled';
  end if;
end $$;
