-- Financial mutations must go through these SECURITY DEFINER functions so the
-- transaction row and every cached account balance change commit atomically.

create or replace function public.apply_transaction_balance_effect(
  p_type public.transaction_type,
  p_amount bigint,
  p_account_id uuid,
  p_destination_account_id uuid,
  p_direction integer
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_direction not in (-1, 1) then raise exception 'INVALID_DIRECTION'; end if;
  if p_type = 'expense' then
    update public.accounts set current_balance = current_balance - (p_amount * p_direction) where id = p_account_id;
  elsif p_type = 'income' then
    update public.accounts set current_balance = current_balance + (p_amount * p_direction) where id = p_account_id;
  else
    update public.accounts set current_balance = current_balance - (p_amount * p_direction) where id = p_account_id;
    update public.accounts set current_balance = current_balance + (p_amount * p_direction) where id = p_destination_account_id;
  end if;
end; $$;

revoke all on function public.apply_transaction_balance_effect(public.transaction_type, bigint, uuid, uuid, integer) from public, anon, authenticated;

create or replace function public.create_financial_transaction(
  p_type public.transaction_type, p_amount bigint, p_account_id uuid, p_destination_account_id uuid default null,
  p_category_id uuid default null, p_merchant text default null, p_note text default null,
  p_transaction_date timestamptz default now(), p_idempotency_key uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_type = 'transfer' and (p_destination_account_id is null or p_destination_account_id = p_account_id) then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if p_type <> 'transfer' and p_destination_account_id is not null then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id) then raise exception 'INVALID_ACCOUNT'; end if;
  if p_destination_account_id is not null and not exists (select 1 from public.accounts where id = p_destination_account_id and user_id = v_user_id) then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if p_category_id is not null and not exists (select 1 from public.categories where id = p_category_id and (user_id is null or user_id = v_user_id) and type::text = p_type::text) then raise exception 'INVALID_CATEGORY'; end if;
  if p_type = 'transfer' and p_category_id is not null then raise exception 'INVALID_CATEGORY'; end if;
  if p_idempotency_key is not null then select id into v_id from public.transactions where user_id = v_user_id and idempotency_key = p_idempotency_key; if v_id is not null then return v_id; end if; end if;
  perform 1 from public.accounts where id in (p_account_id, p_destination_account_id) order by id for update;
  insert into public.transactions(user_id, type, amount, account_id, destination_account_id, category_id, merchant, note, transaction_date, idempotency_key)
  values (v_user_id, p_type, p_amount, p_account_id, p_destination_account_id, p_category_id, nullif(trim(p_merchant), ''), nullif(trim(p_note), ''), p_transaction_date, p_idempotency_key) returning id into v_id;
  perform public.apply_transaction_balance_effect(p_type, p_amount, p_account_id, p_destination_account_id, 1);
  return v_id;
end; $$;

create or replace function public.update_financial_transaction(
  p_transaction_id uuid, p_type public.transaction_type, p_amount bigint, p_account_id uuid,
  p_destination_account_id uuid default null, p_category_id uuid default null, p_merchant text default null,
  p_note text default null, p_transaction_date timestamptz default now()
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_old public.transactions%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_old from public.transactions where id = p_transaction_id for update;
  if v_old.id is null or v_old.user_id <> v_user_id then raise exception 'TRANSACTION_NOT_FOUND'; end if;
  if v_old.deleted_at is not null then raise exception 'TRANSACTION_DELETED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_type = 'transfer' and (p_destination_account_id is null or p_destination_account_id = p_account_id) then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if p_type <> 'transfer' and p_destination_account_id is not null then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id) then raise exception 'INVALID_ACCOUNT'; end if;
  if p_destination_account_id is not null and not exists (select 1 from public.accounts where id = p_destination_account_id and user_id = v_user_id) then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if p_category_id is not null and not exists (select 1 from public.categories where id = p_category_id and (user_id is null or user_id = v_user_id) and type::text = p_type::text) then raise exception 'INVALID_CATEGORY'; end if;
  if p_type = 'transfer' and p_category_id is not null then raise exception 'INVALID_CATEGORY'; end if;
  perform 1 from public.accounts where id in (v_old.account_id, v_old.destination_account_id, p_account_id, p_destination_account_id) order by id for update;
  perform public.apply_transaction_balance_effect(v_old.type, v_old.amount, v_old.account_id, v_old.destination_account_id, -1);
  perform public.apply_transaction_balance_effect(p_type, p_amount, p_account_id, p_destination_account_id, 1);
  update public.transactions set type = p_type, amount = p_amount, account_id = p_account_id, destination_account_id = p_destination_account_id,
    category_id = p_category_id, merchant = nullif(trim(p_merchant), ''), note = nullif(trim(p_note), ''), transaction_date = p_transaction_date
  where id = p_transaction_id;
  return p_transaction_id;
end; $$;

create or replace function public.soft_delete_financial_transaction(p_transaction_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_old public.transactions%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_old from public.transactions where id = p_transaction_id for update;
  if v_old.id is null or v_old.user_id <> v_user_id then raise exception 'TRANSACTION_NOT_FOUND'; end if;
  if v_old.deleted_at is not null then return p_transaction_id; end if;
  perform 1 from public.accounts where id in (v_old.account_id, v_old.destination_account_id) order by id for update;
  perform public.apply_transaction_balance_effect(v_old.type, v_old.amount, v_old.account_id, v_old.destination_account_id, -1);
  update public.transactions set deleted_at = now() where id = p_transaction_id;
  return p_transaction_id;
end; $$;

create or replace function public.restore_financial_transaction(p_transaction_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_old public.transactions%rowtype;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_old from public.transactions where id = p_transaction_id for update;
  if v_old.id is null or v_old.user_id <> v_user_id then raise exception 'TRANSACTION_NOT_FOUND'; end if;
  if v_old.deleted_at is null then return p_transaction_id; end if;
  if not exists (select 1 from public.accounts where id = v_old.account_id and user_id = v_user_id) then raise exception 'INVALID_ACCOUNT'; end if;
  if v_old.destination_account_id is not null and not exists (select 1 from public.accounts where id = v_old.destination_account_id and user_id = v_user_id) then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  perform 1 from public.accounts where id in (v_old.account_id, v_old.destination_account_id) order by id for update;
  perform public.apply_transaction_balance_effect(v_old.type, v_old.amount, v_old.account_id, v_old.destination_account_id, 1);
  update public.transactions set deleted_at = null where id = p_transaction_id;
  return p_transaction_id;
end; $$;

create or replace function public.create_financial_account(
  p_name text, p_type public.account_type, p_initial_balance bigint default 0,
  p_currency text default 'VND', p_icon text default null, p_color text default null,
  p_include_in_total boolean default true
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'INVALID_ACCOUNT_NAME'; end if;
  if p_initial_balance is null or p_initial_balance < 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_currency !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;
  insert into public.accounts(user_id, name, type, initial_balance, current_balance, currency, icon, color, include_in_total)
  values (v_user_id, trim(p_name), p_type, p_initial_balance, p_initial_balance, p_currency, p_icon, p_color, p_include_in_total)
  returning id into v_id;
  return v_id;
end; $$;

revoke insert, update, delete on public.transactions from authenticated;
revoke insert, update, delete on public.accounts from authenticated;
grant update (name, type, currency, icon, color, is_archived, include_in_total) on public.accounts to authenticated;
grant execute on function public.create_financial_account(text, public.account_type, bigint, text, text, text, boolean) to authenticated;
grant execute on function public.update_financial_transaction(uuid, public.transaction_type, bigint, uuid, uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.soft_delete_financial_transaction(uuid) to authenticated;
grant execute on function public.restore_financial_transaction(uuid) to authenticated;
