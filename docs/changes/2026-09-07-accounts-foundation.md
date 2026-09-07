# Accounts foundation

## Change
Thêm trang Accounts và luồng tạo tài khoản đầu tiên.

## Goal
Cho phép người dùng xem tổng số dư, tài khoản đang hoạt động và tạo account qua server-side validation.

## New behavior
`/app/accounts` fetches accounts bằng Supabase SSR khi env đã cấu hình; khi chưa có env, hiển thị demo data có nhãn rõ ràng. Form dùng React Hook Form + Zod và gọi server action.

## Database changes
Không thêm migration; dùng bảng `accounts`, RLS hiện có và lưu `initial_balance/current_balance` bằng cùng một giá trị ban đầu.

## Risks
Edit/archive chưa có; dashboard vẫn dùng sample data và chưa đọc accounts thật.

## Tests
Đã chạy build và lint sau thay đổi.

## Follow-up
Hoàn thiện edit/archive, cập nhật dashboard từ accounts query, rồi thêm transaction form gọi RPC.
