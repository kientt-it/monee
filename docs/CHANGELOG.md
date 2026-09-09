# Changelog

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
