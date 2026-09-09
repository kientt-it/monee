# Recurring removal and navigation performance · 2026-09-09

## Delivered

- Gỡ màn hình, action, query, schema, test và Edge Function của recurring khỏi source.
- URL cũ `/app/recurring` redirect về `/app` để bookmark cũ không bị lỗi.
- Bỏ kiểm tra recurring thừa khi lưu trữ tài khoản.
- Thêm migration cleanup để dừng cron job scheduler và gỡ RPC scheduler, giữ nguyên dữ liệu recurring cũ.
- Prefetch route theo ý định hover/focus/chạm và bỏ refresh dư sau khi điều hướng để chuyển tab nhanh hơn.

## Validation

- Lint, build và test được chạy sau khi chỉnh sửa.
