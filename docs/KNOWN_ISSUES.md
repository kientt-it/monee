# Known issues

- Root `/` cố ý giữ dữ liệu mẫu để preview; dashboard thật nằm tại `/app` sau đăng nhập.
- Service worker mới cache shell, chưa có offline write queue.
- Route UI cho các feature phụ và E2E chưa hoàn thiện.
- Chưa có authenticated Supabase integration tests cho RPC rollback/ownership/idempotency; unit tests hiện kiểm tra domain effect/reverse ở TypeScript.
- Auth/onboarding/password recovery chưa có E2E tự động với email thật.
- Site publishing chưa thực hiện: Next.js server output cần được đóng gói bằng runtime tương thích Cloudflare trước khi phát hành production.
