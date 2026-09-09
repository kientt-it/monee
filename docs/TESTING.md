# Testing

Vitest được cấu hình bằng `npm run test`. Hiện có 27 tests cho balance effects, profile/account/budget/goal/recurring schemas và report period selection.

Integration tests Supabase tiếp theo cần kiểm tra RPC rollback, ownership, idempotency, goal contribution và recurring scheduler trên database thật. Edge Function cần test secret/unauthorized và xử lý due/failed schedules. Playwright kiểm tra register/login, create account, add income/expense, transfer, edit/delete/undo, dashboard và các route goals/recurring/notifications.
