-- Recurring schedules are no longer part of the product. Remove only the
-- scheduler entry and service-role functions; keep historical rows intact.
do $$
declare
  job record;
begin
  begin
    for job in
      select jobid
      from cron.job
      where command ilike '%recurring-scheduler%'
         or command ilike '%process_due_recurring_transactions%'
    loop
      perform cron.unschedule(job.jobid);
    end loop;
  exception
    when undefined_table or undefined_schema then
      null;
  end;
end;
$$;

drop function if exists public.process_due_recurring_transactions(integer);
drop function if exists public.create_scheduled_financial_transaction(
  uuid,
  uuid,
  public.transaction_type,
  bigint,
  uuid,
  uuid,
  uuid,
  text,
  text,
  date,
  uuid
);
