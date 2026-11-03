-- ADMIN MAINTENANCE ONLY, not a migration or app RPC.
-- One DO statement: no temporary tables or cross-statement transaction state.
-- 1. Export preview_one_users_repayments.sql results for the SAME user first.
-- 2. Replace v_user_id below. false = validate only, no deletion.
-- 3. Set v_delete to true only when ready to delete. Run this WHOLE statement.
-- No BEGIN/COMMIT/ROLLBACK needs to be added in SQL Editor.
do $reset$
declare
  v_user_id uuid := 'UID'::uuid;
  v_delete boolean := false;
  v_tab text;
  v_count bigint;
  v_counts jsonb := '{}'::jsonb;
begin
  perform set_config('lock_timeout','5s',true);
  if not exists(select 1 from auth.users where id=v_user_id) then
    raise exception 'TARGET_USER_NOT_FOUND';
  end if;

  lock table public.repayment_plans,public.repayment_dues,public.repayment_payments,
    public.credit_card_installments,public.credit_card_installment_payments,
    public.payables,public.income_allocation_lines in share row exclusive mode;

  foreach v_tab in array array['repayment_plans','repayment_dues','repayment_payments',
    'credit_card_installments','credit_card_installment_payments','payables',
    'loan_payments','loans'] loop
    if to_regclass('public.'||v_tab) is not null then
      execute format('lock table public.%I in share row exclusive mode',v_tab);
      execute format('select count(*) from public.%I where user_id=$1',v_tab)
        into v_count using v_user_id;
      v_counts := v_counts || jsonb_build_object(v_tab,v_count);
    end if;
  end loop;
  select count(*) into v_count from public.income_allocation_lines x
    join public.income_allocation_months m on m.id=x.month_id
    where m.user_id=v_user_id and x.kind in ('debt','card_installment','card_repayment');
  v_counts := v_counts || jsonb_build_object('debt_allocation_lines',v_count);
  raise notice 'Target user: %. Rows: %',v_user_id,v_counts;
  if not v_delete then
    raise notice 'VALIDATION ONLY: no rows deleted. Set v_delete to true to apply.';
    return;
  end if;

  delete from public.income_allocation_lines x using public.income_allocation_months m
    where x.month_id=m.id and m.user_id=v_user_id
      and x.kind in ('debt','card_installment','card_repayment');
  -- Children before parents; all deletes remain in this single atomic statement.
  foreach v_tab in array array['repayment_payments','repayment_dues','repayment_plans',
    'credit_card_installment_payments','credit_card_installments','payables',
    'loan_payments','loans'] loop
    if to_regclass('public.'||v_tab) is not null then
      execute format('delete from public.%I where user_id=$1',v_tab) using v_user_id;
    end if;
  end loop;
  raise notice 'RESET COMPLETE for user %. Accounts, balances and cash transactions retained.',v_user_id;
end;
$reset$;
