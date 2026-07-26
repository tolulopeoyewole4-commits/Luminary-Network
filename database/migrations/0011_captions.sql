-- Milestone 11: captions and timed cues (WebVTT/SRT source).

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'caption_generate'
  ) then
    alter type public.processing_job_type add value 'caption_generate';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'caption_status' and n.nspname = 'public'
  ) then
    create type public.caption_status as enum (
      'draft',
      'processing',
      'ready',
      'failed'
    );
  end if;
end $$;

create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  transcript_id uuid references public.transcripts (id) on delete set null,
  language text not null default 'en',
  status public.caption_status not null default 'draft',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint captions_source_file_unique unique (source_file_id)
);

create index if not exists captions_user_id_idx on public.captions (user_id);
create index if not exists captions_project_id_idx on public.captions (project_id);

create table if not exists public.caption_cues (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references public.captions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  start_time numeric(12, 3) not null check (start_time >= 0),
  end_time numeric(12, 3) not null check (end_time > start_time),
  text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caption_cues_caption_id_idx
  on public.caption_cues (caption_id, start_time);

create index if not exists caption_cues_user_id_idx
  on public.caption_cues (user_id);

drop trigger if exists captions_set_updated_at on public.captions;
create trigger captions_set_updated_at
  before update on public.captions
  for each row execute function public.set_updated_at();

drop trigger if exists caption_cues_set_updated_at on public.caption_cues;
create trigger caption_cues_set_updated_at
  before update on public.caption_cues
  for each row execute function public.set_updated_at();
