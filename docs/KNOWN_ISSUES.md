# Known issues

- Root `/` yêu cầu Supabase env để hoàn tất điều hướng Auth; dashboard thật nằm tại `/app` sau đăng nhập.
- Service worker mới cache shell, chưa có offline write queue.
- Route UI cho một số feature phụ và E2E chưa hoàn thiện.
- Budget progress hiện tập trung vào kỳ hiện tại; chưa có notification job tự động khi chạm `alert_threshold`.
- Report custom hiện gom xu hướng theo tháng; chưa có export CSV/PDF hoặc so sánh hai kỳ.
- Contribution hiện là khoản theo dõi mục tiêu, chưa tự tạo transaction hoặc trừ số dư tài khoản liên kết.
- Chưa có authenticated Supabase integration tests cho RPC rollback/ownership/idempotency; unit tests hiện kiểm tra domain effect/reverse ở TypeScript.
- Auth/onboarding/password recovery chưa có E2E tự động với email thật.
- Site publishing chưa thực hiện: Next.js server output cần được đóng gói bằng runtime tương thích Cloudflare trước khi phát hành production.
