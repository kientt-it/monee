# Known issues

## Repayment workspace 02/11/2026

- Migration mới chưa được áp dụng lên Supabase; cần staging/đối soát trước cutover.
- Liên kết payment trả góp cũ chưa có kỳ xác định, không tự backfill sang kỳ theo tháng tiền ra; công cụ đối soát còn là phần tiếp theo.
- Import Excel, sửa lịch tùy chỉnh/gốc-lãi nâng cao, thanh toán batch và dự báo số dư từng ngày chưa thuộc đợt đầu. Không xóa legacy trước khi hoàn tất đối soát.
- Turbopack trong môi trường Windows hiện tại lỗi worker CSS; webpack production build bằng bundled Node LTS đã qua. Không sửa default bundler dự án.

Các mục payables/allocations cũ bên dưới mô tả đường chạy trước cutover.

- Root `/` yêu cầu Supabase env để hoàn tất điều hướng Auth; dashboard thật nằm tại `/app` sau đăng nhập.
- Service worker mới cache shell, chưa có offline write queue.
- Route UI cho một số feature phụ và E2E chưa hoàn thiện.
- Khoản cần trả chỉ theo dõi các mục và trạng thái đã trả; chưa tự tạo giao dịch chi tiêu hoặc trừ tài khoản. Cần apply migration `202610261200_payables.sql` trước khi dùng.
- Report custom hiện gom xu hướng theo tháng; chưa có export CSV/PDF hoặc so sánh hai kỳ.
- Contribution hiện là khoản theo dõi mục tiêu, chưa tự tạo transaction hoặc trừ số dư tài khoản liên kết.
- Payables migration/RLS/xóa hàng loạt đã có kiểm thử PostgreSQL 16 cô lập; Supabase production với Auth thật và các RPC tài chính khác vẫn cần integration tests.
- Auth/onboarding/password recovery chưa có E2E tự động với email thật.
- Site publishing chưa thực hiện: Next.js server output cần được đóng gói bằng runtime tương thích Cloudflare trước khi phát hành production.
