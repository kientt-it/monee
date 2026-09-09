# Scheduler giao dịch định kỳ

## Change
Thêm RPC xử lý lịch định kỳ đến hạn và Edge Function để gọi RPC theo cron.

## Goal
Tạo giao dịch định kỳ an toàn, không chạy trùng, có lịch sử thực thi và thông báo kết quả.

## New behavior
`process_due_recurring_transactions` lấy tối đa 500 lịch active đã đến hạn, khóa record, tạo execution log pending, tạo transaction qua helper security definer, cập nhật `next_run_date`, tự tắt sau end date và phát notification. Lỗi được ghi trạng thái failed cùng notification. Edge Function yêu cầu `x-scheduler-secret` khớp `SCHEDULER_SECRET`.

## Business logic impact
Scheduler tạo transaction ở 12:00 Asia/Ho_Chi_Minh của scheduled date, giữ transfer/income/expense semantics và cập nhật account balance qua cùng flow atomic. Unique `(recurring_transaction_id, scheduled_date)` ngăn xử lý lặp.

## Database changes
Thêm migration `202609091300_recurring_scheduler.sql`. Migration tạo helper transaction và RPC chỉ cho `service_role`; cần apply trên Supabase trước khi deploy function.

## Tests
27 unit/schema tests pass; lint và Next production build pass. Edge Function cần integration test trên Supabase thật.

## Follow-up
Deploy Edge Function, đặt `SUPABASE_SERVICE_ROLE_KEY` và `SCHEDULER_SECRET`, cấu hình cron 5–15 phút/lần, rồi kiểm thử với test user.
