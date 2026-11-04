-- One latest calculator configuration per user. No financial ledger effects.
begin;
create table public.hui_calculations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null check (jsonb_typeof(config)='object' and octet_length(config::text)<=8192),
  updated_at timestamptz not null default now()
);
alter table public.hui_calculations enable row level security;
revoke all on public.hui_calculations from anon,authenticated;
grant select,insert,update on public.hui_calculations to authenticated;
create policy hui_calculations_select on public.hui_calculations for select to authenticated
  using (user_id=(select auth.uid()));
create policy hui_calculations_insert on public.hui_calculations for insert to authenticated
  with check (user_id=(select auth.uid()));
create policy hui_calculations_update on public.hui_calculations for update to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
create function public.stamp_hui_calculation() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at:=clock_timestamp(); return new; end $$;
revoke all on function public.stamp_hui_calculation() from public,anon,authenticated;
create trigger hui_calculations_updated before update on public.hui_calculations
  for each row execute function public.stamp_hui_calculation();
notify pgrst,'reload schema';
commit;
