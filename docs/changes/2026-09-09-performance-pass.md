# Performance pass

## Delivered

- Tắt prefetch cho các liên kết điều hướng dùng chung để tránh tạo nhiều request ngầm khi mở app.
- Dùng chung Supabase auth context trong cùng server render giữa layout và các query page.
- Bỏ các cột transaction không dùng khỏi truy vấn tổng hợp Dashboard.
- Thêm skeleton loading theo layout Dashboard để phản hồi thị giác nhanh hơn.

## Validation

- `npm run lint`
- `npm run test` — 27 tests passed
- `npm run build`
