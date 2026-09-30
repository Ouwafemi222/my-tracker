-- Run this ENTIRE file once in Supabase → SQL Editor (in order, top to bottom).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
--
-- Before running: Authentication → Providers → Email → ON, Confirm email → OFF

-- ========== 001: transactions + user_settings ==========
create extension if not exists "pgcrypto";

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (
    type in (
      'earned_income',
      'other_income',
      'expense',
      'internal_transfer'
    )
  ),
  amount_kobo bigint not null check (amount_kobo > 0),
  occurred_at timestamptz not null,
  category text not null,
  account text not null default '',
  counterparty text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_occurred_idx
  on public.transactions (user_id, occurred_at desc);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  monthly_budget_kobo bigint not null default 0 check (monthly_budget_kobo >= 0),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at();

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.set_updated_at();

alter table public.transactions enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;

create policy "transactions_select_own"
  on public.transactions for select to authenticated
  using (auth.uid() = user_id);

create policy "transactions_insert_own"
  on public.transactions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "transactions_update_own"
  on public.transactions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions_delete_own"
  on public.transactions for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;

create policy "user_settings_select_own"
  on public.user_settings for select to authenticated
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert to authenticated
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========== 002: profiles + sign-up trigger ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for accounts created before the trigger existed
insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'Member'
  )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ========== 003: ChatGPT import token ==========
alter table public.profiles
  add column if not exists import_token text unique;

create index if not exists profiles_import_token_idx
  on public.profiles (import_token)
  where import_token is not null;

-- ========== 004: import idempotency + atomic batch RPC ==========
alter table public.transactions
  add column if not exists import_idempotency_key text,
  add column if not exists import_row_key text;

create unique index if not exists transactions_user_import_row_uidx
  on public.transactions (user_id, import_idempotency_key, import_row_key)
  where import_idempotency_key is not null
    and import_row_key is not null;

create table if not exists public.import_idempotency (
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null,
  request_id uuid not null,
  imported_count int not null default 0,
  skipped_count int not null default 0,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

alter table public.import_idempotency enable row level security;

-- Then run the rest of supabase/migrations/004_import_idempotency.sql (import_expenses_batch RPC + grants).
