# Changelog

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
