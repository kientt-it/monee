-- Monthly repayment tracker. Marking a payment does not mutate accounts or transactions.
begin;

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  lender text not null default '' check (char_length(lender) <= 120),
  monthly_amount bigint not null check (monthly_amount between 1 and 1000000000000),
  first_due_date date not null check (first_due_date between date '1900-01-01' and date '2100-12-31'),
  installment_count integer not null check (installment_count between 1 and 600),
  note text not null default '' check (char_length(note) <= 500),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.loan_payments (
  loan_id uuid not null,
  user_id uuid not null,
  installment_number integer not null check (installment_number between 1 and 600),
  amount bigint not null check (amount between 1 and 1000000000000),
  paid_on date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  created_at timestamptz not null default now(),
  primary key (loan_id, installment_number),
  foreign key (loan_id, user_id) references public.loans(id, user_id) on delete cascade
);

create index if not exists loans_user_created_idx on public.loans(user_id, created_at desc);
create index if not exists loan_payments_user_idx on public.loan_payments(user_id);
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;
drop policy if exists loans_select_own on public.loans;
create policy loans_select_own on public.loans for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists loan_payments_select_own on public.loan_payments;
create policy loan_payments_select_own on public.loan_payments for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.loans, public.loan_payments from anon, authenticated;
grant select on public.loans, public.loan_payments to authenticated;

create or replace function public.save_monthly_loan(
  p_id uuid, p_name text, p_lender text, p_monthly_amount bigint,
  p_first_due_date date, p_installment_count integer, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_id is null then raise exception 'INVALID_LOAN'; end if;
  -- A client-generated ID makes retrying creation safe.
  insert into public.loans(id, user_id, name, lender, monthly_amount, first_due_date, installment_count, note)
  values (p_id, auth.uid(), trim(p_name), trim(p_lender), p_monthly_amount, p_first_due_date, p_installment_count, trim(p_note))
  on conflict (id) do nothing;
  select * into v_loan from public.loans where id = p_id for update;
  if v_loan.user_id is distinct from auth.uid() then raise exception 'LOAN_NOT_FOUND'; end if;
  if (v_loan.monthly_amount, v_loan.first_due_date, v_loan.installment_count)
     is distinct from (p_monthly_amount, p_first_due_date, p_installment_count)
     and exists (select 1 from public.loan_payments where loan_id = p_id) then
    raise exception 'LOAN_SCHEDULE_LOCKED';
  end if;
  update public.loans set name = trim(p_name), lender = trim(p_lender), monthly_amount = p_monthly_amount,
    first_due_date = p_first_due_date, installment_count = p_installment_count, note = trim(p_note), updated_at = now()
  where id = p_id and user_id = auth.uid();
  return p_id;
end;
$$;

create or replace function public.set_monthly_loan_archived(p_id uuid, p_archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  update public.loans set is_archived = p_archived, updated_at = now() where id = p_id and user_id = auth.uid();
  if not found then raise exception 'LOAN_NOT_FOUND'; end if;
end;
$$;

create or replace function public.set_monthly_loan_payment(p_loan_id uuid, p_installment_number integer, p_paid boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_loan public.loans%rowtype;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select * into v_loan from public.loans where id = p_loan_id for update;
  if v_loan.user_id is distinct from auth.uid() then raise exception 'LOAN_NOT_FOUND'; end if;
  if v_loan.is_archived then raise exception 'LOAN_ARCHIVED'; end if;
  if p_paid is null or p_installment_number is null or p_installment_number < 1 or p_installment_number > v_loan.installment_count then
    raise exception 'INVALID_INSTALLMENT';
  end if;
  if p_paid then
    insert into public.loan_payments(loan_id, user_id, installment_number, amount)
    values (p_loan_id, auth.uid(), p_installment_number, v_loan.monthly_amount)
    on conflict (loan_id, installment_number) do nothing;
  else
    delete from public.loan_payments where loan_id = p_loan_id and installment_number = p_installment_number and user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.save_monthly_loan(uuid, text, text, bigint, date, integer, text) from public, anon;
revoke all on function public.set_monthly_loan_archived(uuid, boolean) from public, anon;
revoke all on function public.set_monthly_loan_payment(uuid, integer, boolean) from public, anon;
grant execute on function public.save_monthly_loan(uuid, text, text, bigint, date, integer, text) to authenticated;
grant execute on function public.set_monthly_loan_archived(uuid, boolean) to authenticated;
grant execute on function public.set_monthly_loan_payment(uuid, integer, boolean) to authenticated;

notify pgrst, 'reload schema';
commit;
