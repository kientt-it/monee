# Features

| Feature | Status | Notes |
|---|---|---|
| Mobile dashboard | Implemented | `/app` đọc dữ liệu Supabase thật; `/` điều hướng vào luồng Auth, không còn dữ liệu mẫu |
| App navigation | Implemented | Sidebar desktop và bottom navigation mobile dùng chung cho toàn bộ `/app/*`; mobile có menu “Khác” cho các màn phụ |
| Auth + onboarding | Implemented core | Login/register/recovery, route protection, onboarding, profile, theme và sign-out; cần E2E |
| Accounts | Implemented MVP core | Create/edit/archive/restore; thẻ tín dụng có ô riêng cho hạn mức và khả dụng, không tính vào tổng tài sản; cần migration `202610261500_credit_card_limits.sql` |
| Transactions | Implemented MVP core | List/detail/create/edit/soft-delete/undo; nút Chọn, Chọn tất cả trang hiện tại và xóa nhiều giao dịch bằng RPC atomic; server-side type/month filters; pagination; cần migration `202610261300_bulk_delete_transactions.sql`; receipt planned |
| Khoản cần trả | Implemented | Khoản thủ công: thêm/sửa/xóa, lọc ngày, đánh dấu đã trả. Mỗi thẻ tín dụng có một khoản hoàn trả không có ngày; trả một phần bằng transfer từ tài khoản nguồn và tính lại từ hạn mức trừ khả dụng. Cần migration 1200, 1400 và `202610261500_credit_card_limits.sql`. |
| Tính hụi | Implemented | `/app/hui`: nhập số chân, số chân đã hốt, giá mở hụi sống, mức hụi chết, mức bỏ kỳ này và tiền công để tính tổng hụi, tiền thực cầm và các kỳ còn đóng; truy cập ở sidebar desktop hoặc menu Khác trên điện thoại. |
| Reports | Implemented MVP core | `/app/reports`: week/month/year/custom, summary thu-chi-ròng-saving rate, top categories và trend chart |
| Saving goals | Implemented MVP core | `/app/goals`: create/edit/delete, target date/account, progress, pause/resume và contribution history qua atomic RPC; xóa mục tiêu sẽ xóa lịch sử đóng góp liên quan |
| Notifications | Implemented core | `/app/notifications`: list, unread state, mark one/all read |
| PWA | Partial | Manifest, icon, service worker shell |
