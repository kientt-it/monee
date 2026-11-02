begin;
create function public.bulk_delete_repayment_dues(p_items jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); n integer; matched integer; changed integer:=0; d record;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'INVALID_DUE_SELECTION'; end if;
  n:=jsonb_array_length(p_items);
  if n not between 1 and 200 then raise exception 'INVALID_DUE_SELECTION'; end if;
  if exists(select 1 from jsonb_to_recordset(p_items) as x(id uuid,revision integer) where id is null or revision is null or revision<0)
    or (select count(distinct id) from jsonb_to_recordset(p_items) as x(id uuid,revision integer))<>n
    then raise exception 'INVALID_DUE_SELECTION'; end if;
  -- Acquire all period locks in a stable order before changing any row.
  perform r.id from public.repayment_dues r join jsonb_to_recordset(p_items) as x(id uuid,revision integer) on x.id=r.id
    where r.user_id=u order by r.id for update of r;
  select count(*) into matched from public.repayment_dues r join jsonb_to_recordset(p_items) as x(id uuid,revision integer) on x.id=r.id where r.user_id=u;
  if matched<>n then raise exception 'DUE_NOT_FOUND'; end if;
  for d in select r.id,r.deleted_at,x.revision from public.repayment_dues r join jsonb_to_recordset(p_items) as x(id uuid,revision integer) on x.id=r.id
    where r.user_id=u order by r.id loop
    perform public.manage_repayment_due(d.id,d.revision,true,null,null,null);
    if d.deleted_at is null then changed:=changed+1; end if;
  end loop;
  return changed;
end $$;
revoke all on function public.bulk_delete_repayment_dues(jsonb) from public,anon,authenticated;
grant execute on function public.bulk_delete_repayment_dues(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
