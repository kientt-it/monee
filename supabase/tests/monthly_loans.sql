-- ONLY run on a disposable, empty local PostgreSQL database, never on Supabase.
-- This harness supplies minimal Auth fixtures to verify the production migration.
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

\ir ../migrations/202609100900_monthly_loans.sql
-- SQL Editor retries must also succeed.
\ir ../migrations/202609100900_monthly_loans.sql

insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.save_monthly_loan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Loan A', '', 2000000, '2026-01-31', 3, '');
select public.save_monthly_loan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Loan A', '', 2000000, '2026-01-31', 3, '');
select public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, true);
select public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, true);
do $$ begin
  assert (select count(*) from public.loans) = 1, 'duplicate loan';
  assert (select count(*) from public.loan_payments) = 1, 'duplicate payment';
  assert (select amount from public.loan_payments) = 2000000, 'wrong amount';
  begin
    perform public.save_monthly_loan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Changed', '', 3000000, '2026-01-31', 3, '');
    raise exception 'schedule unexpectedly editable';
  exception when raise_exception then
    if sqlerrm <> 'LOAN_SCHEDULE_LOCKED' then raise; end if;
  end;
  begin
    insert into public.loan_payments values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), 2, 1, current_date, now());
    raise exception 'direct payment write allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.loans set monthly_amount = 1;
    raise exception 'direct loan write allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 4, true);
    raise exception 'out-of-term payment allowed';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_INSTALLMENT' then raise; end if;
  end;
end $$;
select public.save_monthly_loan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Renamed', '', 2000000, '2026-01-31', 3, 'metadata editable');
select public.set_monthly_loan_archived('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
do $$ begin
  begin
    perform public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2, true);
    raise exception 'archived payment allowed';
  exception when raise_exception then
    if sqlerrm <> 'LOAN_ARCHIVED' then raise; end if;
  end;
end $$;
select public.set_monthly_loan_archived('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false);

set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  assert (select count(*) from public.loans) = 0, 'loan RLS leak';
  assert (select count(*) from public.loan_payments) = 0, 'payment RLS leak';
  begin
    perform public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, false);
    raise exception 'another user can undo payment';
  exception when raise_exception then
    if sqlerrm <> 'LOAN_NOT_FOUND' then raise; end if;
  end;
  begin
    perform public.save_monthly_loan('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Hijacked', '', 2000000, '2026-01-31', 3, '');
    raise exception 'another user can overwrite loan';
  exception when raise_exception then
    if sqlerrm <> 'LOAN_NOT_FOUND' then raise; end if;
  end;
  begin
    perform public.set_monthly_loan_archived('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
    raise exception 'another user can archive loan';
  exception when raise_exception then
    if sqlerrm <> 'LOAN_NOT_FOUND' then raise; end if;
  end;
end $$;
set request.jwt.claim.sub = '';
do $$ begin
  begin
    perform public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, true);
    raise exception 'missing session allowed';
  exception when raise_exception then
    if sqlerrm <> 'UNAUTHENTICATED' then raise; end if;
  end;
end $$;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, false);
select public.set_monthly_loan_payment('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, false);
do $$ begin
  assert (select count(*) from public.loan_payments) = 0, 'undo failed';
  assert (select name from public.loans) = 'Renamed', 'unauthorized change persisted';
  begin
    perform public.save_monthly_loan('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Invalid', '', 0, '2026-01-01', 12, '');
    raise exception 'zero amount allowed';
  exception when check_violation then null;
  end;
  assert (select count(*) from public.loans) = 1, 'failed insert did not roll back';
end $$;
reset role;
select 'Monthly loan migration, RLS and RPC checks passed.' as result;
