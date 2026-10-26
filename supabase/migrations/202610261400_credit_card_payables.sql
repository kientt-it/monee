begin;

alter table public.payables
  add column kind text not null default 'manual',
  add column credit_account_id uuid references public.accounts(id) on delete cascade;
alter table public.payables alter column due_date drop not null;
alter table public.payables drop constraint payables_amount_check;
alter table public.payables add constraint payables_kind_check
  check (kind in ('manual', 'credit_card_repayment'));
alter table public.payables add constraint payables_amount_by_kind_check
  check ((kind = 'manual' and amount between 1 and 1000000000000)
    or (kind = 'credit_card_repayment' and amount between 0 and 9007199254740991));
alter table public.payables add constraint payables_source_by_kind_check
  check ((kind = 'manual' and due_date is not null and credit_account_id is null)
    or (kind = 'credit_card_repayment' and due_date is null and credit_account_id is not null and paid_on is null));
create unique index payables_credit_account_unique_idx on public.payables(credit_account_id);

-- Manual items can be edited; credit-card repayment totals come only from card balances.
drop policy payables_insert_own on public.payables;
create policy payables_insert_own on public.payables for insert to authenticated
  with check (user_id = (select auth.uid()) and kind = 'manual');
drop policy payables_update_own on public.payables;
create policy payables_update_own on public.payables for update to authenticated
  using (user_id = (select auth.uid()) and kind = 'manual')
  with check (user_id = (select auth.uid()) and kind = 'manual');
drop policy payables_delete_own on public.payables;
create policy payables_delete_own on public.payables for delete to authenticated
  using (user_id = (select auth.uid()) and kind = 'manual');
revoke insert, update on public.payables from authenticated;
grant insert (user_id, title, amount, due_date, note, paid_on, updated_at) on public.payables to authenticated;
grant update (title, amount, due_date, note, paid_on, updated_at) on public.payables to authenticated;

-- Credit limits are initial_balance; current_balance is the available limit.
update public.accounts set include_in_total = false where type = 'credit_card' and include_in_total;
create or replace function public.exclude_credit_card_from_assets()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.type = 'credit_card' then new.include_in_total := false; end if;
  return new;
end;
$$;
revoke all on function public.exclude_credit_card_from_assets() from public, anon, authenticated;
create trigger accounts_exclude_credit_card_from_assets
before insert or update of type, include_in_total on public.accounts
for each row execute function public.exclude_credit_card_from_assets();

create or replace function public.sync_credit_card_payable()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  outstanding numeric;
begin
  if new.type <> 'credit_card' then
    delete from public.payables where credit_account_id = new.id and kind = 'credit_card_repayment';
    return new;
  end if;

  outstanding := greatest(0, new.initial_balance::numeric - new.current_balance::numeric);
  if outstanding > 9007199254740991 then raise exception 'CREDIT_CARD_BALANCE_TOO_LARGE'; end if;
  insert into public.payables (user_id, kind, credit_account_id, title, amount, due_date, note)
  values (new.user_id, 'credit_card_repayment', new.id,
    left('Hoàn trả thẻ tín dụng · ' || new.name, 100), outstanding::bigint, null, '')
  on conflict (credit_account_id) do update set
    title = excluded.title,
    amount = excluded.amount,
    updated_at = now();
  return new;
end;
$$;
revoke all on function public.sync_credit_card_payable() from public, anon, authenticated;
create trigger accounts_sync_credit_card_payable
after insert or update of type, name, initial_balance, current_balance on public.accounts
for each row execute function public.sync_credit_card_payable();

-- Backfill one item for every existing card, including cards with zero debt.
insert into public.payables (user_id, kind, credit_account_id, title, amount, due_date, note)
select user_id, 'credit_card_repayment', id,
  left('Hoàn trả thẻ tín dụng · ' || name, 100),
  greatest(0, initial_balance::numeric - current_balance::numeric)::bigint, null, ''
from public.accounts where type = 'credit_card'
on conflict (credit_account_id) do update set
  title = excluded.title,
  amount = excluded.amount,
  updated_at = now();

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

  perform 1 from public.accounts
  where id in (p_card_id, p_source_account_id) and user_id = v_user_id order by id for update;
  select id into existing_id from public.transactions
  where user_id = v_user_id and idempotency_key = p_idempotency_key;
  if existing_id is not null then return existing_id; end if;
  select * into card from public.accounts where id = p_card_id and user_id = v_user_id;
  select * into source_account from public.accounts where id = p_source_account_id and user_id = v_user_id;
  if card.id is null or card.type <> 'credit_card' or source_account.id is null or source_account.is_archived
  then raise exception 'INVALID_REPAYMENT_ACCOUNT'; end if;
  if p_amount::numeric > greatest(0, card.initial_balance::numeric - card.current_balance::numeric)
  then raise exception 'REPAYMENT_EXCEEDS_DUE'; end if;

  transaction_id := public.create_financial_transaction(
    'transfer'::public.transaction_type, p_amount, p_source_account_id, p_card_id,
    null, 'Hoàn trả thẻ tín dụng', null, now(), p_idempotency_key
  );
  return transaction_id;
end;
$$;
revoke all on function public.pay_credit_card(uuid, uuid, bigint, uuid) from public, anon;
grant execute on function public.pay_credit_card(uuid, uuid, bigint, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
