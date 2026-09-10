# Monthly loans and mobile date field

## Scope
- Fix the transaction date field on mobile: a separate flex icon track, native date picker, WebKit date-content sizing, 44px minimum height, 16px input text, and bottom-navigation clearance.
- Use the Vietnamese calendar date for new transactions.
- Replace Budgets with Loans across desktop navigation, mobile More menu, dashboard, and route entry. The old budget route redirects; historical budget tables/data remain intact.

## Repayment rules
- Track a fixed VND installment (including principal and interest as entered by the user), first due date and 1–600 monthly installments. No interest-rate calculation or automatic debit.
- For an existing loan, users enter the next unpaid due date and remaining term.
- Month-end due dates clamp to the target month's final day, without drifting the original due day. Today is due, not overdue.
- Monthly totals use only the selected month's installments; the overdue total includes every unpaid past due date through today, excluding archived loans.
- Mark/unmark a period manually. These records do not create financial transactions or mutate account balances; this is explained in the UI.
- Amount/dates/term are locked after any payment is recorded. Names, lender and note remain editable. Archive is reversible and keeps history.

## Database and rollout
Apply `supabase/migrations/202609100900_monthly_loans.sql` in Supabase SQL Editor, then deploy the app. No cron or Edge Function is required.
The migration adds `loans`, `loan_payments`, SELECT-only RLS and three authenticated RPCs. Mutations use owner checks, a loan row lock, fixed search paths, server validation and DB constraints. Stable client-generated loan IDs and unique loan/period keys make retries idempotent.
Until the migration is installed, Loans shows an unavailable state and the dashboard remains usable. No sample loans are inserted.

## Verification
- 27 Vitest checks pass, including leap-year/month-end due dates, term boundaries, overdue carryover, archived/paid loans, Vietnamese date rollover and invalid input.
- `supabase/tests/monthly_loans.sql` passed on a disposable PostgreSQL 16 instance. It checks migration replay, duplicate create/payment, undo, archival, schedule locks, RLS isolation, forbidden direct writes, missing sessions, cross-owner mutations and rollback on invalid amounts.
- iPhone Safari visual verification and authenticated production Supabase checks still need the deployed app. No production data was changed during local verification.
