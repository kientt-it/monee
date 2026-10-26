# Known issues

- Root `/` yêu cầu Supabase env để hoàn tất điều hướng Auth; dashboard thật nằm tại `/app` sau đăng nhập.
- Service worker mới cache shell, chưa có offline write queue.
- Route UI cho một số feature phụ và E2E chưa hoàn thiện.
- Khoản cần trả chỉ theo dõi các mục và trạng thái đã trả; chưa tự tạo giao dịch chi tiêu hoặc trừ tài khoản. Cần apply migration `202610261200_payables.sql` trước khi dùng.
- Report custom hiện gom xu hướng theo tháng; chưa có export CSV/PDF hoặc so sánh hai kỳ.
- Contribution hiện là khoản theo dõi mục tiêu, chưa tự tạo transaction hoặc trừ số dư tài khoản liên kết.
- Payables migration/RLS/xóa hàng loạt đã có kiểm thử PostgreSQL 16 cô lập; Supabase production với Auth thật và các RPC tài chính khác vẫn cần integration tests.
- Auth/onboarding/password recovery chưa có E2E tự động với email thật.
- Site publishing chưa thực hiện: Next.js server output cần được đóng gói bằng runtime tương thích Cloudflare trước khi phát hành production.
