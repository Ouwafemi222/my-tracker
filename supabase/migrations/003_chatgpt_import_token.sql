-- Per-user secret for ChatGPT / automation uploads (Edge Function validates this)

alter table public.profiles
  add column if not exists import_token text unique;

create index if not exists profiles_import_token_idx
  on public.profiles (import_token)
  where import_token is not null;

comment on column public.profiles.import_token is
  'Secret token for POST /functions/v1/import-expenses (x-import-token header). Regenerate if leaked.';
