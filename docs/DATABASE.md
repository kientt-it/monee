# Database

Active migrations:
- `supabase/migrations/202609071600_initial_foundation.sql`
- `supabase/migrations/202609071930_transaction_update_delete.sql`

Hai migration đã được người dùng apply lên Supabase dev ngày 2026-09-09. Kết nối Auth endpoint từ workspace phản hồi thành công; kiểm thử tích hợp bằng authenticated test user vẫn là follow-up.

## Tables
`profiles`, `accounts`, `categories`, `transactions`, `tags`, `transaction_tags`, `budgets`, `saving_goals`, `saving_goal_contributions`, `recurring_transactions`, `recurring_execution_logs`, `notifications`.

Amounts dùng `bigint`; thời điểm dùng `timestamptz`; ngày mục tiêu/ngân sách dùng `date`. Account và dữ liệu user liên kết tới `auth.users` bằng `user_id`.

## Security
Tất cả bảng dữ liệu user bật RLS. Policy giới hạn theo `auth.uid()`. Category mặc định (`user_id is null`) chỉ đọc được; category user mới được sửa/xóa. Storage có bucket private `avatars` và `receipts`, thư mục cấp 1 phải là user id.

## Functions
`create_financial_transaction` validate ownership/type/amount/category, lock accounts, insert transaction và cập nhật balance trong một transaction DB; hỗ trợ idempotency key.

`update_financial_transaction` lock record/accounts, reverse effect cũ, apply effect mới và update record atomic. `soft_delete_financial_transaction` reverse effect rồi set `deleted_at`; `restore_financial_transaction` apply lại effect. `recalculate_account_balance` sửa cached balance theo lịch sử.

`create_financial_account` buộc `current_balance = initial_balance`, validate owner/name/currency và là đường tạo account duy nhất từ client.

Authenticated client chỉ được select transactions. Quyền insert/update/delete trực tiếp transactions và accounts đã bị revoke; metadata account chỉ update qua column grant, còn `current_balance` không thể ghi trực tiếp.

Accounts edit/archive/restore dùng column grant metadata hiện có, không cần migration mới. Trước khi archive, Server Action kiểm tra không còn `recurring_transactions.is_active` tham chiếu account.

Budgets MVP sử dụng trực tiếp bảng `budgets` và policy hiện có, không cần migration mới. Server Action chỉ cho phép category expense mặc định hoặc category thuộc user; tắt budget bằng `is_active = false` thay vì hard delete. Progress được tính từ transactions chưa xóa mềm ở request time.

Migration `supabase/migrations/202609091200_saving_goal_contribution.sql` thêm RPC `add_saving_goal_contribution`, khóa goal, insert contribution và cập nhật `current_amount/status` atomic. Người triển khai cần apply migration này trước khi dùng nút thêm đóng góp.

Migration `supabase/migrations/202609091300_recurring_scheduler.sql` thêm RPC service-role `process_due_recurring_transactions` và helper tạo transaction scheduled. RPC khóa lịch, chống chạy trùng qua execution log, cập nhật ngày kế tiếp và phát notification.

## Indexes
Transaction theo user/date, user/type, account, category và idempotency; account/budget/goal theo user; recurring theo user/next_run_date.
