-- Independent amounts due. These records do not change account balances or transactions.
begin;

create table if not exists public.payables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 100),
  amount bigint not null check (amount between 1 and 1000000000000),
  due_date date not null check (due_date between date '1900-01-01' and date '2100-12-31'),
  note text not null default '' check (char_length(note) <= 500),
  paid_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payables_user_due_idx on public.payables(user_id, due_date, created_at desc);
alter table public.payables enable row level security;
drop policy if exists payables_select_own on public.payables;
create policy payables_select_own on public.payables for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists payables_insert_own on public.payables;
create policy payables_insert_own on public.payables for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists payables_update_own on public.payables;
create policy payables_update_own on public.payables for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists payables_delete_own on public.payables;
create policy payables_delete_own on public.payables for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.payables from anon, authenticated;
grant select, insert, update, delete on public.payables to authenticated;

create or replace function public.delete_payables(p_ids uuid[])
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_ids is null or cardinality(p_ids) < 1 or cardinality(p_ids) > 10000 then raise exception 'INVALID_PAYABLE_IDS'; end if;
  delete from public.payables where user_id = auth.uid() and id = any(p_ids);
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;
revoke all on function public.delete_payables(uuid[]) from public, anon;
grant execute on function public.delete_payables(uuid[]) to authenticated;

notify pgrst, 'reload schema';
commit;
