-- Milestone 1: Row-Level Security for profiles.
-- Users may only read and update their own profile row.
-- Inserts are performed exclusively by the handle_new_user trigger.

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Explicitly deny client-side inserts and deletes.
-- Profile creation is handled by the auth trigger (security definer).
drop policy if exists "Users cannot insert profiles" on public.profiles;
drop policy if exists "Users cannot delete profiles" on public.profiles;
