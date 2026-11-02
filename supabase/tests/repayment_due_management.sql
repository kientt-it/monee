-- ONLY a new disposable local database. The included harness creates fixtures.
\set ON_ERROR_STOP on
\ir repayment_workspace.sql
\ir ../migrations/202611021700_repayment_due_management.sql
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$
declare p uuid; d uuid; other_due uuid; rev integer; pay uuid;
begin
  p:=public.create_repayment_plan('{"title":"Editable","kind":"installment","accountId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","firstDue":"2026-11-10","terms":2,"amount":100,"finalAmount":null}',gen_random_uuid());
  select id into d from public.repayment_dues where plan_id=p and period=1;
  select id into other_due from public.repayment_dues where plan_id=p and period=2;
  perform public.manage_repayment_due(d,0,false,'Only this period','2026-11-20',0);
  assert(select title_override='Only this period' and amount=0 and due_date='2026-11-20' and revision=1 from public.repayment_dues where id=d),'edit not persisted';
  assert(select amount=100 and title_override is null and due_date='2026-12-10' and revision=0 from public.repayment_dues where id=other_due),'other period changed';
  begin
    perform public.manage_repayment_due(d,0,false,'Stale','2026-11-21',100);
    raise exception 'stale edit allowed';
  exception when raise_exception then if sqlerrm<>'DUE_CHANGED' then raise; end if; end;
  perform public.manage_repayment_due(d,1,false,'Only this period','2026-11-20',500);
  pay:=public.record_repayment(d,20,'2026-10-30','history',null,null,gen_random_uuid());
  select revision into rev from public.repayment_dues where id=d;
  begin
    perform public.manage_repayment_due(d,rev,true,null,null,null);
    raise exception 'paid delete allowed';
  exception when raise_exception then if sqlerrm<>'DUE_HAS_PAYMENTS' then raise; end if; end;
  begin
    perform public.manage_repayment_due(d,rev,false,'Paid edit','2026-11-21',600);
    raise exception 'paid edit allowed';
  exception when raise_exception then if sqlerrm<>'DUE_HAS_PAYMENTS' then raise; end if; end;
  perform public.reverse_repayment(pay);
  select revision into rev from public.repayment_dues where id=d;
  perform public.manage_repayment_due(d,rev,true,null,null,null);
  perform public.manage_repayment_due(d,rev,true,null,null,null);
  assert(select deleted_at is not null from public.repayment_dues where id=d),'delete lost audit';
  assert(select count(*)=1 from public.repayment_payments where id=pay and reversed_at is not null),'delete erased history';
  begin
    perform public.record_repayment(d,1,'2026-10-30','history',null,null,gen_random_uuid());
    raise exception 'deleted period accepted payment';
  exception when raise_exception then if sqlerrm<>'DUE_NOT_FOUND' then raise; end if; end;
  begin
    perform public.manage_repayment_due(d,rev+1,false,'Resurrect','2026-11-21',100);
    raise exception 'deleted period editable';
  exception when raise_exception then if sqlerrm<>'DUE_DELETED' then raise; end if; end;
  assert(select current_balance=4600000 from public.accounts where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'edit/delete changed wallet';
end $$;
select set_config('test.manage_due',(select id::text from public.repayment_dues where deleted_at is null limit 1),false);
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ begin
  begin
    perform public.manage_repayment_due(current_setting('test.manage_due')::uuid,0,true,null,null,null);
    raise exception 'foreign delete allowed';
  exception when raise_exception then if sqlerrm<>'DUE_NOT_FOUND' then raise; end if; end;
end $$;
reset role;
select 'Edit/delete: ownership, zero amount, isolated period, revision conflict, paid guard, soft deletion, payment guard, audit and wallet preservation passed' as result;
