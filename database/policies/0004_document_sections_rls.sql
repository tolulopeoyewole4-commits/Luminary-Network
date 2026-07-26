-- Milestone 4: RLS for document_sections and processing_jobs.

alter table public.document_sections enable row level security;
alter table public.processing_jobs enable row level security;

drop policy if exists "Users can view own document sections" on public.document_sections;
create policy "Users can view own document sections"
  on public.document_sections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own document sections" on public.document_sections;
create policy "Users can insert own document sections"
  on public.document_sections
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.source_files sf
      where sf.id = source_file_id
        and sf.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own document sections" on public.document_sections;
create policy "Users can update own document sections"
  on public.document_sections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own document sections" on public.document_sections;
create policy "Users can delete own document sections"
  on public.document_sections
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own processing jobs" on public.processing_jobs;
create policy "Users can view own processing jobs"
  on public.processing_jobs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own processing jobs" on public.processing_jobs;
create policy "Users can insert own processing jobs"
  on public.processing_jobs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own processing jobs" on public.processing_jobs;
create policy "Users can update own processing jobs"
  on public.processing_jobs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own processing jobs" on public.processing_jobs;
create policy "Users can delete own processing jobs"
  on public.processing_jobs
  for delete
  using (auth.uid() = user_id);
