# Database

Migration đầu tiên: `supabase/migrations/202609071600_initial_foundation.sql`.

## Tables
`profiles`, `accounts`, `categories`, `transactions`, `tags`, `transaction_tags`, `budgets`, `saving_goals`, `saving_goal_contributions`, `recurring_transactions`, `recurring_execution_logs`, `notifications`.

Amounts dùng `bigint`; thời điểm dùng `timestamptz`; ngày mục tiêu/ngân sách dùng `date`. Account và dữ liệu user liên kết tới `auth.users` bằng `user_id`.

## Security
Tất cả bảng dữ liệu user bật RLS. Policy giới hạn theo `auth.uid()`. Category mặc định (`user_id is null`) chỉ đọc được; category user mới được sửa/xóa. Storage có bucket private `avatars` và `receipts`, thư mục cấp 1 phải là user id.

## Functions
`create_financial_transaction` validate ownership/type/amount, insert transaction và cập nhật balance trong một transaction DB; hỗ trợ idempotency key. `recalculate_account_balance` dùng để sửa cached balance theo lịch sử.

## Indexes
Transaction theo user/date, user/type, account, category và idempotency; account/budget/goal theo user; recurring theo user/next_run_date.
