-- Milestone 10: exported clip artifacts from approved candidates.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'video_export'
  ) then
    alter type public.processing_job_type add value 'video_export';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'exported_clip_status' and n.nspname = 'public'
  ) then
    create type public.exported_clip_status as enum (
      'processing',
      'ready',
      'failed'
    );
  end if;
end $$;

create table if not exists public.exported_clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  clip_candidate_id uuid not null references public.clip_candidates (id) on delete cascade,
  processing_job_id uuid references public.processing_jobs (id) on delete set null,
  title text not null default '',
  start_time numeric(12, 3) not null check (start_time >= 0),
  end_time numeric(12, 3) not null check (end_time > start_time),
  duration_seconds numeric(12, 3),
  file_size bigint check (file_size is null or file_size >= 0),
  mime_type text not null default 'video/mp4',
  internal_storage_path text not null,
  status public.exported_clip_status not null default 'processing',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exported_clips_candidate_unique unique (clip_candidate_id)
);

create index if not exists exported_clips_user_id_idx
  on public.exported_clips (user_id);

create index if not exists exported_clips_source_file_id_idx
  on public.exported_clips (source_file_id, created_at desc);

create index if not exists exported_clips_project_id_idx
  on public.exported_clips (project_id);

drop trigger if exists exported_clips_set_updated_at on public.exported_clips;
create trigger exported_clips_set_updated_at
  before update on public.exported_clips
  for each row execute function public.set_updated_at();
