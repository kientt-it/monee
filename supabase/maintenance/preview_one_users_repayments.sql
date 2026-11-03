-- READ ONLY. Run this query first and export the repayment_backup result.
-- Optional legacy loan tables are exported as XML strings inside the JSON backup.
with target as (select 'b07ea704-a22d-48f4-903f-cb2eb92bc1ab'::uuid as user_id)
select t.user_id, jsonb_build_object(
  'repayment_plans',coalesce((select jsonb_agg(to_jsonb(x)) from public.repayment_plans x where x.user_id=t.user_id),'[]'::jsonb),
  'repayment_dues',coalesce((select jsonb_agg(to_jsonb(x)) from public.repayment_dues x where x.user_id=t.user_id),'[]'::jsonb),
  'repayment_payments',coalesce((select jsonb_agg(to_jsonb(x)) from public.repayment_payments x where x.user_id=t.user_id),'[]'::jsonb),
  'credit_card_installments',coalesce((select jsonb_agg(to_jsonb(x)) from public.credit_card_installments x where x.user_id=t.user_id),'[]'::jsonb),
  'credit_card_installment_payments',coalesce((select jsonb_agg(to_jsonb(x)) from public.credit_card_installment_payments x where x.user_id=t.user_id),'[]'::jsonb),
  'loans_xml',case when to_regclass('public.loans') is not null then to_jsonb(query_to_xml(format('select * from public.%I where user_id=%L::uuid','loans',t.user_id),true,false,'')::text) else 'null'::jsonb end,
  'loan_payments_xml',case when to_regclass('public.loan_payments') is not null then to_jsonb(query_to_xml(format('select * from public.%I where user_id=%L::uuid','loan_payments',t.user_id),true,false,'')::text) else 'null'::jsonb end,
  'payables',coalesce((select jsonb_agg(to_jsonb(x)) from public.payables x where x.user_id=t.user_id),'[]'::jsonb),
  'debt_allocation_lines',coalesce((select jsonb_agg(to_jsonb(x)) from public.income_allocation_lines x
    join public.income_allocation_months m on m.id=x.month_id where m.user_id=t.user_id and x.kind in ('debt','card_installment','card_repayment')),'[]'::jsonb)
) as repayment_backup from target t;

