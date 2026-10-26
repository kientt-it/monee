# Features

| Feature | Status | Notes |
|---|---|---|
| Mobile dashboard | Implemented | `/app` đọc dữ liệu Supabase thật; `/` điều hướng vào luồng Auth, không còn dữ liệu mẫu |
| App navigation | Implemented | Sidebar desktop và bottom navigation mobile dùng chung cho toàn bộ `/app/*`; mobile có menu “Khác” cho các màn phụ |
| Auth + onboarding | Implemented core | Login/register/recovery, route protection, onboarding, profile, theme và sign-out; cần E2E |
| Accounts | Implemented MVP core | Create/edit/archive/restore, include-in-total, lịch sử giữ account archived; delete vĩnh viễn không hỗ trợ |
| Transactions | Implemented MVP core | List/detail/create/edit/soft-delete/undo; atomic RPC; server-side type/month filters; pagination; 9 domain tests; receipt planned |
| Khoản cần trả | Implemented | `/app/payables`: thêm/sửa/xóa, chọn và xóa hàng loạt, lọc theo ngày/tháng/tất cả, đánh dấu đã trả/hoàn tác; cần migration `202610261200_payables.sql`. Chỉ theo dõi, không trừ số dư. |
| Reports | Implemented MVP core | `/app/reports`: week/month/year/custom, summary thu-chi-ròng-saving rate, top categories và trend chart |
| Saving goals | Implemented MVP core | `/app/goals`: create/edit/delete, target date/account, progress, pause/resume và contribution history qua atomic RPC; xóa mục tiêu sẽ xóa lịch sử đóng góp liên quan |
| Notifications | Implemented core | `/app/notifications`: list, unread state, mark one/all read |
| PWA | Partial | Manifest, icon, service worker shell |
