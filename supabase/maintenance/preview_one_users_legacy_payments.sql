-- READ ONLY. Replace UID, run and export the repayment_link_backup result.
with target as (select 'UID'::uuid as user_id)
select u.user_id,count(p.id) as links_to_remove,
  coalesce(jsonb_agg(to_jsonb(p)) filter(where p.id is not null),'[]'::jsonb) as repayment_link_backup
from target u left join public.credit_card_installment_payments p on p.user_id=u.user_id
group by u.user_id;
