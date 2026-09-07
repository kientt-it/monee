# Known issues

- Chưa có Supabase project/env trong workspace nên auth và database chưa thể chạy end-to-end.
- Dashboard hiện hiển thị dữ liệu mẫu có nhãn bản xem trước; chưa được xem là dữ liệu người dùng.
- Service worker mới cache shell, chưa có offline write queue.
- Route UI cho các feature phụ và E2E chưa hoàn thiện.
- Chưa có kiểm thử runner trong package scripts; cần thêm ở phase Transactions.
- Site publishing chưa thực hiện: Next.js server output cần được đóng gói bằng runtime tương thích Cloudflare trước khi phát hành production.
