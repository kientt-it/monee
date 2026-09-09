# Quản lý định kỳ và thông báo

## Change
Thêm màn hình quản lý giao dịch định kỳ và trung tâm thông báo cơ bản.

## Goal
Cho người dùng lưu các khoản lặp lại với ngày chạy tiếp theo, bật/tắt lịch an toàn và xem các cập nhật chưa đọc trong một nơi riêng.

## New behavior
`/app/recurring` hỗ trợ create/edit cho expense, income và transfer; chọn frequency, interval, account/category và ngày chạy tiếp theo. `/app/notifications` hiển thị thông báo theo user, đánh dấu một mục hoặc tất cả là đã đọc. Dashboard bell và desktop navigation đã nối tới các route này.

## Business logic impact
Recurring chỉ là cấu hình lịch, chưa tự thay đổi account balance. Khi triển khai scheduler, mỗi lần chạy phải gọi flow transaction atomic và ghi execution log/idempotency. Mark read chỉ cập nhật trạng thái notification.

## Database changes
Không có migration mới; dùng các bảng recurring, execution logs và notifications đã có trong migration nền tảng.

## Tests
Thêm 3 schema tests cho recurring. Tổng 27 tests pass; lint và Next production build pass.

## Follow-up
Triển khai Edge Function scheduler, sinh notification khi có sự kiện và bổ sung authenticated integration tests.
