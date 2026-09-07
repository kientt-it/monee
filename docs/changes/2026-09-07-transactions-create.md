# Transaction create flow

## Change
Thêm transaction list và form tạo Expense/Income/Transfer.

## Goal
Đặt luồng thao tác quan trọng nhất trên mobile, giữ amount dương và để PostgreSQL RPC làm source of truth cho balance.

## New behavior
`/app/transactions` hiển thị lịch sử; `/app/transactions/new` dùng RHF/Zod, amount format theo locale, chọn account/category/date và gọi server action. Khi thiếu Supabase env, form hiển thị preview và không báo lưu thành công.

## Database changes
Không thêm migration; dùng `transactions` và `create_financial_transaction` trong migration nền tảng.

## Business logic impact
Expense/income/transfer được chuyển nguyên vẹn tới RPC; transfer không có category và yêu cầu account đích khác nguồn. Idempotency key tạo ở server action để tránh duplicate khi retry.

## Risks
Edit/delete, filter thật, pagination và test RPC chưa có.

## Tests
Đã chạy build và lint sau thay đổi.

## Follow-up
Thêm edit/delete atomic, server-side filters và unit/integration tests cho balance.
