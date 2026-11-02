-- A second $100,000 book. It is not the live paper account.

create table public.simulated_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  cash_cents bigint not null default 10000000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulated_accounts_cash_nonnegative check (cash_cents >= 0)
);

create table public.simulated_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.simulated_accounts (user_id) on delete cascade,
  symbol text not null,
  asset_type text not null,
  asset_name text not null,
  quantity_units bigint not null,
  avg_price_micros bigint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulated_positions_user_symbol unique (user_id, symbol),
  constraint simulated_positions_quantity_positive check (quantity_units > 0)
);

create table public.simulated_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.simulated_accounts (user_id) on delete cascade,
  symbol text not null,
  side text not null,
  quantity_units bigint not null,
  price_micros bigint not null,
  total_cents bigint not null,
  created_at timestamptz not null default now(),
  constraint simulated_transactions_side check (side in ('buy', 'sell'))
);

create table public.simulated_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.simulated_accounts (user_id) on delete cascade,
  value_cents bigint not null,
  captured_at timestamptz not null default now(),
  constraint simulated_snapshots_value_nonnegative check (value_cents >= 0)
);

alter table public.simulated_accounts enable row level security;
alter table public.simulated_positions enable row level security;
alter table public.simulated_transactions enable row level security;
alter table public.simulated_snapshots enable row level security;

create policy "simulated_accounts_select_own" on public.simulated_accounts
for select to authenticated using (user_id = auth.uid());

create policy "simulated_positions_select_own" on public.simulated_positions
for select to authenticated using (user_id = auth.uid());

create policy "simulated_transactions_select_own" on public.simulated_transactions
for select to authenticated using (user_id = auth.uid());

create policy "simulated_snapshots_select_own" on public.simulated_snapshots
for select to authenticated using (user_id = auth.uid());

create or replace function public.open_simulated_book()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.simulated_accounts (user_id, cash_cents)
  values (new.id, 10000000)
  on conflict (user_id) do nothing;

  insert into public.simulated_snapshots (user_id, value_cents)
  select new.id, 10000000
  where not exists (
    select 1 from public.simulated_snapshots where user_id = new.id
  );

  return new;
end;
$$;

drop trigger if exists on_profile_open_simulated_book on public.profiles;
create trigger on_profile_open_simulated_book
after insert on public.profiles
for each row execute function public.open_simulated_book();

insert into public.simulated_accounts (user_id, cash_cents)
select id, 10000000 from public.profiles
on conflict (user_id) do nothing;

insert into public.simulated_snapshots (user_id, value_cents)
select user_id, cash_cents from public.simulated_accounts a
where not exists (
  select 1 from public.simulated_snapshots s where s.user_id = a.user_id
);

create or replace function public.reset_simulated_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  update public.simulated_accounts
  set cash_cents = 10000000, updated_at = now()
  where user_id = p_user_id;

  if not found then
    raise exception 'ACCOUNT_MISSING';
  end if;

  delete from public.simulated_positions where user_id = p_user_id;
  delete from public.simulated_transactions where user_id = p_user_id;
  delete from public.simulated_snapshots where user_id = p_user_id;

  insert into public.simulated_snapshots (user_id, value_cents)
  values (p_user_id, 10000000);
end;
$$;

revoke all on function public.reset_simulated_account(uuid) from public;
revoke all on function public.reset_simulated_account(uuid) from anon;
revoke all on function public.reset_simulated_account(uuid) from authenticated;
grant execute on function public.reset_simulated_account(uuid) to service_role;

revoke all on function public.open_simulated_book() from public;
revoke all on function public.open_simulated_book() from anon;
revoke all on function public.open_simulated_book() from authenticated;
