-- ONLY run on a disposable, empty local PostgreSQL database, never on Supabase.
-- This harness supplies minimal Auth and accounts fixtures for the production migration.
\set ON_ERROR_STOP on
create role anon;
create role authenticated;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;

create type public.account_type as enum ('cash', 'bank', 'ewallet', 'credit_card', 'saving', 'investment', 'other');
create table public.accounts (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  type public.account_type not null,
  initial_balance bigint not null default 0 check (initial_balance >= 0),
  current_balance bigint not null default 0,
  currency text not null default 'VND',
  icon text,
  color text,
  include_in_total boolean not null default true,
  updated_at timestamptz not null default now()
);
grant usage on schema public to authenticated;
grant select on public.accounts to authenticated;
alter table public.accounts enable row level security;
create policy "account owner access" on public.accounts for select using (user_id = auth.uid());

\ir ../migrations/202609101200_edit_account_initial_balance.sql
-- SQL Editor retries must also succeed.
\ir ../migrations/202609101200_edit_account_initial_balance.sql

insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.accounts (id, user_id, name, type, initial_balance, current_balance, currency, include_in_total)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', 'Ví chính', 'cash', 2500000, 2000000, 'VND', true);

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.update_financial_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Ví chính', 'cash', 3000000, 'VND', null, '#087f5b', true);
do $$ begin
  assert (select initial_balance from public.accounts where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 3000000, 'opening balance was not updated';
  assert (select current_balance from public.accounts where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') = 2500000, 'current balance delta is wrong';
  begin
    update public.accounts set initial_balance = 1;
    raise exception 'direct opening balance write allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  begin
    perform public.update_financial_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Hijacked', 'cash', 9999999, 'VND', null, null, true);
    raise exception 'another user can update account';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_ACCOUNT' then raise; end if;
  end;
end $$;

set request.jwt.claim.sub = '';
do $$ begin
  begin
    perform public.update_financial_account('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'No session', 'cash', 1, 'VND', null, null, true);
    raise exception 'missing session allowed';
  exception when raise_exception then
    if sqlerrm <> 'AUTH_REQUIRED' then raise; end if;
  end;
end $$;
reset role;
select 'Account initial balance migration, ownership and direct-write checks passed.' as result;
