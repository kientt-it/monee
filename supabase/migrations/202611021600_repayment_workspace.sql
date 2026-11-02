-- Additive cutover: no legacy rows/tables are deleted. Review unapplied legacy
-- payment links before confirming imported dues. Never infer a paid period
-- from the month of its cash transaction.
begin;
alter table public.accounts add column repayment_kind text not null default 'credit_card'
  check (repayment_kind in ('credit_card','pay_later'));
alter table public.accounts add column repayment_request_key uuid unique, add column repayment_request_body jsonb;
alter table public.income_allocation_months
  add column salary_day integer not null default 16 check (salary_day between 1 and 28),
  add column opening_cash bigint check (opening_cash between 0 and 1000000000000),
  add column living_budget bigint check (living_budget between 0 and 1000000000000),
  add column reserve_budget bigint check (reserve_budget between 0 and 1000000000000),
  add column salary_opening_cash bigint check (salary_opening_cash between 0 and 1000000000000),
  add column salary_living_budget bigint check (salary_living_budget between 0 and 1000000000000),
  add column salary_reserve_budget bigint check (salary_reserve_budget between 0 and 1000000000000);

create table public.repayment_plans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  account_id uuid references public.accounts(id), title text not null check(length(trim(title)) between 1 and 100),
  kind text not null check(kind in ('installment','expense','manual')),
  legacy_installment_id uuid unique references public.credit_card_installments(id),
  legacy_payable_id uuid unique references public.payables(id),
  request_key uuid, request_body jsonb,
  created_at timestamptz not null default now(), unique(id,user_id), unique(user_id,request_key)
);
create table public.repayment_dues (
  id uuid primary key default gen_random_uuid(), plan_id uuid not null, user_id uuid not null references auth.users(id),
  period integer not null check(period between 1 and 120), due_date date not null,
  amount bigint not null check(amount between 0 and 9007199254740991), confirmed boolean not null default true,
  unique(plan_id,period), unique(id,user_id), foreign key(plan_id,user_id) references public.repayment_plans(id,user_id)
);
create table public.repayment_payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  due_id uuid not null, amount bigint not null check(amount between 1 and 1000000000000), paid_on date not null,
  method text not null check(method in ('history','new','link')), transaction_id uuid references public.transactions(id),
  source_account_id uuid references public.accounts(id), request_key uuid not null, reversed_at timestamptz,
  foreign key(due_id,user_id) references public.repayment_dues(id,user_id),
  unique(user_id,request_key), check((method='history')=(transaction_id is null))
);
create index repayment_dues_user_date on public.repayment_dues(user_id,due_date);
create index repayment_payments_due on public.repayment_payments(due_id) where reversed_at is null;
create index repayment_payments_transaction on public.repayment_payments(transaction_id) where reversed_at is null;
alter table public.repayment_plans enable row level security;
alter table public.repayment_dues enable row level security;
alter table public.repayment_payments enable row level security;
create policy repayment_plans_owner on public.repayment_plans for select to authenticated using(user_id=(select auth.uid()));
create policy repayment_dues_owner on public.repayment_dues for select to authenticated using(user_id=(select auth.uid()));
create policy repayment_payments_owner on public.repayment_payments for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.repayment_plans,public.repayment_dues,public.repayment_payments from anon,authenticated;
grant select on public.repayment_plans,public.repayment_dues,public.repayment_payments to authenticated;

-- Backfill schedules using the exact historical principal/interest rounding.
insert into public.repayment_plans(user_id,account_id,title,kind,legacy_installment_id)
select user_id,credit_account_id,title,'installment',id from public.credit_card_installments;
insert into public.repayment_dues(plan_id,user_id,period,due_date,amount,confirmed)
select p.id,p.user_id,s.n,
  (i.start_month + make_interval(months=>s.n-1))::date
    + (least(i.due_day,extract(day from (i.start_month + make_interval(months=>s.n) - interval '1 day')))::integer-1),
  case when s.n=i.term_months then i.principal_amount-(i.principal_amount/i.term_months)*(i.term_months-1)
    else i.principal_amount/i.term_months end
  + case when i.interest_mode='monthly_flat' or (i.interest_mode='upfront' and s.n=1)
    then round(i.principal_amount::numeric*i.interest_rate_bps/10000)::bigint else 0 end,
  not exists(select 1 from public.credit_card_installment_payments x where x.installment_id=i.id)
from public.repayment_plans p join public.credit_card_installments i on i.id=p.legacy_installment_id
cross join lateral generate_series(1,i.term_months) s(n);
insert into public.repayment_plans(user_id,title,kind,legacy_payable_id)
select user_id,title,'manual',id from public.payables where kind='manual';
insert into public.repayment_dues(plan_id,user_id,period,due_date,amount,confirmed)
select p.id,p.user_id,1,x.due_date,x.amount,true from public.repayment_plans p join public.payables x on x.id=p.legacy_payable_id;
insert into public.repayment_payments(user_id,due_id,amount,paid_on,method,request_key)
select d.user_id,d.id,d.amount,x.paid_on,'history',gen_random_uuid() from public.repayment_dues d
join public.repayment_plans p on p.id=d.plan_id join public.payables x on x.id=p.legacy_payable_id where x.paid_on is not null;

create function public.create_repayment_plan(p_input jsonb,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); existing public.repayment_plans%rowtype; pid uuid; a uuid;
  first_due date; n integer; regular bigint; last_amount bigint; target date; i integer; kind text;
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
  insert into public.repayment_plans(user_id,account_id,title,kind,request_key,request_body)
    values(u,a,trim(p_input->>'title'),kind,p_key,p_input) returning id into pid;
  for i in 1..n loop
    target:=(date_trunc('month',first_due)+make_interval(months=>i-1))::date;
    target:=target+(least(extract(day from first_due),extract(day from(target+interval '1 month - 1 day')))::integer-1);
    insert into public.repayment_dues(plan_id,user_id,period,due_date,amount)
      values(pid,u,i,target,case when i=n then last_amount else regular end);
  end loop;
  return pid;
end $$;

create function public.record_repayment(p_due uuid,p_amount bigint,p_paid_on date,p_method text,p_source uuid,p_transaction uuid,p_key uuid)
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
  select * into d from public.repayment_dues where id=p_due and user_id=u for update;
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

create function public.reverse_repayment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select due_id into d from public.repayment_payments where id=p_id and user_id=auth.uid();
  if d is null then raise exception 'PAYMENT_NOT_FOUND'; end if;
  perform 1 from public.repayment_dues where id=d for update;
  update public.repayment_payments set reversed_at=coalesce(reversed_at,now()) where id=p_id and user_id=auth.uid();
end $$;

-- Require explicit unlinking before changing financial fields of a payment.
-- Metadata edits remain supported; reversal does not delete the cash transaction.
create function public.guard_repayment_transaction() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.repayment_payments where transaction_id=old.id and reversed_at is null)
    and (new.amount,new.type,new.account_id,new.destination_account_id,new.deleted_at,new.transaction_date)
      is distinct from (old.amount,old.type,old.account_id,old.destination_account_id,old.deleted_at,old.transaction_date)
    then raise exception 'TRANSACTION_HAS_REPAYMENTS'; end if;
  return new;
end $$;
create trigger transactions_repayment_guard before update on public.transactions for each row execute function public.guard_repayment_transaction();

create function public.save_repayment_budget(p_month date,p_income bigint,p_cash bigint,p_living bigint,p_reserve bigint,p_day integer,p_mode text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_month is null or extract(day from p_month)<>1 or p_mode is null or p_mode not in ('month','salary') then raise exception 'INVALID_MONTH'; end if;
  insert into public.income_allocation_months(user_id,month,planned_income,salary_day)
  values(auth.uid(),p_month,p_income,p_day)
  on conflict(user_id,month) do update set planned_income=excluded.planned_income,salary_day=excluded.salary_day;
  if p_mode='month' then
    update public.income_allocation_months set opening_cash=p_cash,living_budget=p_living,reserve_budget=p_reserve where user_id=auth.uid() and month=p_month;
  else
    update public.income_allocation_months set salary_opening_cash=p_cash,salary_living_budget=p_living,salary_reserve_budget=p_reserve where user_id=auth.uid() and month=p_month;
  end if;
end $$;

create or replace function public.update_financial_account_v2(
  p_account_id uuid, p_name text, p_type public.account_type, p_initial_balance bigint,
  p_credit_limit bigint default null, p_available_credit bigint default null,
  p_currency text default 'VND', p_icon text default null, p_color text default null,
  p_include_in_total boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.accounts%rowtype;
  v_opening bigint;
  v_current bigint;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'INVALID_ACCOUNT_NAME'; end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;
  select * into v_existing from public.accounts where id = p_account_id and user_id = v_user_id for update;
  if v_existing.id is null then raise exception 'INVALID_ACCOUNT'; end if;

  if v_existing.type <> p_type and exists(select 1 from public.repayment_plans where account_id=p_account_id) then raise exception 'ACCOUNT_HAS_REPAYMENT_PLAN'; end if;
  if p_type = 'credit_card' then
    if p_credit_limit is null or (p_credit_limit = 0 and v_existing.repayment_kind <> 'pay_later') or p_credit_limit < 0 or p_credit_limit > 1000000000000
      or p_available_credit is null or p_available_credit < -1000000000000
      or p_available_credit > p_credit_limit
    then raise exception 'INVALID_CREDIT_CARD_LIMIT'; end if;
    v_current := p_available_credit;
    v_opening := v_existing.initial_balance + (p_available_credit - v_existing.current_balance);
    if v_opening < -1000000000000 or v_opening > 1000000000000 then raise exception 'INVALID_AVAILABLE_CREDIT'; end if;
  else
    if p_initial_balance is null or p_initial_balance < 0 or p_initial_balance > 1000000000000
      or p_credit_limit is not null or p_available_credit is not null
    then raise exception 'INVALID_AMOUNT'; end if;
    v_opening := p_initial_balance;
    v_current := v_existing.current_balance + (p_initial_balance - v_existing.initial_balance);
  end if;

  update public.accounts set name = trim(p_name), type = p_type,
    initial_balance = v_opening, current_balance = v_current,
    credit_limit = case when p_type = 'credit_card' then p_credit_limit else null end,
    currency = p_currency, icon = p_icon, color = p_color,
    include_in_total = case when p_type = 'credit_card' then false else coalesce(p_include_in_total, true) end
  where id = p_account_id and user_id = v_user_id;
  return p_account_id;
end;
$$;
revoke all on function public.update_financial_account_v2(uuid, text, public.account_type, bigint, bigint, bigint, text, text, text, boolean) from public, anon;
grant execute on function public.update_financial_account_v2(uuid, text, public.account_type, bigint, bigint, bigint, text, text, text, boolean) to authenticated;


-- The new schedule is the write owner once cut over. Preserve legacy data,
create function public.create_repayment_source(p_input jsonb,p_key uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); existing public.accounts%rowtype; result uuid; lim bigint; debt bigint; kind text;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_key is null then raise exception 'INVALID_REQUEST'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text||p_key::text,0));
  select * into existing from public.accounts where user_id=u and repayment_request_key=p_key;
  if existing.id is not null then
    if existing.repayment_request_body is distinct from p_input then raise exception 'REQUEST_CONFLICT'; end if;
    return existing.id;
  end if;
  kind:=p_input->>'kind'; lim:=coalesce((p_input->>'limit')::bigint,0); debt:=(p_input->>'debt')::bigint;
  if kind is null or kind not in ('credit_card','pay_later') or debt is null or debt not between 0 and 1000000000000
    or lim not between 0 and 1000000000000 or (kind='credit_card' and lim=0) or lim-debt < -1000000000000
    then raise exception 'INVALID_SOURCE'; end if;
  if p_input->>'name' is null or length(trim(p_input->>'name')) not between 1 and 80 then raise exception 'INVALID_SOURCE'; end if;
  if kind='pay_later' then
    -- Credit-limit zero means not supplied for a pay-later provider. The
    -- available-credit baseline may be negative to represent opening debt.
    insert into public.accounts(user_id,name,type,initial_balance,current_balance,credit_limit,include_in_total)
      values(u,trim(p_input->>'name'),'credit_card',lim-debt,lim-debt,lim,false) returning id into result;
  else
    result:=public.create_financial_account_v2(trim(p_input->>'name'),'credit_card'::public.account_type,0,lim,lim-debt,'VND',null,null,false);
  end if;
  update public.accounts set repayment_kind=kind,repayment_request_key=p_key,repayment_request_body=p_input where id=result;
  return result;
end $$;
revoke all on function public.create_repayment_source(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.create_repayment_source(jsonb,uuid) to authenticated;

-- prevent stale old forms from deleting contracts and their financial evidence.
revoke insert,update,delete on public.credit_card_installments,public.payables from authenticated;
revoke execute on function public.pay_credit_card_installment(uuid,uuid,bigint,uuid) from authenticated;
revoke execute on function public.delete_payables(uuid[]) from authenticated;

revoke all on function public.create_repayment_plan(jsonb,uuid),public.record_repayment(uuid,bigint,date,text,uuid,uuid,uuid),
  public.reverse_repayment(uuid),public.guard_repayment_transaction(),public.save_repayment_budget(date,bigint,bigint,bigint,bigint,integer,text) from public,anon,authenticated;
grant execute on function public.create_repayment_plan(jsonb,uuid),public.record_repayment(uuid,bigint,date,text,uuid,uuid,uuid),
  public.reverse_repayment(uuid),public.save_repayment_budget(date,bigint,bigint,bigint,bigint,integer,text) to authenticated;
notify pgrst,'reload schema';
commit;
