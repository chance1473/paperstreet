-- PaperStreet schema. Simulated cash only. No brokerage linkage.
-- Apply in the Supabase SQL editor or with `supabase db push`.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 40)
);

create table public.paper_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  cash_cents bigint not null default 10000000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paper_accounts_cash_nonnegative check (cash_cents >= 0)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.paper_accounts (user_id) on delete cascade,
  symbol text not null,
  asset_type text not null,
  asset_name text not null,
  quantity_units bigint not null,
  avg_price_micros bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint positions_user_symbol unique (user_id, symbol),
  constraint positions_symbol_format check (symbol ~ '^[A-Z0-9.]{1,12}$'),
  constraint positions_asset_type check (asset_type in ('stock', 'crypto')),
  constraint positions_quantity_positive check (quantity_units > 0),
  constraint positions_avg_price_positive check (avg_price_micros > 0)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.paper_accounts (user_id) on delete cascade,
  symbol text not null,
  asset_type text not null,
  asset_name text not null,
  side text not null,
  quantity_units bigint not null,
  price_micros bigint not null,
  total_cents bigint not null,
  created_at timestamptz not null default now(),
  constraint transactions_side check (side in ('buy', 'sell')),
  constraint transactions_asset_type check (asset_type in ('stock', 'crypto')),
  constraint transactions_quantity_positive check (quantity_units > 0),
  constraint transactions_price_positive check (price_micros > 0),
  constraint transactions_total_positive check (total_cents > 0)
);

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  symbol text not null,
  asset_type text not null,
  asset_name text not null,
  created_at timestamptz not null default now(),
  constraint watchlist_user_symbol unique (user_id, symbol),
  constraint watchlist_symbol_format check (symbol ~ '^[A-Z0-9.]{1,12}$'),
  constraint watchlist_asset_type check (asset_type in ('stock', 'crypto'))
);

create table public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.paper_accounts (user_id) on delete cascade,
  value_cents bigint not null,
  captured_at timestamptz not null default now(),
  constraint snapshots_value_nonnegative check (value_cents >= 0)
);

create index positions_user_idx on public.positions (user_id);
create index transactions_user_created_idx on public.transactions (user_id, created_at desc);
create index transactions_user_symbol_idx on public.transactions (user_id, symbol);
create index watchlist_user_idx on public.watchlist_items (user_id, created_at desc);
create index snapshots_user_captured_idx on public.portfolio_snapshots (user_id, captured_at desc);

-- ---------------------------------------------------------------------------
-- Updated-at
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger paper_accounts_touch before update on public.paper_accounts
for each row execute function public.touch_updated_at();

create trigger positions_touch before update on public.positions
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- New user: profile, $100,000 paper account, opening snapshot
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
  display_name text;
begin
  base := lower(regexp_replace(
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, 'user'), '@', 1)),
    '[^a-z0-9_]',
    '',
    'g'
  ));
  if char_length(base) < 3 then
    base := 'trader';
  end if;
  base := left(base, 16);
  candidate := left(base, 20);

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 14) || suffix::text;
    exit when suffix > 99;
  end loop;

  if candidate !~ '^[a-z0-9_]{3,20}$' then
    candidate := 'trader' || left(replace(new.id::text, '-', ''), 6);
  end if;

  display_name := left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), candidate), 40);

  insert into public.profiles (id, username, display_name)
  values (new.id, candidate, display_name);

  insert into public.paper_accounts (user_id, cash_cents)
  values (new.id, 10000000);

  insert into public.portfolio_snapshots (user_id, value_cents)
  values (new.id, 10000000);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic market buy / sell
-- Price is supplied by the Next.js server after an Alpaca lookup.
-- Execute is revoked from browser roles so clients cannot pass their own price.
-- quantity_units: 1 share or 1 coin = 100,000,000
-- price_micros: 1 dollar = 1,000,000
-- value cents = round(quantity_units * price_micros / 1_000_000_000_000)
-- ---------------------------------------------------------------------------

create or replace function public.execute_paper_trade(
  p_user_id uuid,
  p_symbol text,
  p_asset_type text,
  p_asset_name text,
  p_side text,
  p_quantity_units text,
  p_price_micros text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty numeric;
  v_price numeric;
  v_value bigint;
  v_cash bigint;
  v_old_qty numeric;
  v_old_avg numeric;
  v_new_qty numeric;
  v_new_avg numeric;
  v_tx uuid;
  v_symbol text;
begin
  if p_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  v_symbol := upper(trim(p_symbol));
  if v_symbol !~ '^[A-Z0-9.]{1,12}$' then
    raise exception 'INVALID_SYMBOL';
  end if;
  if p_asset_type not in ('stock', 'crypto') then
    raise exception 'INVALID_ASSET';
  end if;
  if p_side not in ('buy', 'sell') then
    raise exception 'INVALID_SIDE';
  end if;
  if p_quantity_units !~ '^[0-9]+$' or p_price_micros !~ '^[0-9]+$' then
    raise exception 'INVALID_AMOUNT';
  end if;

  v_qty := p_quantity_units::numeric;
  v_price := p_price_micros::numeric;

  if v_qty <= 0 or v_qty > 1000000000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;
  if v_price <= 0 or v_price > 1000000000000000 then
    raise exception 'INVALID_PRICE';
  end if;

  v_value := round((v_qty * v_price) / 1000000000000)::bigint;
  if v_value <= 0 then
    raise exception 'AMOUNT_TOO_SMALL';
  end if;

  select cash_cents into v_cash
  from public.paper_accounts
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'ACCOUNT_MISSING';
  end if;

  select quantity_units::numeric, avg_price_micros::numeric
  into v_old_qty, v_old_avg
  from public.positions
  where user_id = p_user_id and symbol = v_symbol
  for update;

  if p_side = 'buy' then
    if v_cash < v_value then
      raise exception 'INSUFFICIENT_FUNDS';
    end if;

    if v_old_qty is null then
      insert into public.positions (
        user_id, symbol, asset_type, asset_name, quantity_units, avg_price_micros
      ) values (
        p_user_id,
        v_symbol,
        p_asset_type,
        left(coalesce(nullif(trim(p_asset_name), ''), v_symbol), 80),
        v_qty::bigint,
        v_price::bigint
      );
    else
      v_new_qty := v_old_qty + v_qty;
      v_new_avg := floor(((v_old_qty * v_old_avg) + (v_qty * v_price)) / v_new_qty);
      update public.positions
      set
        quantity_units = v_new_qty::bigint,
        avg_price_micros = greatest(v_new_avg, 1)::bigint,
        asset_name = left(coalesce(nullif(trim(p_asset_name), ''), asset_name), 80),
        asset_type = p_asset_type,
        updated_at = now()
      where user_id = p_user_id and symbol = v_symbol;
    end if;

    update public.paper_accounts
    set cash_cents = cash_cents - v_value, updated_at = now()
    where user_id = p_user_id;
  else
    if v_old_qty is null or v_old_qty < v_qty then
      raise exception 'INSUFFICIENT_SHARES';
    end if;

    v_new_qty := v_old_qty - v_qty;
    if v_new_qty = 0 then
      delete from public.positions where user_id = p_user_id and symbol = v_symbol;
    else
      update public.positions
      set quantity_units = v_new_qty::bigint, updated_at = now()
      where user_id = p_user_id and symbol = v_symbol;
    end if;

    update public.paper_accounts
    set cash_cents = cash_cents + v_value, updated_at = now()
    where user_id = p_user_id;
  end if;

  insert into public.transactions (
    user_id, symbol, asset_type, asset_name, side, quantity_units, price_micros, total_cents
  ) values (
    p_user_id,
    v_symbol,
    p_asset_type,
    left(coalesce(nullif(trim(p_asset_name), ''), v_symbol), 80),
    p_side,
    v_qty::bigint,
    v_price::bigint,
    v_value
  )
  returning id into v_tx;

  return jsonb_build_object('transaction_id', v_tx, 'total_cents', v_value);
end;
$$;

create or replace function public.reset_paper_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  update public.paper_accounts
  set cash_cents = 10000000, updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'ACCOUNT_MISSING';
  end if;

  delete from public.positions where user_id = p_user_id;
  delete from public.transactions where user_id = p_user_id;
  delete from public.portfolio_snapshots where user_id = p_user_id;

  insert into public.portfolio_snapshots (user_id, value_cents)
  values (p_user_id, 10000000);
end;
$$;

revoke all on function public.execute_paper_trade(uuid, text, text, text, text, text, text) from public;
revoke all on function public.execute_paper_trade(uuid, text, text, text, text, text, text) from anon;
revoke all on function public.execute_paper_trade(uuid, text, text, text, text, text, text) from authenticated;
grant execute on function public.execute_paper_trade(uuid, text, text, text, text, text, text) to service_role;

revoke all on function public.reset_paper_account(uuid) from public;
revoke all on function public.reset_paper_account(uuid) from anon;
revoke all on function public.reset_paper_account(uuid) from authenticated;
grant execute on function public.reset_paper_account(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.paper_accounts enable row level security;
alter table public.positions enable row level security;
alter table public.transactions enable row level security;
alter table public.watchlist_items enable row level security;
alter table public.portfolio_snapshots enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());

create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "accounts_select_own" on public.paper_accounts
for select to authenticated using (user_id = auth.uid());

create policy "positions_select_own" on public.positions
for select to authenticated using (user_id = auth.uid());

create policy "transactions_select_own" on public.transactions
for select to authenticated using (user_id = auth.uid());

create policy "snapshots_select_own" on public.portfolio_snapshots
for select to authenticated using (user_id = auth.uid());

create policy "watchlist_select_own" on public.watchlist_items
for select to authenticated using (user_id = auth.uid());

create policy "watchlist_insert_own" on public.watchlist_items
for insert to authenticated with check (user_id = auth.uid());

create policy "watchlist_delete_own" on public.watchlist_items
for delete to authenticated using (user_id = auth.uid());
