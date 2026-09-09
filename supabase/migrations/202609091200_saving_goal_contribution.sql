create or replace function public.add_saving_goal_contribution(
  p_goal_id uuid,
  p_amount bigint,
  p_contribution_date date,
  p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
  v_contribution_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;

  select user_id into v_user_id from public.saving_goals where id = p_goal_id for update;
  if v_user_id is null or v_user_id <> auth.uid() then raise exception 'GOAL_NOT_FOUND'; end if;

  insert into public.saving_goal_contributions (user_id, saving_goal_id, amount, contribution_date, note)
  values (auth.uid(), p_goal_id, p_amount, p_contribution_date, nullif(trim(p_note), ''))
  returning id into v_contribution_id;

  update public.saving_goals
  set current_amount = current_amount + p_amount,
      status = case when current_amount + p_amount >= target_amount then 'completed'::public.goal_status else status end
  where id = p_goal_id and user_id = auth.uid();

  return v_contribution_id;
end;
$$;

revoke all on function public.add_saving_goal_contribution(uuid, bigint, date, text) from public;
grant execute on function public.add_saving_goal_contribution(uuid, bigint, date, text) to authenticated;
