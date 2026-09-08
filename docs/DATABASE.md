# Database

Active migrations:
- `supabase/migrations/202609071600_initial_foundation.sql`
- `supabase/migrations/202609071930_transaction_update_delete.sql`

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

## Indexes
Transaction theo user/date, user/type, account, category và idempotency; account/budget/goal theo user; recurring theo user/next_run_date.
