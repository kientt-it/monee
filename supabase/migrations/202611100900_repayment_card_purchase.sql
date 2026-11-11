-- New card purchases post one expense atomically with the repayment schedule.
-- Old clients / imported schedules without recordPurchase retain schedule-only behavior.
begin;
alter table public.repayment_plans add column purchase_transaction_id uuid references public.transactions(id);
create or replace function public.create_repayment_plan(p_input jsonb,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); existing public.repayment_plans%rowtype; pid uuid; a uuid;
  first_due date; n integer; regular bigint; last_amount bigint; target date; i integer; kind text;
  record_purchase boolean; purchase_amount bigint; purchase_date date; txid uuid; card public.accounts%rowtype;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_key is null then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text||p_key::text,0));
  select * into existing from public.repayment_plans where user_id=u and request_key=p_key;
  if existing.id is not null then
    if existing.request_body is distinct from p_input then raise exception 'REQUEST_CONFLICT'; end if;
    return existing.id;
  end if;
  a:=nullif(p_input->>'accountId','')::uuid; first_due:=(p_input->>'firstDue')::date;
  n:=(p_input->>'terms')::integer; regular:=(p_input->>'amount')::bigint;
  last_amount:=coalesce((p_input->>'finalAmount')::bigint,regular); kind:=p_input->>'kind';
  if first_due is null or first_due not between date '1900-01-01' and date '2099-12-31'
    or n is null or n not between 1 and 120 or regular is null or regular not between 1 and 1000000000000
    or last_amount not between 0 and 1000000000000 or kind not in ('installment','expense','manual')
    or kind is null or (kind<>'installment' and n<>1) then raise exception 'INVALID_SCHEDULE'; end if;
  if a is not null and not exists(select 1 from public.accounts where id=a and user_id=u and type='credit_card' and not is_archived)
    then raise exception 'INVALID_ACCOUNT'; end if;
  if kind<>'manual' and a is null then raise exception 'INVALID_ACCOUNT'; end if;
  if p_input ? 'recordPurchase' and jsonb_typeof(p_input->'recordPurchase')<>'boolean' then raise exception 'INVALID_PURCHASE'; end if;
  record_purchase:=coalesce((p_input->>'recordPurchase')::boolean,false);
  purchase_amount:=(p_input->>'purchaseAmount')::bigint;
  purchase_date:=(p_input->>'purchaseDate')::date;
  if record_purchase then
    select * into card from public.accounts where id=a and user_id=u and type='credit_card'
      and repayment_kind='credit_card' and not is_archived for update;
    if card.id is null then raise exception 'INVALID_PURCHASE_SOURCE'; end if;
    if purchase_amount is null or purchase_amount not between 1 and 1000000000000
      or purchase_date is null or purchase_date not between date '1900-01-01' and (now() at time zone 'Asia/Ho_Chi_Minh')::date
      or (kind<>'installment' and purchase_amount<>regular) then raise exception 'INVALID_PURCHASE'; end if;
    if card.current_balance<purchase_amount then raise exception 'INSUFFICIENT_CARD_CREDIT'; end if;
    if exists(select 1 from public.transactions where user_id=u and idempotency_key=p_key) then raise exception 'REQUEST_CONFLICT'; end if;
    txid:=public.create_financial_transaction('expense'::public.transaction_type,purchase_amount,a,null,null,
      trim(p_input->>'title'),'Phát sinh khoản trả từ thẻ tín dụng',
      (purchase_date::text||'T12:00:00+07:00')::timestamptz,p_key);
  elsif purchase_amount is not null or purchase_date is not null then
    raise exception 'INVALID_PURCHASE';
  end if;
  insert into public.repayment_plans(user_id,account_id,title,kind,request_key,request_body,purchase_transaction_id)
    values(u,a,trim(p_input->>'title'),kind,p_key,p_input,txid) returning id into pid;
  for i in 1..n loop
    target:=(date_trunc('month',first_due)+make_interval(months=>i-1))::date;
    target:=target+(least(extract(day from first_due),extract(day from(target+interval '1 month - 1 day')))::integer-1);
    insert into public.repayment_dues(plan_id,user_id,period,due_date,amount)
      values(pid,u,i,target,case when i=n then last_amount else regular end);
  end loop;
  return pid;
end $$;

revoke all on function public.create_repayment_plan(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_repayment_plan(jsonb,uuid) to authenticated;

-- A distinct entry point makes new clients fail safely when this migration
-- has not been applied, instead of an older RPC silently ignoring the flag.
create function public.create_repayment_plan_with_purchase(p_input jsonb,p_key uuid)
returns uuid language sql security invoker set search_path='' as $$
  select public.create_repayment_plan(p_input,p_key)
$$;
revoke all on function public.create_repayment_plan_with_purchase(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_repayment_plan_with_purchase(jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
