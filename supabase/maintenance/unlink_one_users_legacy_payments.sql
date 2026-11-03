-- ADMIN MAINTENANCE: removes ONLY old installment-to-transaction links.
-- Export the preview query first. Replace UID with Authentication > Users ID.
-- Keeps all schedules, new per-period payments, cash transactions and balances.
-- Run this single DO statement in full. No extra BEGIN/COMMIT needed.
do $unlink$
declare
  v_user_id uuid := 'UID'::uuid;
  v_deleted bigint;
begin
  perform set_config('lock_timeout','5s',true);
  if not exists(select 1 from auth.users where id=v_user_id) then
    raise exception 'TARGET_USER_NOT_FOUND';
  end if;
  lock table public.credit_card_installment_payments in share row exclusive mode;
  delete from public.credit_card_installment_payments where user_id=v_user_id;
  get diagnostics v_deleted = row_count;
  raise notice 'Removed % legacy payment links for %. Cash transactions, balances and schedules unchanged.',v_deleted,v_user_id;
end;
$unlink$;
