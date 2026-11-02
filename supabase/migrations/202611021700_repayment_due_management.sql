-- Edit/cancel one scheduled period without deleting its financial evidence.
begin;
alter table public.repayment_dues
  add column title_override text check (length(trim(title_override)) between 1 and 100),
  add column deleted_at timestamptz,
  add column revision integer not null default 0;

create function public.bump_repayment_due_revision() returns trigger
language plpgsql set search_path='' as $$
begin new.revision:=old.revision+1; return new; end $$;
create trigger repayment_due_revision before update on public.repayment_dues
for each row execute function public.bump_repayment_due_revision();
revoke all on function public.bump_repayment_due_revision() from public,anon,authenticated;

create function public.manage_repayment_due(p_id uuid,p_revision integer,p_delete boolean,p_title text,p_date date,p_amount bigint)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d public.repayment_dues%rowtype; legacy uuid;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into d from public.repayment_dues where id=p_id and user_id=u for update;
  if d.id is null then raise exception 'DUE_NOT_FOUND'; end if;
  -- Retrying a successful cancel is harmless. Re-editing a deleted period is not.
  if d.deleted_at is not null then
    if p_delete is true then return; end if;
    raise exception 'DUE_DELETED';
  end if;
  if p_revision is null or p_revision<>d.revision then raise exception 'DUE_CHANGED'; end if;
  if p_delete is null then raise exception 'INVALID_REQUEST'; end if;
  if exists(select 1 from public.repayment_payments where due_id=d.id and reversed_at is null)
    then raise exception 'DUE_HAS_PAYMENTS'; end if;
  select legacy_installment_id into legacy from public.repayment_plans where id=d.plan_id and user_id=u;
  if legacy is not null and exists(select 1 from public.credit_card_installment_payments where installment_id=legacy)
    then raise exception 'LEGACY_PAYMENT_UNRECONCILED'; end if;
  if p_delete then
    update public.repayment_dues set deleted_at=now() where id=d.id;
  else
    if p_title is null or length(trim(p_title)) not between 1 and 100 or p_date is null
      or p_date not between date '1900-01-01' and date '2109-12-31' or p_amount is null or p_amount not between 0 and 9007199254740991
      then raise exception 'INVALID_DUE'; end if;
    update public.repayment_dues set title_override=trim(p_title),due_date=p_date,amount=p_amount where id=d.id;
  end if;
end $$;
revoke all on function public.manage_repayment_due(uuid,integer,boolean,text,date,bigint) from public,anon,authenticated;
grant execute on function public.manage_repayment_due(uuid,integer,boolean,text,date,bigint) to authenticated;

-- Payment mutations use the same row lock as editing; canceled dues cannot
-- receive money, including requests sent from an already open stale form.
create or replace function public.record_repayment(p_due uuid,p_amount bigint,p_paid_on date,p_method text,p_source uuid,p_transaction uuid,p_key uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d public.repayment_dues%rowtype; plan public.repayment_plans%rowtype;
  previous public.repayment_payments%rowtype; tx public.transactions%rowtype; txid uuid; result uuid; used bigint;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_key is null or p_amount is null or p_amount<=0 or p_paid_on is null or p_paid_on> (now() at time zone 'Asia/Ho_Chi_Minh')::date
    or p_method is null or p_method not in ('history','new','link') or (p_method<>'new' and p_source is not null) or (p_method<>'link' and p_transaction is not null) then raise exception 'INVALID_PAYMENT'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text||p_key::text,0));
  select * into previous from public.repayment_payments where user_id=u and request_key=p_key;
  if previous.id is not null then
    if previous.due_id<>p_due or previous.amount<>p_amount or previous.paid_on<>p_paid_on or previous.method<>p_method
      or previous.source_account_id is distinct from p_source
      or (p_method='link' and previous.transaction_id is distinct from p_transaction) then raise exception 'REQUEST_CONFLICT'; end if;
    if previous.reversed_at is not null then raise exception 'PAYMENT_REVERSED'; end if;
    return previous.id;
  end if;
  -- Lock existing transaction first: transaction mutation RPCs also start here.
  if p_method='link' then
    select * into tx from public.transactions where id=p_transaction and user_id=u and deleted_at is null for update;
    if tx.id is null or not exists(select 1 from public.accounts where id=tx.account_id and user_id=u and type in ('cash','bank','ewallet')) then raise exception 'INVALID_TRANSACTION'; end if;
  end if;
  select * into d from public.repayment_dues where id=p_due and user_id=u and deleted_at is null for update;
  if d.id is null then raise exception 'DUE_NOT_FOUND'; end if;
  select * into plan from public.repayment_plans where id=d.plan_id and user_id=u;
  select coalesce(sum(amount),0) into used from public.repayment_payments where due_id=d.id and reversed_at is null;
  if p_amount>d.amount-used then raise exception 'PAYMENT_EXCEEDS_DUE'; end if;
  if p_method='new' then
    perform 1 from public.accounts where id in (p_source,plan.account_id) and user_id=u order by id for update;
    if not exists(select 1 from public.accounts where id=p_source and user_id=u and type in ('cash','bank','ewallet') and not is_archived)
      then raise exception 'INVALID_SOURCE'; end if;
    if not exists(select 1 from public.accounts where id=p_source and current_balance>=p_amount) then raise exception 'INSUFFICIENT_PAYMENT_FUNDS'; end if;
    if plan.account_id is not null and not exists(select 1 from public.accounts where id=plan.account_id and user_id=u and type='credit_card'
      and p_amount::numeric<=greatest(0,credit_limit::numeric-current_balance::numeric)) then raise exception 'PAYMENT_EXCEEDS_CARD_DEBT'; end if;
    -- Reject keys already used outside this request rather than reusing an unrelated transfer.
    if exists(select 1 from public.transactions where user_id=u and idempotency_key=p_key) then raise exception 'REQUEST_CONFLICT'; end if;
    txid:=public.create_financial_transaction(case when plan.account_id is null then 'expense'::public.transaction_type else 'transfer'::public.transaction_type end,
      p_amount,p_source,plan.account_id,null,plan.title,'Thanh toán kỳ '||d.due_date::text,
      (p_paid_on::text||'T12:00:00+07:00')::timestamptz,p_key);
  elsif p_method='link' then
    if tx.transaction_date::date is null or (tx.transaction_date at time zone 'Asia/Ho_Chi_Minh')::date<>p_paid_on then raise exception 'PAYMENT_DATE_MISMATCH'; end if;
    if (plan.account_id is null and tx.type<>'expense') or (plan.account_id is not null and (tx.type<>'transfer' or tx.destination_account_id is distinct from plan.account_id))
      then raise exception 'INVALID_TRANSACTION'; end if;
    if exists(select 1 from public.credit_card_installment_payments where transaction_id=tx.id) then raise exception 'LEGACY_PAYMENT_UNRECONCILED'; end if;
    select coalesce(sum(amount),0) into used from public.repayment_payments where transaction_id=tx.id and reversed_at is null;
    if p_amount>tx.amount-used then raise exception 'PAYMENT_EXCEEDS_TRANSACTION'; end if;
    txid:=tx.id;
  end if;
  insert into public.repayment_payments(user_id,due_id,amount,paid_on,method,transaction_id,source_account_id,request_key)
    values(u,d.id,p_amount,p_paid_on,p_method,txid,p_source,p_key) returning id into result;
  update public.repayment_dues set confirmed=true where id=d.id;
  return result;
end $$;



create or replace function public.reverse_repayment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select due_id into d from public.repayment_payments where id=p_id and user_id=auth.uid();
  if d is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  perform 1 from public.repayment_dues where id=d for update;
  update public.repayment_dues set revision=revision+1 where id=d;
  update public.repayment_payments set reversed_at=coalesce(reversed_at,now()) where id=p_id and user_id=auth.uid();
end $$;


notify pgrst,'reload schema';
commit;
