# AI handoff

## Current project state
Version 0.20.0. Foundation, onboarding/profile, Accounts, Transactions, Monthly Loans, Reports, Saving Goals và Notifications MVP core đã có bằng Next.js App Router + TypeScript strict + Tailwind. Supabase dev đã được kết nối; dashboard trong khu vực đăng nhập đọc dữ liệu thật. Khoản vay cần apply migration `202609100900_monthly_loans.sql` trên Supabase.

## Working
- Root `/` điều hướng theo phiên Supabase: chưa đăng nhập vào `/login`, đã đăng nhập vào `/app`; `/app` tổng hợp profile, account, giao dịch tháng, khoản vay, mục tiêu và thông báo từ Supabase.
- Layout khu vực `/app/*` dùng chung sidebar desktop và bottom navigation mobile; route hiện tại được đánh dấu và các màn không còn bị đứng riêng lẻ.
- Hiệu năng điều hướng đã được cải thiện: route chỉ prefetch khi người dùng hover/chạm/focus, auth context được dùng chung trong cùng request, Dashboard giảm payload transaction và route loading có skeleton.
- Mobile có mục “Khác” trong bottom navigation để truy cập trực tiếp các màn Tài khoản, Khoản vay, Mục tiêu, Thông báo và Cá nhân.
- Toaster dùng chung ở root; các thao tác lưu, cập nhật, xóa, khôi phục, bật/tắt, Auth và đăng xuất đều có phản hồi success/error bằng toast.
- Toast là phản hồi trạng thái chính; message inline trùng đã bỏ, chỉ giữ validation cạnh trường nhập và banner “Hoàn tác” có nút hành động.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback` đã có luồng Supabase Auth.
- Proxy bảo vệ `/app/*`, đưa user chưa hoàn tất hồ sơ đến `/app/onboarding` và bỏ qua onboarding cho user cũ.
- `/app/settings/profile` cho phép sửa tên, giao diện sáng/tối/theo thiết bị và đăng xuất. Preference được lưu trong profile và đồng bộ khi vào app.
- Manifest, icon, service worker shell và error/loading boundaries đã có.
- Migration nền tảng có schema, RLS, seed, indexes, Storage policies và atomic RPC create/recalculate.
- Site đã được đăng ký để chuẩn bị hosting, nhưng chưa deploy vì chưa có adapter Next server → Cloudflare Worker phù hợp với SSR/auth.
- `/app/accounts` có create/edit/archive/restore, tùy chọn include-in-total và giữ khu vực account đã lưu trữ.
- `/app/transactions` và `/app/transactions/new` có list/form; create action gọi `create_financial_transaction` với idempotency key. Danh sách có filter loại/tháng, phân trang 50 dòng và undo sau soft-delete.
- `/app/transactions/[id]` và `/edit` đã có detail/edit/soft-delete. Migration thứ hai thêm update/delete/restore RPC và revoke direct writes. DateInput dùng flex tách icon để tránh chồng ngày iOS; form chừa chỗ bottom nav. 27 tests đang pass.
- `/app/loans` thay Ngân sách: create/edit, fixed installment/term/first due date, xem tháng, đánh dấu/hoàn tác đóng, quá hạn, archive/restore. Chỉ theo dõi, không trừ account. `/app/budgets` redirect; dữ liệu budget cũ giữ nguyên. Loan RLS/RPC đã kiểm thử PostgreSQL 16 độc lập.
- `/app/reports` có báo cáo tuần/tháng/năm/tùy chỉnh; hiển thị thu nhập, chi tiêu, dòng tiền ròng, tỷ lệ tiết kiệm, nhóm chi tiêu và biểu đồ xu hướng. Dữ liệu chỉ lấy transaction expense/income chưa xóa mềm.
- `/app/goals` có create/edit, mục tiêu theo target date/account, progress, tạm dừng/tiếp tục và thêm contribution. Contribution gọi RPC atomic để cập nhật lịch sử và cached `current_amount` cùng lúc.
- `/app/recurring` là URL tương thích cũ và chuyển về `/app`; `/app/notifications` hiển thị 50 thông báo gần nhất và đánh dấu đã đọc từng mục hoặc tất cả.
- Cấu hình chấp nhận cả `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` mới và tên cũ `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Recently completed
2026-09-10: Sửa ô ngày mobile và thay Ngân sách bằng Khoản vay hằng tháng. Không thêm cron; migration mới cần apply trước khi dùng live.

## Next priorities
1. Thêm integration tests có user test cho RPC rollback/ownership/idempotency và auth critical flows.
2. Bổ sung offline retry, E2E và production adapter.

## Rules to preserve
Amount dương BIGINT; transfer không vào income/expense; balance chỉ thay đổi atomic qua RPC; RLS không thay bằng frontend filtering; mọi thay đổi đáng kể phải cập nhật docs và tạo file trong `docs/changes/`.

## Files to read first
`docs/PROJECT_CONTEXT.md`, `docs/AI_HANDOFF.md`, `docs/BUSINESS_LOGIC.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, các migration trong `supabase/migrations`, và `docs/changes/2026-09-09-performance-pass.md`.
