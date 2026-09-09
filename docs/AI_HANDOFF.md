# AI handoff

## Current project state
Version 0.4.0. Foundation, Accounts và Transactions MVP core đã có bằng Next.js App Router + TypeScript strict + Tailwind. Supabase dev đã được kết nối; dashboard trong khu vực đăng nhập đọc dữ liệu thật.

## Working
- Root `/` hiển thị dashboard mẫu responsive; `/app` tổng hợp profile, account, giao dịch tháng, ngân sách, mục tiêu và thông báo từ Supabase.
- `/login`, `/register`, `/forgot-password`, `/auth/callback` đã có khung Supabase Auth.
- Middleware bảo vệ `/app/*` khi Supabase env có mặt.
- Manifest, icon, service worker shell và error/loading boundaries đã có.
- Migration nền tảng có schema, RLS, seed, indexes, Storage policies và atomic RPC create/recalculate.
- Site đã được đăng ký để chuẩn bị hosting, nhưng chưa deploy vì chưa có adapter Next server → Cloudflare Worker phù hợp với SSR/auth.
- `/app/accounts` đã có danh sách account và create flow với React Hook Form + Zod; không có Supabase env thì chỉ hiển thị demo và chặn lưu thật.
- `/app/transactions` và `/app/transactions/new` có list/form; create action gọi `create_financial_transaction` với idempotency key.
- `/app/transactions/[id]` và `/edit` đã có detail/edit/soft-delete. Migration thứ hai thêm update/delete/restore RPC và revoke direct writes. 9 domain tests đang pass.
- Cấu hình chấp nhận cả `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` mới và tên cũ `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Recently completed
2026-09-09: Kết nối cấu hình Supabase publishable key và chuyển dashboard bảo vệ sang dữ liệu thật, có empty states.

## Next priorities
1. Onboarding + profile + hoàn thiện accounts CRUD (edit/archive).
2. Thêm integration tests có user test cho RPC rollback/ownership/idempotency.
3. Hoàn thiện budgets CRUD và báo cáo theo thời gian.
4. Nối Undo UI với `restore_financial_transaction`.

## Rules to preserve
Amount dương BIGINT; transfer không vào income/expense; balance chỉ thay đổi atomic qua RPC; RLS không thay bằng frontend filtering; mọi thay đổi đáng kể phải cập nhật docs và tạo file trong `docs/changes/`.

## Files to read first
`docs/PROJECT_CONTEXT.md`, `docs/AI_HANDOFF.md`, `docs/BUSINESS_LOGIC.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, hai migration trong `supabase/migrations`, và `docs/changes/2026-09-07-transaction-edit-delete.md`.
