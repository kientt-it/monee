# Project context

## Purpose
Monee giúp người dùng Việt Nam ghi nhận giao dịch, hiểu dòng tiền và đặt mục tiêu tiết kiệm.

## Target users
Người dùng cá nhân trên điện thoại; tiền mặc định là VND, locale vi và múi giờ Asia/Ho_Chi_Minh.

## Stack
Next.js App Router, TypeScript strict, Tailwind CSS, shadcn/ui primitives, Supabase Auth/PostgreSQL/Storage, React Hook Form, Zod, Recharts, date-fns và Lucide.

## Current status
Version 0.3.0. Foundation, Accounts và Transactions create/edit/soft-delete đã có; financial balance effects được kiểm thử tự động. Supabase project thật vẫn chưa được cấu hình.

## Non-negotiables
Amount là số dương BIGINT; expense trừ, income cộng, transfer chuyển giữa hai account và không vào báo cáo thu/chi. Mọi mutation tài chính phải atomic qua RPC, có validation server và RLS; không expose service role.
