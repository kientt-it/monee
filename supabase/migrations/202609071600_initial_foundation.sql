create extension if not exists pgcrypto;

create type public.transaction_type as enum ('expense', 'income', 'transfer');
create type public.account_type as enum ('cash', 'bank', 'ewallet', 'credit_card', 'saving', 'investment', 'other');
create type public.category_type as enum ('expense', 'income');
create type public.budget_period as enum ('weekly', 'monthly', 'yearly', 'custom');
create type public.goal_status as enum ('active', 'completed', 'paused', 'cancelled');
create type public.recurring_frequency as enum ('daily', 'weekly', 'monthly', 'yearly', 'custom');
create type public.notification_type as enum ('budget_warning', 'budget_exceeded', 'recurring_transaction', 'saving_goal', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  currency text not null default 'VND',
  locale text not null default 'vi',
  timezone text not null default 'Asia/Ho_Chi_Minh',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, type public.account_type not null, initial_balance bigint not null default 0 check (initial_balance >= 0),
  current_balance bigint not null default 0, currency text not null default 'VND', icon text, color text,
  is_archived boolean not null default false, include_in_total boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  name text not null, type public.category_type not null, icon text, color text, is_default boolean not null default false,
  is_archived boolean not null default false, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  type public.transaction_type not null, amount bigint not null check (amount > 0), account_id uuid not null references public.accounts(id),
  destination_account_id uuid references public.accounts(id), category_id uuid references public.categories(id), merchant text, note text,
  transaction_date timestamptz not null, attachment_url text, recurring_transaction_id uuid,
  idempotency_key uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  constraint transfer_destination_check check ((type = 'transfer' and destination_account_id is not null and account_id <> destination_account_id) or (type <> 'transfer' and destination_account_id is null))
);

create table public.tags (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, created_at timestamptz not null default now(), unique(user_id, name));
create table public.transaction_tags (transaction_id uuid not null references public.transactions(id) on delete cascade, tag_id uuid not null references public.tags(id) on delete cascade, primary key (transaction_id, tag_id));

create table public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null,
  category_id uuid references public.categories(id), amount bigint not null check (amount > 0), period public.budget_period not null default 'monthly',
  start_date date not null, end_date date, alert_threshold integer not null default 75 check (alert_threshold between 1 and 100), is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.saving_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null,
  target_amount bigint not null check (target_amount > 0), current_amount bigint not null default 0 check (current_amount >= 0), target_date date,
  icon text, color text, account_id uuid references public.accounts(id), status public.goal_status not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.saving_goal_contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  saving_goal_id uuid not null references public.saving_goals(id) on delete cascade, amount bigint not null check (amount > 0), contribution_date date not null,
  note text, created_at timestamptz not null default now()
);

create table public.recurring_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, type public.transaction_type not null,
  amount bigint not null check (amount > 0), account_id uuid not null references public.accounts(id), destination_account_id uuid references public.accounts(id),
  category_id uuid references public.categories(id), merchant text, note text, frequency public.recurring_frequency not null, interval integer not null default 1 check (interval > 0),
  start_date date not null, next_run_date date not null, end_date date, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.recurring_execution_logs (
  id uuid primary key default gen_random_uuid(), recurring_transaction_id uuid not null references public.recurring_transactions(id) on delete cascade,
  scheduled_date date not null, transaction_id uuid references public.transactions(id), status text not null check (status in ('pending', 'completed', 'failed')),
  error text, created_at timestamptz not null default now(), unique(recurring_transaction_id, scheduled_date)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, type public.notification_type not null,
  title text not null, message text not null, is_read boolean not null default false, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions(user_id, transaction_date desc) where deleted_at is null;
create index transactions_user_type_idx on public.transactions(user_id, type) where deleted_at is null;
create index transactions_account_idx on public.transactions(account_id);
create index transactions_category_idx on public.transactions(category_id);
create unique index transactions_user_idempotency_idx on public.transactions(user_id, idempotency_key) where idempotency_key is not null;
create index accounts_user_idx on public.accounts(user_id);
create index budgets_user_idx on public.budgets(user_id);
create index saving_goals_user_idx on public.saving_goals(user_id);
create index recurring_user_next_run_idx on public.recurring_transactions(user_id, next_run_date) where is_active = true;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets for each row execute function public.set_updated_at();
create trigger saving_goals_set_updated_at before update on public.saving_goals for each row execute function public.set_updated_at();
create trigger recurring_set_updated_at before update on public.recurring_transactions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id) values (new.id) on conflict (id) do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

insert into public.categories (name, type, icon, is_default, sort_order) values
('Ăn uống', 'expense', 'utensils', true, 10), ('Di chuyển', 'expense', 'car', true, 20), ('Mua sắm', 'expense', 'shopping-bag', true, 30), ('Nhà ở', 'expense', 'house', true, 40), ('Hóa đơn', 'expense', 'receipt', true, 50), ('Giải trí', 'expense', 'gamepad-2', true, 60), ('Sức khỏe', 'expense', 'heart-pulse', true, 70), ('Giáo dục', 'expense', 'book-open', true, 80), ('Quà tặng', 'expense', 'gift', true, 90), ('Du lịch', 'expense', 'plane', true, 100), ('Khác', 'expense', 'ellipsis', true, 110),
('Lương', 'income', 'briefcase-business', true, 10), ('Thưởng', 'income', 'sparkles', true, 20), ('Kinh doanh', 'income', 'store', true, 30), ('Đầu tư', 'income', 'trending-up', true, 40), ('Quà tặng', 'income', 'gift', true, 50), ('Thu nhập khác', 'income', 'plus', true, 60);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.budgets enable row level security;
alter table public.saving_goals enable row level security;
alter table public.saving_goal_contributions enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.recurring_execution_logs enable row level security;
alter table public.notifications enable row level security;

create policy "profiles own row" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "accounts own rows" on public.accounts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories visible defaults or own" on public.categories for select using (user_id is null or user_id = auth.uid());
create policy "categories insert own" on public.categories for insert with check (user_id = auth.uid());
create policy "categories update own" on public.categories for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "categories delete own" on public.categories for delete using (user_id = auth.uid());
create policy "transactions own rows" on public.transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tags own rows" on public.tags for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "transaction tags own rows" on public.transaction_tags for all using (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid())) with check (exists (select 1 from public.transactions t where t.id = transaction_id and t.user_id = auth.uid()) and exists (select 1 from public.tags g where g.id = tag_id and g.user_id = auth.uid()));
create policy "budgets own rows" on public.budgets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saving goals own rows" on public.saving_goals for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goal contributions own rows" on public.saving_goal_contributions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "recurring own rows" on public.recurring_transactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "execution logs own rows" on public.recurring_execution_logs for all using (exists (select 1 from public.recurring_transactions r where r.id = recurring_transaction_id and r.user_id = auth.uid())) with check (exists (select 1 from public.recurring_transactions r where r.id = recurring_transaction_id and r.user_id = auth.uid()));
create policy "notifications own rows" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.create_financial_transaction(
  p_type public.transaction_type, p_amount bigint, p_account_id uuid, p_destination_account_id uuid default null,
  p_category_id uuid default null, p_merchant text default null, p_note text default null,
  p_transaction_date timestamptz default now(), p_idempotency_key uuid default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_id uuid; v_account_owner uuid; v_destination_owner uuid;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  select user_id into v_account_owner from public.accounts where id = p_account_id;
  if v_account_owner is distinct from v_user_id then raise exception 'INVALID_ACCOUNT'; end if;
  if p_type = 'transfer' then
    if p_destination_account_id is null or p_destination_account_id = p_account_id then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
    select user_id into v_destination_owner from public.accounts where id = p_destination_account_id;
    if v_destination_owner is distinct from v_user_id then raise exception 'INVALID_TRANSFER_ACCOUNT'; end if;
  end if;
  if p_category_id is not null and not exists (select 1 from public.categories where id = p_category_id and (user_id is null or user_id = v_user_id)) then raise exception 'INVALID_CATEGORY'; end if;
  if p_idempotency_key is not null then select id into v_id from public.transactions where user_id = v_user_id and idempotency_key = p_idempotency_key; if v_id is not null then return v_id; end if; end if;
  insert into public.transactions(user_id, type, amount, account_id, destination_account_id, category_id, merchant, note, transaction_date, idempotency_key) values (v_user_id, p_type, p_amount, p_account_id, p_destination_account_id, p_category_id, p_merchant, p_note, p_transaction_date, p_idempotency_key) returning id into v_id;
  if p_type = 'expense' then update public.accounts set current_balance = current_balance - p_amount where id = p_account_id;
  elsif p_type = 'income' then update public.accounts set current_balance = current_balance + p_amount where id = p_account_id;
  else update public.accounts set current_balance = current_balance - p_amount where id = p_account_id; update public.accounts set current_balance = current_balance + p_amount where id = p_destination_account_id;
  end if;
  return v_id;
end; $$;

create or replace function public.recalculate_account_balance(p_account_id uuid) returns bigint language plpgsql security definer set search_path = public as $$
declare v_balance bigint; v_user_id uuid := auth.uid();
begin
  if not exists (select 1 from public.accounts where id = p_account_id and user_id = v_user_id) then raise exception 'INVALID_ACCOUNT'; end if;
  select a.initial_balance + coalesce(sum(case when t.type = 'income' and t.account_id = a.id then t.amount when t.type = 'expense' and t.account_id = a.id then -t.amount when t.type = 'transfer' and t.account_id = a.id then -t.amount when t.type = 'transfer' and t.destination_account_id = a.id then t.amount else 0 end), 0) into v_balance from public.accounts a left join public.transactions t on (t.account_id = a.id or t.destination_account_id = a.id) and t.deleted_at is null where a.id = p_account_id group by a.id;
  update public.accounts set current_balance = v_balance where id = p_account_id and user_id = v_user_id; return v_balance;
end; $$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_financial_transaction(public.transaction_type, bigint, uuid, uuid, uuid, text, text, timestamptz, uuid) to authenticated;
grant execute on function public.recalculate_account_balance(uuid) to authenticated;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false), ('receipts', 'receipts', false) on conflict (id) do nothing;
create policy "avatar owner access" on storage.objects for all using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipt owner access" on storage.objects for all using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
