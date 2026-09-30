-- Idempotent ChatGPT / plugin imports (run after 001–003)

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

-- No authenticated policies: only service role (Edge Function) may read/write.

create or replace function public.import_expenses_batch(
  p_user_id uuid,
  p_idempotency_key text,
  p_request_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing jsonb;
  v_row jsonb;
  v_inserted int := 0;
  v_skipped int := 0;
  v_response jsonb;
begin
  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select response_json into v_existing
    from public.import_idempotency
    where user_id = p_user_id
      and idempotency_key = p_idempotency_key;

    if found then
      return v_existing || jsonb_build_object('duplicate', true);
    end if;
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'INVALID_BATCH: rows array required';
  end if;

  begin
    for v_row in select * from jsonb_array_elements(p_rows)
    loop
      begin
        insert into public.transactions (
          id,
          user_id,
          type,
          amount_kobo,
          occurred_at,
          category,
          account,
          counterparty,
          description,
          import_idempotency_key,
          import_row_key
        )
        values (
          coalesce((v_row->>'id')::uuid, gen_random_uuid()),
          p_user_id,
          v_row->>'type',
          (v_row->>'amount_kobo')::bigint,
          (v_row->>'occurred_at')::timestamptz,
          coalesce(v_row->>'category', 'Other expense'),
          coalesce(v_row->>'account', 'Cash'),
          coalesce(v_row->>'counterparty', ''),
          coalesce(v_row->>'description', 'Import'),
          nullif(v_row->>'import_idempotency_key', ''),
          nullif(v_row->>'import_row_key', '')
        );
        v_inserted := v_inserted + 1;
      exception
        when unique_violation then
          v_skipped := v_skipped + 1;
      end;
    end loop;

    if v_inserted = 0 and v_skipped = 0 then
      raise exception 'INSERT_FAILED: no rows written';
    end if;

    v_response := jsonb_build_object(
      'ok', true,
      'imported', v_inserted,
      'skipped', v_skipped,
      'request_id', p_request_id::text
    );

    if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
      insert into public.import_idempotency (
        user_id,
        idempotency_key,
        request_id,
        imported_count,
        skipped_count,
        response_json
      )
      values (
        p_user_id,
        p_idempotency_key,
        p_request_id,
        v_inserted,
        v_skipped,
        v_response
      );
    end if;

    return v_response;
  exception
    when others then
      raise;
  end;
end;
$$;

revoke all on function public.import_expenses_batch(uuid, text, uuid, jsonb) from public;
grant execute on function public.import_expenses_batch(uuid, text, uuid, jsonb) to service_role;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception
  when duplicate_object then null;
end;
$$;
