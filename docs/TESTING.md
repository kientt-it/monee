# Testing

Bulk delete: `supabase/tests/bulk_delete_repayment_dues.sql` (database disposable) kiểm tra nguyên tử, phân quyền, paid guard, retry và phạm vi lựa chọn; script maintenance reset được kiểm tra ROLLBACK/COMMIT với hai user, giữ nguyên accounts/transactions.

`supabase/tests/repayment_due_management.sql` bổ sung kiểm thử sửa/xóa kỳ trả và chạy lại harness workspace trên database disposable. Có kiểm tra paid guard, owner, revision, soft-delete và không đổi số dư. Không chạy trên Supabase live.

## Lịch trả theo kỳ

`src/features/repayments/domain.test.ts` kiểm thử các ranh giới lịch và ngân sách. Tổng suite hiện có 46 tests. `supabase/tests/repayment_workspace.sql` chỉ dùng trên PostgreSQL disposable trống, có Auth/Storage fixture và migration thực; tuyệt đối không chạy trên Supabase live. Chi tiết kiểm tra UI/build và giới hạn E2E xem `changes/2026-11-02-repayment-workspace.md`.

Vitest được cấu hình bằng `npm run test`. Hiện có 25 tests cho balance effects, profile/account/goal schemas, report periods và lọc/tổng hợp khoản cần trả.

`supabase/tests/monthly_loans.sql` là harness chỉ dùng trên database PostgreSQL trống, cô lập, không chạy trên Supabase. Đã pass PostgreSQL 16: migration chạy lại, RLS hai user, direct-write rejection, RPC ownership, idempotency, undo, archive, khóa lịch và rollback. Harness tự tạo Auth fixtures và role kiểm thử.

`supabase/tests/payables.sql` kiểm tra migration mới trên PostgreSQL 16 tạm: ràng buộc số tiền, RLS hai user, trạng thái đã trả và xóa hàng loạt chỉ các mục thuộc owner. Đã pass; không chạy harness trên Supabase.

`supabase/tests/account_initial_balance.sql` là harness tương tự để kiểm tra migration chạy lại, cập nhật chênh lệch số dư ban đầu/current balance, owner check và cấm ghi trực tiếp số dư ban đầu.

Integration tests Supabase tiếp theo cần kiểm tra RPC rollback, ownership, idempotency và goal contribution trên database thật. Playwright kiểm tra register/login, create account, add income/expense, transfer, edit/delete/undo, dashboard và các route goals/notifications.
