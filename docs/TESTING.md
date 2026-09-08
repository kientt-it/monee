# Testing

Vitest được cấu hình bằng `npm run test`. Hiện có 9 tests cho expense balance, income balance, transfer, edit/delete expense, edit/delete transfer, saving rate và budget thresholds.

Integration tests Supabase tiếp theo cần kiểm tra RPC rollback, ownership và idempotency trên database thật. Playwright kiểm tra register/login, create account, add income/expense, transfer, edit/delete và dashboard.
