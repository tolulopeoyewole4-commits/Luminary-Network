-- Milestone 3: RLS for source_files metadata.

alter table public.source_files enable row level security;

drop policy if exists "Users can view own source files" on public.source_files;
create policy "Users can view own source files"
  on public.source_files
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own source files" on public.source_files;
create policy "Users can insert own source files"
  on public.source_files
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own source files" on public.source_files;
create policy "Users can update own source files"
  on public.source_files
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own source files" on public.source_files;
create policy "Users can delete own source files"
  on public.source_files
  for delete
  using (auth.uid() = user_id);
