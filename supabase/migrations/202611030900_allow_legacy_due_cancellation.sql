-- Apply after 1700 (and 1800 if bulk delete is installed).
-- Soft cancellation only; does not remove or redistribute legacy financial evidence.
begin;
create or replace function public.manage_repayment_due(p_id uuid,p_revision integer,p_delete boolean,p_title text,p_date date,p_amount bigint)
returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d public.repayment_dues%rowtype; legacy uuid;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into d from public.repayment_dues where id=p_id and user_id=u for update;
  if d.id is null then raise exception 'DUE_NOT_FOUND'; end if;
  -- Retrying a successful cancel is harmless. Re-editing a deleted period is not.
  if d.deleted_at is not null then
    if p_delete is true then return; end if;
    raise exception 'DUE_DELETED';
  end if;
  if p_revision is null or p_revision<>d.revision then raise exception 'DUE_CHANGED'; end if;
  if p_delete is null then raise exception 'INVALID_REQUEST'; end if;
  if exists(select 1 from public.repayment_payments where due_id=d.id and reversed_at is null)
    then raise exception 'DUE_HAS_PAYMENTS'; end if;
  select legacy_installment_id into legacy from public.repayment_plans where id=d.plan_id and user_id=u;
  -- Canceling a scheduled period preserves every legacy link and cash transaction.
  -- Only editing still requires reconciliation of old payment links.
  if not p_delete and legacy is not null and exists(select 1 from public.credit_card_installment_payments where installment_id=legacy)
    then raise exception 'LEGACY_PAYMENT_UNRECONCILED'; end if;
  if p_delete then
    update public.repayment_dues set deleted_at=now() where id=d.id;
  else
    if p_title is null or length(trim(p_title)) not between 1 and 100 or p_date is null
      or p_date not between date '1900-01-01' and date '2109-12-31' or p_amount is null or p_amount not between 0 and 9007199254740991
      then raise exception 'INVALID_DUE'; end if;
    update public.repayment_dues set title_override=trim(p_title),due_date=p_date,amount=p_amount where id=d.id;
  end if;
end $$;
revoke all on function public.manage_repayment_due(uuid,integer,boolean,text,date,bigint) from public,anon,authenticated;
grant execute on function public.manage_repayment_due(uuid,integer,boolean,text,date,bigint) to authenticated;


notify pgrst,'reload schema';
commit;
