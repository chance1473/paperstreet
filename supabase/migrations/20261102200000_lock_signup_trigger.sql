-- Stop browser roles from calling the signup trigger function directly.
-- The auth.users trigger still runs it. Cash stays at the $100,000 paper balance.

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

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
