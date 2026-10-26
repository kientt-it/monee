begin;

create or replace function public.soft_delete_financial_transactions(p_ids uuid[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  transaction_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_ids is null or cardinality(p_ids) < 1 or cardinality(p_ids) > 50
    or array_position(p_ids, null) is not null
    or (select count(distinct id) from unnest(p_ids) as selected(id)) <> cardinality(p_ids)
  then raise exception 'INVALID_TRANSACTION_IDS'; end if;

  for transaction_id in select id from unnest(p_ids) as selected(id) order by id loop
    perform public.soft_delete_financial_transaction(transaction_id);
  end loop;

  return cardinality(p_ids);
end;
$$;

revoke all on function public.soft_delete_financial_transactions(uuid[]) from public, anon;
grant execute on function public.soft_delete_financial_transactions(uuid[]) to authenticated;

notify pgrst, 'reload schema';
commit;
