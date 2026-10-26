# Testing

Vitest được cấu hình bằng `npm run test`. Hiện có 25 tests cho balance effects, profile/account/goal schemas, report periods và lọc/tổng hợp khoản cần trả.

`supabase/tests/monthly_loans.sql` là harness chỉ dùng trên database PostgreSQL trống, cô lập, không chạy trên Supabase. Đã pass PostgreSQL 16: migration chạy lại, RLS hai user, direct-write rejection, RPC ownership, idempotency, undo, archive, khóa lịch và rollback. Harness tự tạo Auth fixtures và role kiểm thử.

`supabase/tests/payables.sql` kiểm tra migration mới trên PostgreSQL 16 tạm: ràng buộc số tiền, RLS hai user, trạng thái đã trả và xóa hàng loạt chỉ các mục thuộc owner. Đã pass; không chạy harness trên Supabase.

`supabase/tests/account_initial_balance.sql` là harness tương tự để kiểm tra migration chạy lại, cập nhật chênh lệch số dư ban đầu/current balance, owner check và cấm ghi trực tiếp số dư ban đầu.

Integration tests Supabase tiếp theo cần kiểm tra RPC rollback, ownership, idempotency và goal contribution trên database thật. Playwright kiểm tra register/login, create account, add income/expense, transfer, edit/delete/undo, dashboard và các route goals/notifications.
