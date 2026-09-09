create or replace function public.create_scheduled_financial_transaction(
  p_user_id uuid,
  p_recurring_transaction_id uuid,
  p_type public.transaction_type,
  p_amount bigint,
  p_account_id uuid,
  p_destination_account_id uuid default null,
  p_category_id uuid default null,
  p_merchant text default null,
  p_note text default null,
  p_scheduled_date date default current_date,
  p_idempotency_key uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.recurring_transactions where id = p_recurring_transaction_id and user_id = p_user_id) then raise exception 'RECURRING_NOT_FOUND'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_type = 'transfer' and (p_destination_account_id is null or p_destination_account_id = p_account_id) then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if p_type <> 'transfer' and p_destination_account_id is not null then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = p_user_id and is_archived = false) then raise exception 'INVALID_ACCOUNT'; end if;
  if p_destination_account_id is not null and not exists (select 1 from public.accounts where id = p_destination_account_id and user_id = p_user_id and is_archived = false) then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  if p_category_id is not null and not exists (select 1 from public.categories where id = p_category_id and (user_id is null or user_id = p_user_id) and is_archived = false and type::text = p_type::text) then raise exception 'INVALID_CATEGORY'; end if;
  if p_type = 'transfer' and p_category_id is not null then raise exception 'INVALID_CATEGORY'; end if;
  perform 1 from public.accounts where id in (p_account_id, p_destination_account_id) order by id for update;
  insert into public.transactions(user_id, type, amount, account_id, destination_account_id, category_id, merchant, note, transaction_date, recurring_transaction_id, idempotency_key)
  values (p_user_id, p_type, p_amount, p_account_id, p_destination_account_id, p_category_id, nullif(trim(p_merchant), ''), nullif(trim(p_note), ''), ((p_scheduled_date::text || ' 12:00:00 Asia/Ho_Chi_Minh')::timestamptz), p_recurring_transaction_id, p_idempotency_key)
  returning id into v_id;
  perform public.apply_transaction_balance_effect(p_type, p_amount, p_account_id, p_destination_account_id, 1);
  return v_id;
end;
$$;

create or replace function public.process_due_recurring_transactions(p_limit integer default 100)
returns table (recurring_transaction_id uuid, scheduled_date date, transaction_id uuid, status text, error text)
language plpgsql security definer set search_path = public as $$
declare
  r public.recurring_transactions%rowtype;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_next_date date;
  v_transaction_id uuid;
  v_log_id uuid;
  v_log_status text;
  v_error text;
begin
  for r in
    select * from public.recurring_transactions
    where is_active = true and next_run_date <= v_today and (end_date is null or next_run_date <= end_date)
    order by next_run_date asc, id asc
    limit least(greatest(coalesce(p_limit, 100), 1), 500)
    for update skip locked
  loop
    v_next_date := case r.frequency
      when 'daily' then r.next_run_date + make_interval(days => r.interval)
      when 'weekly' then r.next_run_date + make_interval(days => 7 * r.interval)
      when 'monthly' then r.next_run_date + make_interval(months => r.interval)
      when 'yearly' then r.next_run_date + make_interval(years => r.interval)
      else r.next_run_date + make_interval(days => r.interval)
    end;
    v_log_id := null;
    v_log_status := null;
    v_transaction_id := null;
    v_error := null;
    insert into public.recurring_execution_logs (recurring_transaction_id, scheduled_date, status)
    values (r.id, r.next_run_date, 'pending')
    on conflict (recurring_transaction_id, scheduled_date) do nothing
    returning id into v_log_id;
    if v_log_id is null then
      select status into v_log_status from public.recurring_execution_logs where recurring_transaction_id = r.id and scheduled_date = r.next_run_date;
      if v_log_status = 'completed' then
        update public.recurring_transactions set next_run_date = v_next_date, is_active = case when end_date is not null and v_next_date > end_date then false else is_active end where id = r.id;
      end if;
      continue;
    end if;
    begin
      v_transaction_id := public.create_scheduled_financial_transaction(r.user_id, r.id, r.type, r.amount, r.account_id, r.destination_account_id, r.category_id, r.merchant, r.note, r.next_run_date, gen_random_uuid());
      update public.recurring_execution_logs set status = 'completed', transaction_id = v_transaction_id where id = v_log_id;
      update public.recurring_transactions set next_run_date = v_next_date, is_active = case when end_date is not null and v_next_date > end_date then false else is_active end where id = r.id;
      insert into public.notifications (user_id, type, title, message, metadata)
      values (r.user_id, 'recurring_transaction', 'Đã tạo giao dịch định kỳ', coalesce(r.merchant, 'Một giao dịch định kỳ') || ' · ' || to_char(r.amount, 'FM999G999G999G999') || ' VND', jsonb_build_object('recurring_transaction_id', r.id, 'transaction_id', v_transaction_id, 'scheduled_date', r.next_run_date));
      recurring_transaction_id := r.id; scheduled_date := r.next_run_date; transaction_id := v_transaction_id; status := 'completed'; error := null; return next;
    exception when others then
      get stacked diagnostics v_error = message_text;
      update public.recurring_execution_logs set status = 'failed', error = v_error where id = v_log_id;
      update public.recurring_transactions set next_run_date = v_next_date, is_active = case when end_date is not null and v_next_date > end_date then false else is_active end where id = r.id;
      insert into public.notifications (user_id, type, title, message, metadata)
      values (r.user_id, 'recurring_transaction', 'Không thể tạo giao dịch định kỳ', coalesce(r.merchant, 'Một giao dịch định kỳ') || ' cần được kiểm tra.', jsonb_build_object('recurring_transaction_id', r.id, 'scheduled_date', r.next_run_date, 'error', v_error));
      recurring_transaction_id := r.id; scheduled_date := r.next_run_date; transaction_id := null; status := 'failed'; error := v_error; return next;
    end;
  end loop;
end;
$$;

revoke all on function public.create_scheduled_financial_transaction(uuid, uuid, public.transaction_type, bigint, uuid, uuid, uuid, text, text, date, uuid) from public, anon, authenticated;
revoke all on function public.process_due_recurring_transactions(integer) from public, anon, authenticated;
grant execute on function public.process_due_recurring_transactions(integer) to service_role;
