create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

alter table public.calendar_events
  add column if not exists status text not null default 'planned',
  add column if not exists url text,
  add column if not exists notes text;

alter table public.calendar_events
  drop constraint if exists calendar_events_priority_check,
  add constraint calendar_events_priority_check check (priority in ('low','medium','high')),
  drop constraint if exists calendar_events_recurrence_check,
  add constraint calendar_events_recurrence_check check (recurrence in ('none','daily','weekly','monthly','yearly')),
  drop constraint if exists calendar_events_status_check,
  add constraint calendar_events_status_check check (status in ('planned','in_progress','done','cancelled')),
  drop constraint if exists calendar_events_dates_check,
  add constraint calendar_events_dates_check check (end_at >= start_at);

create index if not exists calendar_events_user_start_idx on public.calendar_events (user_id, start_at);
create index if not exists calendar_events_user_completed_idx on public.calendar_events (user_id, completed);

alter table public.profiles enable row level security;
alter table public.calendar_events enable row level security;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists events_select_own on public.calendar_events;
drop policy if exists events_insert_own on public.calendar_events;
drop policy if exists events_update_own on public.calendar_events;
drop policy if exists events_delete_own on public.calendar_events;
create policy events_select_own on public.calendar_events for select to authenticated using ((select auth.uid()) = user_id);
create policy events_insert_own on public.calendar_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy events_update_own on public.calendar_events for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy events_delete_own on public.calendar_events for delete to authenticated using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, update on public.profiles to authenticated;
revoke all on public.calendar_events from anon;
revoke all on public.profiles from anon;
