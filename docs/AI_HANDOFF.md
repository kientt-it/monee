# AI handoff

## Current project state
Version 0.1.0. Foundation đã được khởi tạo bằng Next.js App Router + TypeScript strict + Tailwind, với dashboard preview mobile-first.

## Working
- Root `/` hiển thị dashboard mẫu responsive.
- `/login`, `/register`, `/forgot-password`, `/auth/callback` đã có khung Supabase Auth.
- Middleware bảo vệ `/app/*` khi Supabase env có mặt.
- Manifest, icon, service worker shell và error/loading boundaries đã có.
- Migration nền tảng có schema, RLS, seed, indexes, Storage policies và atomic RPC create/recalculate.

## Recently completed
2026-09-07: Phase 0–1 foundation, docs system, shared UI primitives, finance schemas/calculations.

## Next priorities
1. Kết nối Supabase project/env và apply migration.
2. Onboarding + profile + accounts CRUD.
3. Transaction form dùng RHF/Zod gọi RPC, rồi edit/delete atomic.
4. Thêm unit/integration tests và chuyển dashboard từ sample sang server data.

## Rules to preserve
Amount dương BIGINT; transfer không vào income/expense; balance chỉ thay đổi atomic qua RPC; RLS không thay bằng frontend filtering; mọi thay đổi đáng kể phải cập nhật docs và tạo file trong `docs/changes/`.

## Files to read first
`docs/PROJECT_CONTEXT.md`, `docs/AI_HANDOFF.md`, `docs/BUSINESS_LOGIC.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `supabase/migrations/202609071600_initial_foundation.sql`.
