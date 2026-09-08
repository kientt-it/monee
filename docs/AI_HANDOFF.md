# AI handoff

## Current project state
Version 0.3.0. Foundation, Accounts và Transactions MVP core đã có bằng Next.js App Router + TypeScript strict + Tailwind, với dashboard preview mobile-first.

## Working
- Root `/` hiển thị dashboard mẫu responsive.
- `/login`, `/register`, `/forgot-password`, `/auth/callback` đã có khung Supabase Auth.
- Middleware bảo vệ `/app/*` khi Supabase env có mặt.
- Manifest, icon, service worker shell và error/loading boundaries đã có.
- Migration nền tảng có schema, RLS, seed, indexes, Storage policies và atomic RPC create/recalculate.
- Site đã được đăng ký để chuẩn bị hosting, nhưng chưa deploy vì chưa có adapter Next server → Cloudflare Worker phù hợp với SSR/auth.
- `/app/accounts` đã có danh sách account và create flow với React Hook Form + Zod; không có Supabase env thì chỉ hiển thị demo và chặn lưu thật.
- `/app/transactions` và `/app/transactions/new` có list/form; create action gọi `create_financial_transaction` với idempotency key.
- `/app/transactions/[id]` và `/edit` đã có detail/edit/soft-delete. Migration thứ hai thêm update/delete/restore RPC và revoke direct writes. 9 domain tests đang pass.

## Recently completed
2026-09-07: Transaction edit/delete atomic, direct-write hardening và unit tests tài chính.

## Next priorities
1. Kết nối Supabase project/env và apply migration.
2. Onboarding + profile + hoàn thiện accounts CRUD (edit/archive).
3. Apply migrations lên Supabase dev và thêm integration tests cho RPC rollback/ownership/idempotency.
4. Chuyển dashboard từ sample sang server data, sau đó budgets.

## Rules to preserve
Amount dương BIGINT; transfer không vào income/expense; balance chỉ thay đổi atomic qua RPC; RLS không thay bằng frontend filtering; mọi thay đổi đáng kể phải cập nhật docs và tạo file trong `docs/changes/`.

## Files to read first
`docs/PROJECT_CONTEXT.md`, `docs/AI_HANDOFF.md`, `docs/BUSINESS_LOGIC.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, hai migration trong `supabase/migrations`, và `docs/changes/2026-09-07-transaction-edit-delete.md`.
