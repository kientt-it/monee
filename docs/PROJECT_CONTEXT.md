# Project context

## Purpose
Monee giúp người dùng Việt Nam ghi nhận giao dịch, hiểu dòng tiền và đặt mục tiêu tiết kiệm.

## Target users
Người dùng cá nhân trên điện thoại; tiền mặc định là VND, locale vi và múi giờ Asia/Ho_Chi_Minh.

## Stack
Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui primitives, Supabase Auth/PostgreSQL/Storage, React Hook Form, Zod, Recharts, date-fns và Lucide.

## Current status
Version 0.20.0. Supabase đã kết nối; Auth/profile, Accounts, Transactions, Reports, Goals và Notifications đã có. Khoản vay đóng hằng tháng thay Ngân sách, cần migration `202609100900_monthly_loans.sql`; dữ liệu budget cũ giữ nguyên. Đã sửa ô ngày giao dịch mobile và chừa khoảng trống thanh điều hướng. Loan schedule/RLS/RPC có kiểm thử tự động; cần xác minh live sau khi deploy. Recurring/scheduler đã được loại khỏi sản phẩm.

## Non-negotiables
Amount là số dương BIGINT; expense trừ, income cộng, transfer chuyển giữa hai account và không vào báo cáo thu/chi. Mọi mutation tài chính phải atomic qua RPC, có validation server và RLS; không expose service role.
