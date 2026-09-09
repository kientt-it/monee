# Transaction undo and filters

## Delivered

- Soft-delete giao dịch chuyển về danh sách kèm nút “Hoàn tác”.
- Hoàn tác gọi `restore_financial_transaction`, giữ logic hoàn số dư ở database và tự làm mới danh sách.
- Bộ lọc `Tất cả`, `Chi tiêu`, `Thu nhập` và `Tháng này` dùng query params, được áp dụng trong truy vấn Supabase sau RLS.
- Danh sách tải theo trang 50 dòng, có điều hướng trang trước/sau.

## Validation

- `npm run lint`
- `npm run test` — 27 tests pass
- `npm run build`
