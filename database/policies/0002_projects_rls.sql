-- Milestone 2: Row-Level Security for projects.
-- Users may only create, read, update, and delete their own projects.

alter table public.projects enable row level security;

drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects"
  on public.projects
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects"
  on public.projects
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
  on public.projects
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
  on public.projects
  for delete
  using (auth.uid() = user_id);
