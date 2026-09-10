# Database

Active migrations:
- `supabase/migrations/202609071600_initial_foundation.sql`
- `supabase/migrations/202609071930_transaction_update_delete.sql`
- `supabase/migrations/202609091200_saving_goal_contribution.sql`
- `supabase/migrations/202609091300_recurring_scheduler.sql` (legacy schema/RPC source)
- `supabase/migrations/202609091500_remove_recurring_scheduler.sql`
- `supabase/migrations/202609100900_monthly_loans.sql` (cần apply trên Supabase để bật Khoản vay)
- `supabase/migrations/202609101200_edit_account_initial_balance.sql` (cần apply trên Supabase để sửa Số dư ban đầu)

Hai migration đã được người dùng apply lên Supabase dev ngày 2026-09-09. Kết nối Auth endpoint từ workspace phản hồi thành công; kiểm thử tích hợp bằng authenticated test user vẫn là follow-up.

## Tables
`profiles`, `accounts`, `categories`, `transactions`, `tags`, `transaction_tags`, `budgets`, `saving_goals`, `saving_goal_contributions`, `notifications`. Hai bảng recurring cũ được giữ lại để không làm mất dữ liệu lịch sử, nhưng không còn được ứng dụng đọc/ghi.

Amounts dùng `bigint`; thời điểm dùng `timestamptz`; ngày mục tiêu/ngân sách dùng `date`. Account và dữ liệu user liên kết tới `auth.users` bằng `user_id`.

## Security
Tất cả bảng dữ liệu user bật RLS. Policy giới hạn theo `auth.uid()`. Category mặc định (`user_id is null`) chỉ đọc được; category user mới được sửa/xóa. Storage có bucket private `avatars` và `receipts`, thư mục cấp 1 phải là user id.

## Functions
`create_financial_transaction` validate ownership/type/amount/category, lock accounts, insert transaction và cập nhật balance trong một transaction DB; hỗ trợ idempotency key.

`update_financial_transaction` lock record/accounts, reverse effect cũ, apply effect mới và update record atomic. `soft_delete_financial_transaction` reverse effect rồi set `deleted_at`; `restore_financial_transaction` apply lại effect. `recalculate_account_balance` sửa cached balance theo lịch sử.

`create_financial_account` buộc `current_balance = initial_balance`, validate owner/name/currency và là đường tạo account duy nhất từ client.

`update_financial_account` khóa account thuộc user, cập nhật metadata và `initial_balance` atomic; `current_balance` thay đổi đúng bằng phần chênh lệch của số dư ban đầu để các transaction cũ vẫn giữ nguyên tác động.

Authenticated client chỉ được select transactions. Quyền insert/update/delete trực tiếp transactions và accounts đã bị revoke; metadata account chỉ update qua column grant, còn `initial_balance` và `current_balance` không thể ghi trực tiếp. Accounts edit dùng RPC; archive/restore dùng column grant metadata hiện có.

Ngân sách đã được thay bằng Khoản vay; bảng `budgets` cũ giữ lịch sử, không còn được ứng dụng đọc/ghi.

`loans` lưu số tiền VND cố định, ngày đóng đầu và số kỳ; `loan_payments` lưu kỳ đã đóng, amount snapshot, ngày ghi nhận theo Việt Nam. RLS chỉ cho owner SELECT; mọi mutation thông qua `save_monthly_loan`, `set_monthly_loan_archived`, `set_monthly_loan_payment`. Row locks cùng khóa duy nhất `(loan_id, installment_number)` bảo vệ retry và ngăn sửa lịch đã có payment. Các RPC không thay đổi accounts/transactions. Migration đã chạy thử trên PostgreSQL 16 tạm, chưa apply production.

Migration `supabase/migrations/202609091200_saving_goal_contribution.sql` thêm RPC `add_saving_goal_contribution`, khóa goal, insert contribution và cập nhật `current_amount/status` atomic. Người triển khai cần apply migration này trước khi dùng nút thêm đóng góp.

Migration `supabase/migrations/202609091500_remove_recurring_scheduler.sql` dừng cron job có command liên quan scheduler và gỡ các RPC service-role scheduler; không xóa bảng hoặc dữ liệu recurring cũ.

## Indexes
Transaction theo user/date, user/type, account, category và idempotency; account/budget/goal theo user.
