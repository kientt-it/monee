begin;

create or replace function public.update_financial_account(
  p_account_id uuid,
  p_name text,
  p_type public.account_type,
  p_initial_balance bigint,
  p_currency text default 'VND',
  p_icon text default null,
  p_color text default null,
  p_include_in_total boolean default true
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.accounts%rowtype;
  v_delta bigint;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'INVALID_ACCOUNT_NAME'; end if;
  if p_initial_balance is null or p_initial_balance < 0 or p_initial_balance > 1000000000000 then raise exception 'INVALID_AMOUNT'; end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then raise exception 'INVALID_CURRENCY'; end if;

  select *
    into v_existing
    from public.accounts
   where id = p_account_id
     and user_id = v_user_id
   for update;

  if not found then raise exception 'INVALID_ACCOUNT'; end if;

  v_delta := p_initial_balance - v_existing.initial_balance;

  update public.accounts
     set name = trim(p_name),
         type = p_type,
         initial_balance = p_initial_balance,
         current_balance = current_balance + v_delta,
         currency = p_currency,
         icon = p_icon,
         color = p_color,
         include_in_total = coalesce(p_include_in_total, true),
         updated_at = now()
   where id = p_account_id
     and user_id = v_user_id;

  return p_account_id;
end;
$$;

revoke all on function public.update_financial_account(uuid, text, public.account_type, bigint, text, text, text, boolean) from public, anon;
grant execute on function public.update_financial_account(uuid, text, public.account_type, bigint, text, text, text, boolean) to authenticated;

commit;
