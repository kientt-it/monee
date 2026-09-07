# Foundation setup

## Change
Khởi tạo Monee từ workspace trống theo Phase 0–1.

## Goal
Đặt nền móng chạy được, an toàn và dễ bàn giao cho các phase giao dịch tiếp theo.

## New behavior
Có dashboard preview, auth routes, Supabase SSR clients/middleware, PWA shell và database foundation với RLS/RPC.

## Files changed
Next app source, `supabase/migrations/202609071600_initial_foundation.sql`, `.env.example`, `docs/*`.

## Database changes
Tạo schema, enum, indexes, seed categories, trigger profile, storage buckets/policies và RPC create/recalculate.

## Risks
Chưa apply migration vào project Supabase thật; auth UI sẽ cần env để hoạt động.

## Tests
Đã chạy build sau khi hoàn thiện foundation (xác nhận ở session handoff cuối). Chưa có unit/E2E runner.

## Follow-up
Kết nối Supabase, kiểm tra migration trên project dev, sau đó triển khai accounts và transaction RPC integration.
