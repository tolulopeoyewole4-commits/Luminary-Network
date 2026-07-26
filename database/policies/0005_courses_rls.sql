-- Milestone 5: RLS for courses, modules, and lessons.

alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.course_lessons enable row level security;

-- courses
drop policy if exists "Users can view own courses" on public.courses;
create policy "Users can view own courses"
  on public.courses for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own courses" on public.courses;
create policy "Users can create own courses"
  on public.courses for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own courses" on public.courses;
create policy "Users can update own courses"
  on public.courses for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own courses" on public.courses;
create policy "Users can delete own courses"
  on public.courses for delete
  using (auth.uid() = user_id);

-- course_modules
drop policy if exists "Users can view own course modules" on public.course_modules;
create policy "Users can view own course modules"
  on public.course_modules for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own course modules" on public.course_modules;
create policy "Users can create own course modules"
  on public.course_modules for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own course modules" on public.course_modules;
create policy "Users can update own course modules"
  on public.course_modules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own course modules" on public.course_modules;
create policy "Users can delete own course modules"
  on public.course_modules for delete
  using (auth.uid() = user_id);

-- course_lessons
drop policy if exists "Users can view own course lessons" on public.course_lessons;
create policy "Users can view own course lessons"
  on public.course_lessons for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own course lessons" on public.course_lessons;
create policy "Users can create own course lessons"
  on public.course_lessons for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.course_modules m
      where m.id = module_id and m.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own course lessons" on public.course_lessons;
create policy "Users can update own course lessons"
  on public.course_lessons for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own course lessons" on public.course_lessons;
create policy "Users can delete own course lessons"
  on public.course_lessons for delete
  using (auth.uid() = user_id);
