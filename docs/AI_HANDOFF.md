# AI handoff

## Current project state
Version 0.9.0. Foundation, onboarding/profile, Accounts, Transactions, Budgets, Reports và Saving Goals MVP core đã có bằng Next.js App Router + TypeScript strict + Tailwind. Supabase dev đã được kết nối; dashboard trong khu vực đăng nhập đọc dữ liệu thật.

## Working
- Root `/` hiển thị dashboard mẫu responsive; `/app` tổng hợp profile, account, giao dịch tháng, ngân sách, mục tiêu và thông báo từ Supabase.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback` đã có luồng Supabase Auth.
- Proxy bảo vệ `/app/*`, đưa user chưa hoàn tất hồ sơ đến `/app/onboarding` và bỏ qua onboarding cho user cũ.
- `/app/settings/profile` cho phép sửa tên, giao diện sáng/tối/theo thiết bị và đăng xuất. Preference được lưu trong profile và đồng bộ khi vào app.
- Manifest, icon, service worker shell và error/loading boundaries đã có.
- Migration nền tảng có schema, RLS, seed, indexes, Storage policies và atomic RPC create/recalculate.
- Site đã được đăng ký để chuẩn bị hosting, nhưng chưa deploy vì chưa có adapter Next server → Cloudflare Worker phù hợp với SSR/auth.
- `/app/accounts` có create/edit/archive/restore, tùy chọn include-in-total và giữ khu vực account đã lưu trữ. Archive bị chặn khi còn recurring transaction active.
- `/app/transactions` và `/app/transactions/new` có list/form; create action gọi `create_financial_transaction` với idempotency key.
- `/app/transactions/[id]` và `/edit` đã có detail/edit/soft-delete. Migration thứ hai thêm update/delete/restore RPC và revoke direct writes. 21 tests đang pass.
- `/app/budgets` có create/edit, ngân sách theo danh mục hoặc toàn bộ chi tiêu, chu kỳ tuần/tháng/năm/tùy chỉnh, ngưỡng cảnh báo, progress theo kỳ hiện tại và bật/tắt để giữ lịch sử.
- `/app/reports` có báo cáo tuần/tháng/năm/tùy chỉnh; hiển thị thu nhập, chi tiêu, dòng tiền ròng, tỷ lệ tiết kiệm, nhóm chi tiêu và biểu đồ xu hướng. Dữ liệu chỉ lấy transaction expense/income chưa xóa mềm.
- `/app/goals` có create/edit, mục tiêu theo target date/account, progress, tạm dừng/tiếp tục và thêm contribution. Contribution gọi RPC atomic để cập nhật lịch sử và cached `current_amount` cùng lúc.
- Cấu hình chấp nhận cả `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` mới và tên cũ `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Recently completed
2026-09-09: Hoàn thiện Accounts edit/archive/restore và bảo toàn tên account đã lưu trữ trong lịch sử giao dịch.

## Next priorities
1. Thêm integration tests có user test cho RPC rollback/ownership/idempotency và auth critical flows.
2. Nối Undo UI với `restore_financial_transaction`, sau đó bổ sung transaction filters/pagination.
3. Hoàn thiện recurring scheduler và notification job.
4. Bổ sung offline retry, E2E, transaction filters/pagination và production adapter.

## Rules to preserve
Amount dương BIGINT; transfer không vào income/expense; balance chỉ thay đổi atomic qua RPC; RLS không thay bằng frontend filtering; mọi thay đổi đáng kể phải cập nhật docs và tạo file trong `docs/changes/`.

## Files to read first
`docs/PROJECT_CONTEXT.md`, `docs/AI_HANDOFF.md`, `docs/BUSINESS_LOGIC.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, hai migration trong `supabase/migrations`, và `docs/changes/2026-09-09-accounts-edit-archive.md`.
