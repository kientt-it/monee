-- ONLY run on a new disposable PostgreSQL database, NEVER a live Supabase DB.
\set ON_ERROR_STOP on
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean);
create table storage.objects(id uuid,name text,bucket_id text);
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
\ir ../migrations/202609071600_initial_foundation.sql
\ir ../migrations/202609071930_transaction_update_delete.sql
\ir ../migrations/202609091200_saving_goal_contribution.sql
\ir ../migrations/202609100900_monthly_loans.sql
\ir ../migrations/202609101200_edit_account_initial_balance.sql
\ir ../migrations/202610261200_payables.sql
\ir ../migrations/202610261300_bulk_delete_transactions.sql
\ir ../migrations/202610261400_credit_card_payables.sql
\ir ../migrations/202610261500_credit_card_limits.sql
\ir ../migrations/202610281200_income_allocation_installments.sql
\ir ../migrations/202610281300_installment_interest.sql
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
insert into public.accounts(id,user_id,name,type,initial_balance,current_balance,credit_limit,include_in_total) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','Cash','bank',5000000,5000000,null,true),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','11111111-1111-4111-8111-111111111111','MSB','credit_card',5000000,5000000,10000000,false);
insert into public.payables(user_id,title,amount,due_date,paid_on) values('11111111-1111-4111-8111-111111111111','Legacy paid',10000,'2026-10-10','2026-10-09');
insert into public.credit_card_installments(user_id,credit_account_id,title,principal_amount,total_amount,term_months,start_month,due_day,interest_mode,interest_rate_bps)
values('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Legacy interest',1000001,1000001,3,'2026-10-01',31,'monthly_flat',200);
\ir ../migrations/202611021600_repayment_workspace.sql
do $$ begin
  assert(select sum(d.amount)=1060001 from public.repayment_dues d join public.repayment_plans p on p.id=d.plan_id where p.title='Legacy interest'),'legacy rounding mismatch';
  assert(select amount=10000 from public.repayment_payments where method='history'),'legacy paid missing';
end $$;
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$
declare p uuid; d uuid; d2 uuid; pay uuid; tx uuid; result uuid; body jsonb;
begin
  body:='{"title":"Phone","kind":"installment","accountId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","firstDue":"2026-12-31","terms":3,"amount":1000000,"finalAmount":0}';
  p:=public.create_repayment_plan(body,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  assert public.create_repayment_plan(body,'cccccccc-cccc-4ccc-8ccc-cccccccccccc')=p,'plan retry duplicated';
  begin
    perform public.create_repayment_plan(body||'{"title":"Changed"}'::jsonb,'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
    raise exception 'mismatched retry allowed';
  exception when raise_exception then if sqlerrm<>'REQUEST_CONFLICT' then raise; end if; end;
  assert(select count(*)=3 and sum(amount)=2000000 from public.repayment_dues where plan_id=p),'schedule incorrect';
  assert(select due_date='2027-02-28' and amount=0 from public.repayment_dues where plan_id=p and period=3),'month end / final zero';
  select id into d from public.repayment_dues where plan_id=p and period=1;
  select id into d2 from public.repayment_dues where plan_id=p and period=2;
  pay:=public.record_repayment(d,400000,'2026-10-30','new','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  assert public.record_repayment(d,400000,'2026-10-30','new','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,'dddddddd-dddd-4ddd-8ddd-dddddddddddd')=pay,'payment retry duplicated';
  assert(select current_balance=4600000 from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'cash incorrect';
  assert(select current_balance=5400000 from public.accounts where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'card incorrect';
  select transaction_id into tx from public.repayment_payments where id=pay;
  begin
    perform public.record_repayment(d,700000,'2026-10-30','history',null,null,gen_random_uuid());
    raise exception 'overpay allowed';
  exception when raise_exception then if sqlerrm<>'PAYMENT_EXCEEDS_DUE' then raise; end if; end;
  begin
    perform public.soft_delete_financial_transaction(tx);
    raise exception 'linked delete allowed';
  exception when raise_exception then if sqlerrm<>'TRANSACTION_HAS_REPAYMENTS' then raise; end if; end;
  assert(select current_balance=4600000 from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'failed delete did not rollback';
  perform public.reverse_repayment(pay);
  assert(select current_balance=4600000 from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'unlink changed cash';
  result:=public.record_repayment(d2,400000,'2026-10-30','link',null,tx,gen_random_uuid());
  assert(select due_id=d2 from public.repayment_payments where id=result),'prepayment linked wrong period';
  begin
    perform public.record_repayment(d,1,'2026-10-30','link',null,tx,gen_random_uuid());
    raise exception 'transaction overallocated';
  exception when raise_exception then if sqlerrm<>'PAYMENT_EXCEEDS_TRANSACTION' then raise; end if; end;
  perform public.save_repayment_budget('2026-11-01',0,0,0,0,16,'month');
  perform public.save_repayment_budget('2026-11-01',0,500,200,100,16,'salary');
  assert(select opening_cash=0 and salary_opening_cash=500 from public.income_allocation_months where month='2026-11-01'),'budget modes conflated';
  result:=public.create_repayment_source('{"name":"Shopee","kind":"pay_later","limit":null,"debt":500000}',gen_random_uuid());
  assert(select type='credit_card' and repayment_kind='pay_later' and credit_limit=0 and current_balance=-500000 and include_in_total=false from public.accounts where id=result),'pay later source invalid';
  perform public.update_financial_account_v2(result,'Shopee renamed','credit_card',-500000,0,-400000,'VND',null,null,false);
  assert(select name='Shopee renamed' and current_balance=-400000 and initial_balance=-400000 from public.accounts where id=result),'pay later edit baseline invalid';
  result:=public.create_repayment_plan('{"title":"Insufficient funds","kind":"manual","accountId":null,"firstDue":"2026-11-10","terms":1,"amount":5000000,"finalAmount":null}',gen_random_uuid());
  select id into d from public.repayment_dues where plan_id=result;
  begin
    perform public.record_repayment(d,5000000,'2026-10-30','new','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',null,gen_random_uuid());
    raise exception 'insufficient funds allowed';
  exception when raise_exception then if sqlerrm<>'INSUFFICIENT_PAYMENT_FUNDS' then raise; end if; end;
  begin
    insert into public.repayment_dues(plan_id,user_id,period,due_date,amount) values(p,auth.uid(),4,'2027-03-31',1);
    raise exception 'direct financial writes allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('test.foreign_due',(select id::text from public.repayment_dues limit 1),false);
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ begin
  assert(select count(*)=0 from public.repayment_dues),'RLS leak';
  begin
    perform public.record_repayment(current_setting('test.foreign_due')::uuid,1,'2026-10-30','history',null,null,gen_random_uuid());
    raise exception 'foreign due payment allowed';
  exception when raise_exception then if sqlerrm<>'DUE_NOT_FOUND' then raise; end if; end;
end $$;
reset role;
select 'Repayment workspace ownership, balances, periods, rounding, idempotency, rollback and budget checks passed' as result;
