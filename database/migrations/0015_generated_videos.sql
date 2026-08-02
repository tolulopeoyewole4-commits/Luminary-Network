-- Milestone 25: AI video generation (text -> video, script -> film) artifacts.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'processing_job_type'
      and e.enumlabel = 'video_generate'
  ) then
    alter type public.processing_job_type add value 'video_generate';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'generated_video_status' and n.nspname = 'public'
  ) then
    create type public.generated_video_status as enum (
      'processing',
      'ready',
      'failed'
    );
  end if;
end $$;

create table if not exists public.generated_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  processing_job_id uuid references public.processing_jobs (id) on delete set null,
  title text not null default '',
  -- "TEXT_TO_VIDEO" | "SCRIPT_TO_FILM"
  mode text not null default 'TEXT_TO_VIDEO',
  source_text text not null default '',
  -- Ordered storyboard scenes: [{ "caption": text, "duration_seconds": number }]
  storyboard jsonb not null default '[]'::jsonb,
  duration_seconds numeric(12, 3),
  file_size bigint check (file_size is null or file_size >= 0),
  mime_type text not null default 'video/mp4',
  internal_storage_path text not null,
  status public.generated_video_status not null default 'processing',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generated_videos_user_id_idx
  on public.generated_videos (user_id);

create index if not exists generated_videos_project_id_idx
  on public.generated_videos (project_id, created_at desc);

create index if not exists generated_videos_processing_job_id_idx
  on public.generated_videos (processing_job_id);

drop trigger if exists generated_videos_set_updated_at on public.generated_videos;
create trigger generated_videos_set_updated_at
  before update on public.generated_videos
  for each row execute function public.set_updated_at();
