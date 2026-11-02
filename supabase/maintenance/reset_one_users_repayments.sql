-- RUN AS DATABASE ADMIN, not as an app RPC. This file is NOT a migration.
-- Reset ALL repayment schedules/history for ONE user, including legacy data.
-- Wallets, balances, transactions, income and living/reserve budgets are kept.
-- 1. Replace REPLACE_WITH_USER_UUID with the UUID from Authentication > Users.
-- 2. Run the WHOLE file with ROLLBACK first. Export the backup JSON result.
-- 3. After reviewing counts/backup, replace the FINAL ROLLBACK with COMMIT
--    and run the whole file again. Never remove the user filter.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
create temporary table repayment_reset_target(user_id uuid primary key) on commit drop;
insert into repayment_reset_target values ('REPLACE_WITH_USER_UUID'::uuid);
do $$ begin
  if not exists(select 1 from auth.users u join repayment_reset_target t on t.user_id=u.id)
    then raise exception 'TARGET_USER_NOT_FOUND'; end if;
end $$;

-- Prevent schedule writes during the reset. Other users' rows are never deleted.
-- No account or transaction table is changed by this script.
lock table public.repayment_plans,public.repayment_dues,public.repayment_payments,
  public.credit_card_installments,public.credit_card_installment_payments,
  public.payables,public.income_allocation_lines
  in share row exclusive mode;

-- Older loan-tracker tables may never have been installed. Back up and
-- remove them only when present, rather than failing an otherwise valid reset.
create temporary table repayment_reset_loans(kind text primary key, rows jsonb not null) on commit drop;
do $$ declare tab text; backup_rows jsonb; u uuid:=(select user_id from repayment_reset_target);
begin
  foreach tab in array array['loan_payments','loans'] loop
    backup_rows:='[]'::jsonb;
    if to_regclass('public.'||tab) is not null then
      execute format('lock table public.%I in share row exclusive mode',tab);
      execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from public.%I x where x.user_id=$1',tab) into backup_rows using u;
    end if;
    insert into repayment_reset_loans values(tab,backup_rows);
  end loop;
end $$;

-- Export this result as a backup before choosing COMMIT.
create temporary table repayment_reset_backup on commit drop as
select t.user_id, jsonb_build_object(
  'repayment_plans',coalesce((select jsonb_agg(to_jsonb(x)) from public.repayment_plans x where x.user_id=t.user_id),'[]'::jsonb),
  'repayment_dues',coalesce((select jsonb_agg(to_jsonb(x)) from public.repayment_dues x where x.user_id=t.user_id),'[]'::jsonb),
  'repayment_payments',coalesce((select jsonb_agg(to_jsonb(x)) from public.repayment_payments x where x.user_id=t.user_id),'[]'::jsonb),
  'credit_card_installments',coalesce((select jsonb_agg(to_jsonb(x)) from public.credit_card_installments x where x.user_id=t.user_id),'[]'::jsonb),
  'credit_card_installment_payments',coalesce((select jsonb_agg(to_jsonb(x)) from public.credit_card_installment_payments x where x.user_id=t.user_id),'[]'::jsonb),
  'payables',coalesce((select jsonb_agg(to_jsonb(x)) from public.payables x where x.user_id=t.user_id),'[]'::jsonb),
  'loans',(select rows from repayment_reset_loans where kind='loans'),
  'loan_payments',(select rows from repayment_reset_loans where kind='loan_payments'),
  'debt_allocation_lines',coalesce((select jsonb_agg(to_jsonb(x)) from public.income_allocation_lines x
    join public.income_allocation_months m on m.id=x.month_id where m.user_id=t.user_id and x.kind in ('debt','card_installment','card_repayment')),'[]'::jsonb)
) as repayment_backup from repayment_reset_target t;

-- Preview the exact deletion scope, including canceled periods and reversed payments.
create temporary table repayment_reset_counts on commit drop as
select 'repayment_plans' as table_name,count(*) as rows_to_delete from public.repayment_plans where user_id=(select user_id from repayment_reset_target)
union all select 'repayment_dues',count(*) from public.repayment_dues where user_id=(select user_id from repayment_reset_target)
union all select 'repayment_payments',count(*) from public.repayment_payments where user_id=(select user_id from repayment_reset_target)
union all select 'credit_card_installments',count(*) from public.credit_card_installments where user_id=(select user_id from repayment_reset_target)
union all select 'credit_card_installment_payments',count(*) from public.credit_card_installment_payments where user_id=(select user_id from repayment_reset_target)
union all select 'payables',count(*) from public.payables where user_id=(select user_id from repayment_reset_target)
union all select 'loans',jsonb_array_length(rows) from repayment_reset_loans where kind='loans'
union all select 'loan_payments',jsonb_array_length(rows) from repayment_reset_loans where kind='loan_payments'
union all select 'debt_allocation_lines',count(*) from public.income_allocation_lines x join public.income_allocation_months m on m.id=x.month_id
  where m.user_id=(select user_id from repayment_reset_target) and x.kind in ('debt','card_installment','card_repayment');

delete from public.income_allocation_lines x using public.income_allocation_months m,repayment_reset_target t
  where x.month_id=m.id and m.user_id=t.user_id and x.kind in ('debt','card_installment','card_repayment');
delete from public.repayment_payments where user_id=(select user_id from repayment_reset_target);
delete from public.repayment_dues where user_id=(select user_id from repayment_reset_target);
delete from public.repayment_plans where user_id=(select user_id from repayment_reset_target);
delete from public.credit_card_installment_payments where user_id=(select user_id from repayment_reset_target);
delete from public.credit_card_installments where user_id=(select user_id from repayment_reset_target);
delete from public.payables where user_id=(select user_id from repayment_reset_target);
do $$ declare tab text; u uuid:=(select user_id from repayment_reset_target);
begin
  foreach tab in array array['loan_payments','loans'] loop
    if to_regclass('public.'||tab) is not null then
      execute format('delete from public.%I where user_id=$1',tab) using u;
    end if;
  end loop;
end $$;

-- Existing cash transactions are intentionally retained, so balances already
-- include past payments. Re-entering schedules must NOT create those cash
-- transactions again. Legacy aggregate card payables may be regenerated by
-- existing account triggers later; they are not scheduled dues in the new app.
select b.user_id, b.repayment_backup, (select jsonb_object_agg(table_name,rows_to_delete) from repayment_reset_counts) as rows_to_delete,
  'ROLLBACK restores every row. Only change the final command to COMMIT after reviewing target, counts and exporting repayment_backup.' as result
from repayment_reset_backup b;
rollback;
