-- Milestone 25: RLS for generated_videos.

alter table public.generated_videos enable row level security;

drop policy if exists "Users can view own generated videos" on public.generated_videos;
create policy "Users can view own generated videos"
  on public.generated_videos for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own generated videos" on public.generated_videos;
create policy "Users can create own generated videos"
  on public.generated_videos for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own generated videos" on public.generated_videos;
create policy "Users can update own generated videos"
  on public.generated_videos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own generated videos" on public.generated_videos;
create policy "Users can delete own generated videos"
  on public.generated_videos for delete
  using (auth.uid() = user_id);
