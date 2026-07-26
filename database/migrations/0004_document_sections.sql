-- Milestone 4: extracted document sections and processing jobs.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'processing_job_type' and n.nspname = 'public'
  ) then
    create type public.processing_job_type as enum (
      'document_extract',
      'video_transcribe',
      'clip_detect',
      'video_export'
    );
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'processing_job_status' and n.nspname = 'public'
  ) then
    create type public.processing_job_status as enum (
      'queued',
      'processing',
      'completed',
      'failed'
    );
  end if;
end $$;

create table if not exists public.document_sections (
  id uuid primary key default gen_random_uuid(),
  source_file_id uuid not null references public.source_files (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  section_title text not null,
  section_number integer not null check (section_number > 0),
  page_start integer,
  page_end integer,
  extracted_text text not null default '',
  token_count integer not null default 0 check (token_count >= 0),
  created_at timestamptz not null default now(),
  constraint document_sections_title_not_blank check (char_length(trim(section_title)) > 0),
  constraint document_sections_page_order check (
    page_start is null
    or page_end is null
    or page_end >= page_start
  )
);

create index if not exists document_sections_source_file_id_idx
  on public.document_sections (source_file_id, section_number);

create index if not exists document_sections_user_id_idx
  on public.document_sections (user_id);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  source_file_id uuid references public.source_files (id) on delete set null,
  job_type public.processing_job_type not null,
  status public.processing_job_status not null default 'queued',
  progress_percentage integer not null default 0
    check (progress_percentage >= 0 and progress_percentage <= 100),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processing_jobs_user_id_idx on public.processing_jobs (user_id);
create index if not exists processing_jobs_project_id_idx on public.processing_jobs (project_id);
create index if not exists processing_jobs_source_file_id_idx
  on public.processing_jobs (source_file_id);

drop trigger if exists processing_jobs_set_updated_at on public.processing_jobs;
create trigger processing_jobs_set_updated_at
  before update on public.processing_jobs
  for each row execute function public.set_updated_at();
