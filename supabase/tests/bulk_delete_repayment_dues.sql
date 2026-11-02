-- ONLY run on a disposable local database. Includes full migration fixtures.
\set ON_ERROR_STOP on
\ir repayment_due_management.sql
\ir ../migrations/202611021800_bulk_delete_repayment_dues.sql
set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
do $$
declare p uuid; a uuid; b uuid; payload jsonb; paid uuid; rev integer;
begin
  p:=public.create_repayment_plan('{"title":"Bulk","kind":"installment","accountId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","firstDue":"2026-11-10","terms":3,"amount":100,"finalAmount":null}',gen_random_uuid());
  select min(id::text)::uuid,max(id::text)::uuid into a,b from public.repayment_dues where plan_id=p;
  payload:=jsonb_build_array(jsonb_build_object('id',a,'revision',0),jsonb_build_object('id',b,'revision',0));
  paid:=public.record_repayment(b,10,'2026-10-30','history',null,null,gen_random_uuid());
  select revision into rev from public.repayment_dues where id=b;
  payload:=jsonb_build_array(jsonb_build_object('id',a,'revision',0),jsonb_build_object('id',b,'revision',rev));
  begin
    perform public.bulk_delete_repayment_dues(payload);
    raise exception 'paid batch accepted';
  exception when raise_exception then if sqlerrm<>'DUE_HAS_PAYMENTS' then raise; end if; end;
  assert(select count(*)=3 from public.repayment_dues where plan_id=p and deleted_at is null),'batch not rolled back';
  perform public.reverse_repayment(paid);
  select revision into rev from public.repayment_dues where id=b;
  payload:=jsonb_build_array(jsonb_build_object('id',a,'revision',0),jsonb_build_object('id',b,'revision',rev));
  assert public.bulk_delete_repayment_dues(payload)=2,'bulk count wrong';
  assert public.bulk_delete_repayment_dues(payload)=0,'retry not harmless';
  assert(select count(*)=1 from public.repayment_dues where plan_id=p and deleted_at is null),'unselected due changed';
  begin
    perform public.bulk_delete_repayment_dues(jsonb_build_array(jsonb_build_object('id',a,'revision',0),jsonb_build_object('id',a,'revision',0)));
    raise exception 'duplicates accepted';
  exception when raise_exception then if sqlerrm<>'INVALID_DUE_SELECTION' then raise; end if; end;
  begin
    perform public.bulk_delete_repayment_dues('[]');
    raise exception 'empty batch accepted';
  exception when raise_exception then if sqlerrm<>'INVALID_DUE_SELECTION' then raise; end if; end;
end $$;
select set_config('test.bulk_foreign',(select id::text from public.repayment_dues limit 1),false);
set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ begin
  begin
    perform public.bulk_delete_repayment_dues(jsonb_build_array(jsonb_build_object('id',current_setting('test.bulk_foreign')::uuid,'revision',0)));
    raise exception 'foreign batch accepted';
  exception when raise_exception then if sqlerrm<>'DUE_NOT_FOUND' then raise; end if; end;
end $$;
reset role;
select 'Bulk delete: atomic rollback, paid guard, selection scope, count, retries, validation and ownership passed' as result;
