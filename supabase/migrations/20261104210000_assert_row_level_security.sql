-- Re-assert row-level security on every PaperStreet table.
-- Safe to run again: enabling is a no-op when already on, and each policy is
-- dropped and created with the same owner-only rule. Writes to cash, positions
-- and transactions stay server-side (service role); browsers can only read
-- their own rows, plus the watchlist insert and delete.

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

alter table public.paper_accounts enable row level security;

drop policy if exists "accounts_select_own" on public.paper_accounts;
create policy "accounts_select_own" on public.paper_accounts
for select to authenticated using (user_id = auth.uid());

alter table public.positions enable row level security;

drop policy if exists "positions_select_own" on public.positions;
create policy "positions_select_own" on public.positions
for select to authenticated using (user_id = auth.uid());

alter table public.transactions enable row level security;

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
for select to authenticated using (user_id = auth.uid());

alter table public.portfolio_snapshots enable row level security;

drop policy if exists "snapshots_select_own" on public.portfolio_snapshots;
create policy "snapshots_select_own" on public.portfolio_snapshots
for select to authenticated using (user_id = auth.uid());

alter table public.watchlist_items enable row level security;

drop policy if exists "watchlist_select_own" on public.watchlist_items;
create policy "watchlist_select_own" on public.watchlist_items
for select to authenticated using (user_id = auth.uid());

drop policy if exists "watchlist_insert_own" on public.watchlist_items;
create policy "watchlist_insert_own" on public.watchlist_items
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "watchlist_delete_own" on public.watchlist_items;
create policy "watchlist_delete_own" on public.watchlist_items
for delete to authenticated using (user_id = auth.uid());

alter table public.simulated_accounts enable row level security;

drop policy if exists "simulated_accounts_select_own" on public.simulated_accounts;
create policy "simulated_accounts_select_own" on public.simulated_accounts
for select to authenticated using (user_id = auth.uid());

alter table public.simulated_positions enable row level security;

drop policy if exists "simulated_positions_select_own" on public.simulated_positions;
create policy "simulated_positions_select_own" on public.simulated_positions
for select to authenticated using (user_id = auth.uid());

alter table public.simulated_transactions enable row level security;

drop policy if exists "simulated_transactions_select_own" on public.simulated_transactions;
create policy "simulated_transactions_select_own" on public.simulated_transactions
for select to authenticated using (user_id = auth.uid());

alter table public.simulated_snapshots enable row level security;

drop policy if exists "simulated_snapshots_select_own" on public.simulated_snapshots;
create policy "simulated_snapshots_select_own" on public.simulated_snapshots
for select to authenticated using (user_id = auth.uid());
