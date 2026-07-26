-- Milestone 9: clip candidates suggested from video/transcript.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'clip_detect'
  ) then
    alter type public.processing_job_type add value 'clip_detect';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'clip_candidate_status' and n.nspname = 'public'
  ) then
    create type public.clip_candidate_status as enum (
      'suggested',
      'approved',
      'rejected',
      'exported'
    );
  end if;
end $$;

create table if not exists public.clip_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  transcript_id uuid references public.transcripts (id) on delete set null,
  title text not null default '',
  reason text not null default '',
  start_time numeric(12, 3) not null check (start_time >= 0),
  end_time numeric(12, 3) not null check (end_time > start_time),
  score numeric(5, 4),
  status public.clip_candidate_status not null default 'suggested',
  rank integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clip_candidates_user_id_idx
  on public.clip_candidates (user_id);

create index if not exists clip_candidates_project_id_idx
  on public.clip_candidates (project_id);

create index if not exists clip_candidates_source_file_id_idx
  on public.clip_candidates (source_file_id, rank);

drop trigger if exists clip_candidates_set_updated_at on public.clip_candidates;
create trigger clip_candidates_set_updated_at
  before update on public.clip_candidates
  for each row execute function public.set_updated_at();
