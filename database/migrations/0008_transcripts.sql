-- Milestone 8: transcripts and timestamped segments.

-- Ensure video_transcribe exists on processing_job_type (defined in 0004 for fresh installs).
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'video_transcribe'
  ) then
    alter type public.processing_job_type add value 'video_transcribe';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'transcript_status' and n.nspname = 'public'
  ) then
    create type public.transcript_status as enum (
      'draft',
      'processing',
      'ready',
      'failed'
    );
  end if;
end $$;

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  language text not null default 'en',
  full_text text not null default '',
  status public.transcript_status not null default 'draft',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transcripts_source_file_unique unique (source_file_id)
);

create index if not exists transcripts_user_id_idx on public.transcripts (user_id);
create index if not exists transcripts_project_id_idx on public.transcripts (project_id);

create table if not exists public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  transcript_id uuid not null references public.transcripts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  start_time numeric(12, 3) not null check (start_time >= 0),
  end_time numeric(12, 3) not null check (end_time >= start_time),
  speaker text,
  text text not null default '',
  confidence numeric(5, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transcript_segments_transcript_id_idx
  on public.transcript_segments (transcript_id, start_time);

create index if not exists transcript_segments_user_id_idx
  on public.transcript_segments (user_id);

drop trigger if exists transcripts_set_updated_at on public.transcripts;
create trigger transcripts_set_updated_at
  before update on public.transcripts
  for each row execute function public.set_updated_at();

drop trigger if exists transcript_segments_set_updated_at on public.transcript_segments;
create trigger transcript_segments_set_updated_at
  before update on public.transcript_segments
  for each row execute function public.set_updated_at();
