-- Milestone 24: dedicated worker claim helper for queued processing jobs.

create index if not exists processing_jobs_queued_created_at_idx
  on public.processing_jobs (created_at)
  where status = 'queued';

create or replace function public.claim_processing_job(
  p_job_types text[] default array[
    'document_extract',
    'video_metadata',
    'video_export'
  ]
)
returns public.processing_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.processing_jobs;
begin
  select *
  into claimed
  from public.processing_jobs
  where status = 'queued'
    and job_type::text = any (p_job_types)
  order by created_at asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update public.processing_jobs
  set
    status = 'processing',
    progress_percentage = greatest(progress_percentage, 5),
    started_at = coalesce(started_at, now()),
    error_message = null,
    completed_at = null,
    updated_at = now()
  where id = claimed.id
  returning * into claimed;

  return claimed;
end;
$$;

revoke all on function public.claim_processing_job(text[]) from public;
grant execute on function public.claim_processing_job(text[]) to service_role;
