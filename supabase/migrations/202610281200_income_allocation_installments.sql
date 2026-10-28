begin;

create table public.credit_card_installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  credit_account_id uuid not null references public.accounts(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  total_amount bigint not null check (total_amount between 1 and 1000000000000),
  term_months integer not null check (term_months between 1 and 120),
  start_month date not null check (extract(day from start_month) = 1),
  due_day integer not null check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index credit_card_installments_user_card_idx on public.credit_card_installments(user_id, credit_account_id);
create trigger credit_card_installments_set_updated_at before update on public.credit_card_installments
  for each row execute function public.set_updated_at();
create or replace function public.guard_credit_card_installment_update()
returns trigger language plpgsql set search_path = '' as $$
declare v_paid bigint;
begin
  if old.user_id <> new.user_id then raise exception 'INVALID_INSTALLMENT_OWNER'; end if;
  select coalesce(sum(t.amount), 0)::bigint into v_paid
    from public.credit_card_installment_payments p
    join public.transactions t on t.id = p.transaction_id
    where p.installment_id = old.id and t.deleted_at is null
      and t.type = 'transfer' and t.destination_account_id = old.credit_account_id;
  if v_paid > 0 and old.credit_account_id <> new.credit_account_id
    then raise exception 'INSTALLMENT_CARD_LOCKED'; end if;
  if new.total_amount < v_paid then raise exception 'INSTALLMENT_BELOW_PAID'; end if;
  return new;
end;
$$;
create trigger credit_card_installments_guard_update before update on public.credit_card_installments
  for each row execute function public.guard_credit_card_installment_update();
alter table public.credit_card_installments enable row level security;
grant select, insert, update, delete on public.credit_card_installments to authenticated;
create policy credit_card_installments_select on public.credit_card_installments for select to authenticated
  using (user_id = (select auth.uid()));
create policy credit_card_installments_insert on public.credit_card_installments for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.accounts a where a.id = credit_account_id and a.user_id = (select auth.uid()) and a.type = 'credit_card'));
create policy credit_card_installments_update on public.credit_card_installments for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and exists (
    select 1 from public.accounts a where a.id = credit_account_id and a.user_id = (select auth.uid()) and a.type = 'credit_card'));
create policy credit_card_installments_delete on public.credit_card_installments for delete to authenticated
  using (user_id = (select auth.uid()));

-- A payment is an existing transfer, never a second expense. Its amount and
-- deleted_at state remain the source of truth when transactions are edited.
create table public.credit_card_installment_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  installment_id uuid not null references public.credit_card_installments(id) on delete cascade,
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index credit_card_installment_payments_installment_idx on public.credit_card_installment_payments(installment_id);
alter table public.credit_card_installment_payments enable row level security;
grant select on public.credit_card_installment_payments to authenticated;
create policy credit_card_installment_payments_select on public.credit_card_installment_payments for select to authenticated
  using (user_id = (select auth.uid()));
revoke insert, update, delete on public.credit_card_installment_payments from authenticated;

create or replace function public.guard_installment_payment_transaction()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_installment public.credit_card_installments%rowtype;
  v_other_paid bigint;
begin
  select i.* into v_installment from public.credit_card_installments i
    join public.credit_card_installment_payments p on p.installment_id = i.id
    where p.transaction_id = old.id;
  if v_installment.id is null then return new; end if;
  if new.type <> 'transfer' or new.destination_account_id is distinct from v_installment.credit_account_id then
    delete from public.credit_card_installment_payments where transaction_id = old.id;
    return new;
  end if;
  if new.deleted_at is not null then return new; end if;
  select coalesce(sum(t.amount), 0)::bigint into v_other_paid
    from public.credit_card_installment_payments p
    join public.transactions t on t.id = p.transaction_id
    where p.installment_id = v_installment.id and p.transaction_id <> old.id
      and t.deleted_at is null and t.type = 'transfer' and t.destination_account_id = v_installment.credit_account_id;
  if new.amount > v_installment.total_amount - v_other_paid then raise exception 'INSTALLMENT_BELOW_PAID'; end if;
  return new;
end;
$$;
revoke all on function public.guard_installment_payment_transaction() from public, anon, authenticated;
create trigger transactions_guard_installment_payment before update of type, amount, destination_account_id, deleted_at
  on public.transactions for each row execute function public.guard_installment_payment_transaction();

create table public.income_allocation_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  planned_income bigint check (planned_income between 0 and 1000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);
create trigger income_allocation_months_set_updated_at before update on public.income_allocation_months
  for each row execute function public.set_updated_at();
alter table public.income_allocation_months enable row level security;
grant select on public.income_allocation_months to authenticated;
create policy income_allocation_months_select on public.income_allocation_months for select to authenticated
  using (user_id = (select auth.uid()));

create table public.income_allocation_lines (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.income_allocation_months(id) on delete cascade,
  kind text not null check (kind in ('living', 'debt', 'reserve', 'custom', 'card_installment', 'card_repayment')),
  title text not null check (length(trim(title)) between 1 and 100),
  amount bigint not null check (amount between 0 and 1000000000000),
  installment_id uuid references public.credit_card_installments(id) on delete cascade,
  credit_account_id uuid references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  goal_id uuid references public.saving_goals(id) on delete set null,
  payable_id uuid references public.payables(id) on delete set null,
  sort_order integer not null default 0,
  check ((kind = 'card_installment') = (installment_id is not null)),
  check ((kind = 'card_repayment') = (credit_account_id is not null)),
  check (category_id is null or kind in ('living', 'debt', 'custom')),
  check (goal_id is null or kind = 'reserve'),
  check (payable_id is null or kind = 'debt'),
  check (category_id is null or goal_id is null),
  check (category_id is null or payable_id is null)
);
create unique index income_allocation_lines_installment_idx on public.income_allocation_lines(month_id, installment_id)
  where installment_id is not null;
create unique index income_allocation_lines_card_idx on public.income_allocation_lines(month_id, credit_account_id)
  where credit_account_id is not null;
create unique index income_allocation_lines_category_idx on public.income_allocation_lines(month_id, category_id)
  where category_id is not null;
create unique index income_allocation_lines_goal_idx on public.income_allocation_lines(month_id, goal_id)
  where goal_id is not null;
create unique index income_allocation_lines_payable_idx on public.income_allocation_lines(month_id, payable_id)
  where payable_id is not null;
create unique index income_allocation_lines_living_default_idx on public.income_allocation_lines(month_id)
  where kind = 'living' and category_id is null;
create unique index income_allocation_lines_reserve_default_idx on public.income_allocation_lines(month_id)
  where kind = 'reserve' and goal_id is null;
alter table public.income_allocation_lines enable row level security;
grant select on public.income_allocation_lines to authenticated;
create policy income_allocation_lines_select on public.income_allocation_lines for select to authenticated
  using (exists (select 1 from public.income_allocation_months m where m.id = month_id and m.user_id = (select auth.uid())));

-- Replace a monthly plan as one transaction, including a copied plan.
create or replace function public.save_income_allocation(
  p_month date, p_planned_income bigint, p_lines jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_month_id uuid;
  v_line jsonb;
  v_kind text;
  v_title text;
  v_amount bigint;
  v_installment_id uuid;
  v_credit_account_id uuid;
  v_category_id uuid;
  v_goal_id uuid;
  v_payable_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_month is null or extract(day from p_month) <> 1 or p_month < date '1900-01-01' or p_month > date '2100-12-01'
    or (p_planned_income is not null and (p_planned_income < 0 or p_planned_income > 1000000000000))
    or p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 100
  then raise exception 'INVALID_ALLOCATION'; end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_kind := v_line->>'kind';
    v_title := trim(v_line->>'title');
    v_amount := (v_line->>'amount')::bigint;
    v_installment_id := nullif(v_line->>'installmentId', '')::uuid;
    v_credit_account_id := nullif(v_line->>'creditAccountId', '')::uuid;
    v_category_id := nullif(v_line->>'categoryId', '')::uuid;
    v_goal_id := nullif(v_line->>'goalId', '')::uuid;
    v_payable_id := nullif(v_line->>'payableId', '')::uuid;
    if v_kind not in ('living', 'debt', 'reserve', 'custom', 'card_installment', 'card_repayment')
      or v_title is null or length(v_title) not between 1 and 100
      or v_amount is null or v_amount < 0 or v_amount > 1000000000000
      or ((v_kind = 'card_installment') <> (v_installment_id is not null))
      or ((v_kind = 'card_repayment') <> (v_credit_account_id is not null))
      or (v_category_id is not null and v_kind not in ('living', 'debt', 'custom'))
      or (v_goal_id is not null and v_kind <> 'reserve')
      or (v_category_id is not null and v_goal_id is not null)
      or (v_payable_id is not null and (v_kind <> 'debt' or v_category_id is not null))
    then raise exception 'INVALID_ALLOCATION_LINE'; end if;
    if v_installment_id is not null and not exists (
      select 1 from public.credit_card_installments i where i.id = v_installment_id and i.user_id = v_user_id
    ) then raise exception 'INVALID_INSTALLMENT'; end if;
    if v_credit_account_id is not null and not exists (
      select 1 from public.accounts a where a.id = v_credit_account_id and a.user_id = v_user_id and a.type = 'credit_card'
    ) then raise exception 'INVALID_CREDIT_CARD'; end if;
    if v_category_id is not null and not exists (
      select 1 from public.categories c where c.id = v_category_id
        and (c.user_id is null or c.user_id = v_user_id) and c.type = 'expense'
    ) then raise exception 'INVALID_CATEGORY'; end if;
    if v_goal_id is not null and not exists (
      select 1 from public.saving_goals g where g.id = v_goal_id and g.user_id = v_user_id
    ) then raise exception 'INVALID_GOAL'; end if;
    if v_payable_id is not null and not exists (
      select 1 from public.payables p where p.id = v_payable_id and p.user_id = v_user_id and p.kind = 'manual'
    ) then raise exception 'INVALID_PAYABLE'; end if;
  end loop;
  insert into public.income_allocation_months(user_id, month, planned_income)
    values (v_user_id, p_month, p_planned_income)
    on conflict (user_id, month) do update set planned_income = excluded.planned_income, updated_at = now()
    returning id into v_month_id;
  delete from public.income_allocation_lines where month_id = v_month_id;
  insert into public.income_allocation_lines(month_id, kind, title, amount, installment_id, credit_account_id, category_id, goal_id, payable_id, sort_order)
  select v_month_id, value->>'kind', trim(value->>'title'), (value->>'amount')::bigint,
    nullif(value->>'installmentId', '')::uuid, nullif(value->>'creditAccountId', '')::uuid, nullif(value->>'categoryId', '')::uuid,
    nullif(value->>'goalId', '')::uuid, nullif(value->>'payableId', '')::uuid, ordinality::integer
  from jsonb_array_elements(p_lines) with ordinality;
  return v_month_id;
end;
$$;
revoke all on function public.save_income_allocation(date, bigint, jsonb) from public, anon;
grant execute on function public.save_income_allocation(date, bigint, jsonb) to authenticated;

create or replace function public.pay_credit_card_installment(
  p_installment_id uuid, p_source_account_id uuid, p_amount bigint, p_idempotency_key uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_installment public.credit_card_installments%rowtype;
  v_paid bigint;
  v_transaction_id uuid;
  v_existing public.transactions%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount is null or p_amount <= 0 or p_idempotency_key is null then raise exception 'INVALID_REPAYMENT'; end if;
  select * into v_existing from public.transactions t
    where t.user_id = v_user_id and t.idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.deleted_at is not null or v_existing.type <> 'transfer'
      or v_existing.account_id <> p_source_account_id or v_existing.amount <> p_amount
      or not exists (select 1 from public.credit_card_installment_payments p
        join public.credit_card_installments i on i.id = p.installment_id
        where p.transaction_id = v_existing.id and p.installment_id = p_installment_id
          and v_existing.destination_account_id = i.credit_account_id)
    then raise exception 'REPAYMENT_ALREADY_LINKED'; end if;
    return v_existing.id;
  end if;
  select * into v_installment from public.credit_card_installments
    where id = p_installment_id and user_id = v_user_id for update;
  if v_installment.id is null then raise exception 'INVALID_INSTALLMENT'; end if;
  if not exists (select 1 from public.accounts a where a.id = p_source_account_id
    and a.user_id = v_user_id and a.type <> 'credit_card' and not a.is_archived)
  then raise exception 'INVALID_REPAYMENT_ACCOUNT'; end if;
  select coalesce(sum(t.amount), 0)::bigint into v_paid
    from public.credit_card_installment_payments p
    join public.transactions t on t.id = p.transaction_id
    where p.installment_id = p_installment_id and t.deleted_at is null
      and t.type = 'transfer' and t.destination_account_id = v_installment.credit_account_id;
  if p_amount > v_installment.total_amount - v_paid then raise exception 'REPAYMENT_EXCEEDS_INSTALLMENT'; end if;
  v_transaction_id := public.pay_credit_card(v_installment.credit_account_id, p_source_account_id, p_amount, p_idempotency_key);
  insert into public.credit_card_installment_payments(user_id, installment_id, transaction_id)
    values (v_user_id, p_installment_id, v_transaction_id)
    on conflict (transaction_id) do nothing;
  if not exists (select 1 from public.credit_card_installment_payments
    where installment_id = p_installment_id and transaction_id = v_transaction_id)
  then raise exception 'REPAYMENT_ALREADY_LINKED'; end if;
  return v_transaction_id;
end;
$$;
revoke all on function public.pay_credit_card_installment(uuid, uuid, bigint, uuid) from public, anon;
grant execute on function public.pay_credit_card_installment(uuid, uuid, bigint, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
