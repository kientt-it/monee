-- ONLY run on a disposable, empty local PostgreSQL database, never on Supabase.
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
\ir ../migrations/202610261200_payables.sql
\ir ../migrations/202610261200_payables.sql

insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
grant usage on schema public to authenticated;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into public.payables(id,user_id,title,amount,due_date) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',auth.uid(),'Electricity',300000,'2026-10-25'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',auth.uid(),'Water',100000,'2026-10-26');
update public.payables set paid_on = '2026-10-24' where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
do $$ begin
  assert (select count(*) from public.payables) = 2, 'owner cannot view own payables';
  begin
    insert into public.payables(user_id,title,amount,due_date) values ('22222222-2222-4222-8222-222222222222','Wrong owner',1,'2026-10-26');
    raise exception 'cross-owner insert allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.payables(user_id,title,amount,due_date) values (auth.uid(),'Invalid',0,'2026-10-26');
    raise exception 'zero amount allowed';
  exception when check_violation then null;
  end;
end $$;

set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  assert (select count(*) from public.payables) = 0, 'RLS select leak';
  update public.payables set title = 'Hijacked' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  assert not found, 'cross-owner update allowed';
  assert public.delete_payables(array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']::uuid[]) = 0, 'cross-owner delete allowed';
end $$;
insert into public.payables(id,user_id,title,amount,due_date) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',auth.uid(),'Own',200000,'2026-11-01');
do $$ begin
  assert public.delete_payables(array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-8ccc-cccccccccccc']::uuid[]) = 1, 'bulk delete must affect own rows only';
end $$;

set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$ begin
  assert (select count(*) from public.payables) = 2, 'another user deleted owner rows';
  assert (select paid_on from public.payables where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') = '2026-10-24', 'paid state lost';
  assert public.delete_payables(array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb']::uuid[]) = 2, 'bulk delete count wrong';
  assert (select count(*) from public.payables) = 0, 'bulk delete failed';
end $$;
reset role;
select 'Payables RLS and bulk delete checks passed.' as result;
