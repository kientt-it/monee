# Changelog

## 2026-09-09 · 0.12.0

### Added
- Nút “Hoàn tác” sau khi soft-delete giao dịch, gọi RPC restore an toàn và giữ nguyên số dư.
- Bộ lọc giao dịch theo loại và tháng hiện tại với query server-side.
- Phân trang danh sách giao dịch, mỗi trang tối đa 50 dòng.

### Changed
- Danh sách giao dịch hiển thị đúng trạng thái bộ lọc và tiêu đề kỳ xem.

## 2026-09-09 · 0.11.0

### Added
- Migration scheduler với RPC `process_due_recurring_transactions`, execution log chống trùng và transaction helper service-role.
- Edge Function `supabase/functions/recurring-scheduler` bảo vệ bằng secret, xử lý due schedules và sinh notification thành công/thất bại.
- 3 schema tests cho recurring; tổng cộng 27 tests pass.

### Changed
- Recurring từ quản lý cấu hình đã có đường thực thi server-side; vẫn cần deploy function và cấu hình cron để chạy tự động.

## 2026-09-09 · 0.10.0

### Added
- Trang `/app/recurring` với create/edit, loại giao dịch, frequency, next run date và bật/tắt lịch.
- Trang `/app/notifications` với trạng thái chưa đọc và đánh dấu đã đọc một hoặc tất cả.
- 3 schema tests cho recurring; tổng cộng 27 tests pass.

### Changed
- Dashboard bell mở trang thông báo; desktop navigation có thêm Định kỳ và Thông báo.
- Recurring chưa thực thi giao dịch cho đến khi scheduler được bật.

## 2026-09-09 · 0.9.0

### Added
- Trang `/app/goals` với create/edit, target date/account, progress, pause/resume và contribution history.
- RPC atomic `add_saving_goal_contribution` cập nhật contribution và cached goal amount cùng lúc.
- 3 schema tests cho goal/contribution; tổng cộng 24 tests pass.

### Changed
- Dashboard mục tiêu hiện có route quản lý thật phía sau liên kết `/app/goals`.

## 2026-09-09 · 0.8.0

### Added
- Trang `/app/reports` với bộ lọc tuần/tháng/năm/tùy chỉnh.
- Summary thu nhập, chi tiêu, dòng tiền ròng, tỷ lệ tiết kiệm, nhóm chi tiêu và biểu đồ xu hướng 6 tháng/8 tuần/5 năm.
- 3 tests cho logic chọn kỳ báo cáo; tổng cộng 21 tests pass.

### Changed
- Báo cáo chỉ tính các khoản income/expense chưa soft-delete; transfer không xuất hiện trong thu/chi.

## 2026-09-09 · 0.7.0

### Added
- Trang `/app/budgets` với create/edit, ngân sách theo danh mục hoặc toàn bộ chi tiêu và các chu kỳ weekly/monthly/yearly/custom.
- Tính tiến độ, số tiền còn lại, trạng thái cảnh báo và bật/tắt budget để giữ lịch sử.
- 3 schema tests cho budget; tổng cộng 18 tests pass.

### Changed
- Dashboard link Ngân sách hiện trỏ tới màn hình quản lý thật.
- Không thêm migration; dùng bảng `budgets`, RLS và categories hiện có.

## 2026-09-07 · 0.3.0

### Added
- Khởi tạo Next.js App Router + TypeScript strict + Tailwind.
- Mobile-first dashboard preview và responsive desktop sidebar.
- Supabase SSR/auth foundation, PWA manifest/service worker.
- Migration PostgreSQL đầu tiên với tables, RLS, indexes, seed categories, storage policies và atomic transaction RPC.
- Bộ tài liệu dự án và domain schemas/calculations.
- Trang Accounts với tổng số dư, dữ liệu mẫu có nhãn và form tạo account qua server action.
- Trang Transactions, form Expense/Income/Transfer và create action qua atomic RPC.
- Transaction detail/edit/delete UI; RPC update/soft-delete/restore với row locks và reverse/apply atomic.
- Vitest và 9 test cases cho balance effects, saving rate, budget thresholds.

### Changed
- Revoke quyền client thay đổi trực tiếp transaction và cached account balance.
