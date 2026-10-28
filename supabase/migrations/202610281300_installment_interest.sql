begin;

-- The existing total_amount is the total repayable. Preserve the original
-- principal for existing interest-free installments.
alter table public.credit_card_installments
  add column principal_amount bigint,
  add column interest_mode text not null default 'none',
  add column interest_rate_bps integer not null default 0;
update public.credit_card_installments set principal_amount = total_amount;
alter table public.credit_card_installments
  alter column principal_amount set not null,
  add constraint credit_card_installments_principal_amount_check
    check (principal_amount between 1 and 1000000000000),
  add constraint credit_card_installments_interest_check
    check ((interest_mode = 'none' and interest_rate_bps = 0)
      or (interest_mode in ('upfront', 'monthly_flat') and interest_rate_bps between 1 and 10000));
alter table public.credit_card_installments drop constraint credit_card_installments_total_amount_check;
alter table public.credit_card_installments add constraint credit_card_installments_total_amount_check
  check (total_amount between 1 and 9007199254740991);
alter table public.income_allocation_lines drop constraint income_allocation_lines_amount_check;
alter table public.income_allocation_lines add constraint income_allocation_lines_amount_check
  check (amount between 0 and 9007199254740991);

create or replace function public.sync_credit_card_installment_total()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_interest_per_month bigint;
begin
  if new.principal_amount is null and new.total_amount is not null then
    new.principal_amount := new.total_amount;
  end if;
  if new.principal_amount is null or new.principal_amount < 1 or new.principal_amount > 1000000000000
    or new.term_months is null or new.term_months not between 1 and 120
    or new.interest_rate_bps is null
    or not ((new.interest_mode = 'none' and new.interest_rate_bps = 0)
      or (new.interest_mode in ('upfront', 'monthly_flat') and new.interest_rate_bps between 1 and 10000))
  then raise exception 'INVALID_INSTALLMENT_INTEREST'; end if;
  v_interest_per_month := round(new.principal_amount::numeric * new.interest_rate_bps / 10000)::bigint;
  new.total_amount := new.principal_amount + case new.interest_mode
    when 'upfront' then v_interest_per_month
    when 'monthly_flat' then v_interest_per_month * new.term_months
    else 0 end;
  return new;
end;
$$;
revoke all on function public.sync_credit_card_installment_total() from public, anon, authenticated;
-- Alphabetical trigger order makes the calculated total available to the
-- existing update guard before it checks how much was already paid.
create trigger a_credit_card_installments_sync_total
  before insert or update on public.credit_card_installments
  for each row execute function public.sync_credit_card_installment_total();

-- A month can include several overdue installments. Keep the same safe
-- integer range in the RPC, table constraint, and application validator.
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
      or v_amount is null or v_amount < 0 or v_amount > 9007199254740991
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

-- Remove untouched zero-value placeholders saved by the previous UI. Keep
-- nonzero plans that a user explicitly edited.
delete from public.income_allocation_lines
where kind = 'card_repayment' and amount = 0;

notify pgrst, 'reload schema';
commit;
