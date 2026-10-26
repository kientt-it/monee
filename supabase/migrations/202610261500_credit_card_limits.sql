begin;

alter table public.accounts add column credit_limit bigint;
-- Older cards could have been created with an opening balance of zero.
-- Keep that value as an unset legacy limit until the owner enters a real limit.
update public.accounts set credit_limit = initial_balance where type = 'credit_card';
alter table public.accounts drop constraint accounts_initial_balance_check;
alter table public.accounts add constraint accounts_opening_balance_check
  check ((type = 'credit_card' and initial_balance between -1000000000000 and 1000000000000)
    or (type <> 'credit_card' and initial_balance between 0 and 1000000000000));
alter table public.accounts add constraint accounts_credit_limit_check
  check ((type = 'credit_card' and credit_limit between 0 and 1000000000000)
    or (type <> 'credit_card' and credit_limit is null));

-- initial_balance stays the reconciliation baseline; credit_limit is the card limit.
-- current_balance is the available credit after transactions and repayments.
create or replace function public.create_financial_account_v2(
  p_name text, p_type public.account_type, p_initial_balance bigint,
  p_credit_limit bigint default null, p_available_credit bigint default null,
  p_currency text default 'VND', p_icon text default null, p_color text default null,
  p_include_in_total boolean default true
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
  v_opening bigint;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'INVALID_ACCOUNT_NAME'; end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;
  if p_type = 'credit_card' then
    if p_credit_limit is null or p_credit_limit < 1 or p_credit_limit > 1000000000000
      or p_available_credit is null or p_available_credit < -1000000000000
      or p_available_credit > p_credit_limit
    then raise exception 'INVALID_CREDIT_CARD_LIMIT'; end if;
    v_opening := p_available_credit;
  else
    if p_initial_balance is null or p_initial_balance < 0 or p_initial_balance > 1000000000000
      or p_credit_limit is not null or p_available_credit is not null
    then raise exception 'INVALID_AMOUNT'; end if;
    v_opening := p_initial_balance;
  end if;
  insert into public.accounts(user_id, name, type, initial_balance, current_balance, credit_limit,
    currency, icon, color, include_in_total)
  values (v_user_id, trim(p_name), p_type, v_opening, v_opening,
    case when p_type = 'credit_card' then p_credit_limit else null end,
    p_currency, p_icon, p_color, case when p_type = 'credit_card' then false else coalesce(p_include_in_total, true) end)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_financial_account_v2(text, public.account_type, bigint, bigint, bigint, text, text, text, boolean) from public, anon;
grant execute on function public.create_financial_account_v2(text, public.account_type, bigint, bigint, bigint, text, text, text, boolean) to authenticated;

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

  if p_type = 'credit_card' then
    if p_credit_limit is null or p_credit_limit < 1 or p_credit_limit > 1000000000000
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

create or replace function public.sync_credit_card_payable()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  outstanding numeric;
begin
  if new.type <> 'credit_card' then
    delete from public.payables where credit_account_id = new.id and kind = 'credit_card_repayment';
    return new;
  end if;
  outstanding := greatest(0, new.credit_limit::numeric - new.current_balance::numeric);
  if outstanding > 9007199254740991 then raise exception 'CREDIT_CARD_BALANCE_TOO_LARGE'; end if;
  insert into public.payables (user_id, kind, credit_account_id, title, amount, due_date, note)
  values (new.user_id, 'credit_card_repayment', new.id,
    left('Hoàn trả thẻ tín dụng · ' || new.name, 100), outstanding::bigint, null, '')
  on conflict (credit_account_id) do update set title = excluded.title,
    amount = excluded.amount, updated_at = now();
  return new;
end;
$$;
drop trigger accounts_sync_credit_card_payable on public.accounts;
create trigger accounts_sync_credit_card_payable
after insert or update of type, name, initial_balance, current_balance, credit_limit on public.accounts
for each row execute function public.sync_credit_card_payable();

update public.payables p set amount = greatest(0, a.credit_limit::numeric - a.current_balance::numeric)::bigint,
  updated_at = now()
from public.accounts a where p.credit_account_id = a.id and p.kind = 'credit_card_repayment';

create or replace function public.pay_credit_card(
  p_card_id uuid, p_source_account_id uuid, p_amount bigint, p_idempotency_key uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  card public.accounts%rowtype;
  source_account public.accounts%rowtype;
  existing_id uuid;
  transaction_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount is null or p_amount <= 0 or p_idempotency_key is null
    or p_card_id is null or p_source_account_id is null or p_card_id = p_source_account_id
  then raise exception 'INVALID_REPAYMENT'; end if;
  select id into existing_id from public.transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if existing_id is not null then return existing_id; end if;
  perform 1 from public.accounts where id in (p_card_id, p_source_account_id)
    and user_id = v_user_id order by id for update;
  select id into existing_id from public.transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if existing_id is not null then return existing_id; end if;
  select * into card from public.accounts where id = p_card_id and user_id = v_user_id;
  select * into source_account from public.accounts where id = p_source_account_id and user_id = v_user_id;
  if card.id is null or card.type <> 'credit_card' or source_account.id is null or source_account.is_archived
  then raise exception 'INVALID_REPAYMENT_ACCOUNT'; end if;
  if p_amount::numeric > greatest(0, card.credit_limit::numeric - card.current_balance::numeric)
  then raise exception 'REPAYMENT_EXCEEDS_DUE'; end if;
  transaction_id := public.create_financial_transaction(
    'transfer'::public.transaction_type, p_amount, p_source_account_id, p_card_id,
    null, 'Hoàn trả thẻ tín dụng', null, now(), p_idempotency_key
  );
  return transaction_id;
end;
$$;

notify pgrst, 'reload schema';
commit;
