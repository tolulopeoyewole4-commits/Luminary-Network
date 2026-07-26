-- Milestone 6: RLS for generated_content.

alter table public.generated_content enable row level security;

drop policy if exists "Users can view own generated content" on public.generated_content;
create policy "Users can view own generated content"
  on public.generated_content
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own generated content" on public.generated_content;
create policy "Users can create own generated content"
  on public.generated_content
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

drop policy if exists "Users can update own generated content" on public.generated_content;
create policy "Users can update own generated content"
  on public.generated_content
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own generated content" on public.generated_content;
create policy "Users can delete own generated content"
  on public.generated_content
  for delete
  using (auth.uid() = user_id);
