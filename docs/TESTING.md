# Testing

Vitest được cấu hình bằng `npm run test`. Hiện có 24 tests cho balance effects, profile/account/budget/goal schemas và report period selection.

Integration tests Supabase tiếp theo cần kiểm tra RPC rollback, ownership, idempotency và goal contribution trên database thật. Playwright kiểm tra register/login, create account, add income/expense, transfer, edit/delete/undo, dashboard và các route goals/notifications.
