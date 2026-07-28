create table if not exists public.user_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

alter table public.user_categories enable row level security;

create policy categories_select_own on public.user_categories
for select to authenticated using ((select auth.uid()) = user_id);
create policy categories_insert_own on public.user_categories
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy categories_update_own on public.user_categories
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy categories_delete_own on public.user_categories
for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_categories to authenticated;
revoke all on public.user_categories from anon;
create index if not exists user_categories_user_id_idx on public.user_categories(user_id);

alter table public.profiles
  add column if not exists week_starts_on smallint not null default 1
    check (week_starts_on in (0, 1)),
  add column if not exists notifications_enabled boolean not null default true;
