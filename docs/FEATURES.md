# Features

| Feature | Status | Notes |
|---|---|---|
| Mobile dashboard | Implemented | `/app` đọc dữ liệu Supabase thật; `/` điều hướng vào luồng Auth, không còn dữ liệu mẫu |
| App navigation | Implemented | Sidebar desktop và bottom navigation mobile dùng chung cho toàn bộ `/app/*`; mobile có menu “Khác” cho các màn phụ |
| Auth + onboarding | Implemented core | Login/register/recovery, route protection, onboarding, profile, theme và sign-out; cần E2E |
| Accounts | Implemented MVP core | Create/edit/archive/restore, include-in-total, lịch sử giữ account archived; delete vĩnh viễn không hỗ trợ |
| Transactions | Implemented MVP core | List/detail/create/edit/soft-delete/undo; atomic RPC; server-side type/month filters; pagination; 9 domain tests; receipt planned |
| Monthly loans | Implemented | `/app/loans`: create/edit, fixed monthly installment/first due date/term, monthly paid/overdue status, mark/undo, archive/restore; requires migration `202609100900_monthly_loans.sql`. Tracking only; does not debit accounts. |
| Reports | Implemented MVP core | `/app/reports`: week/month/year/custom, summary thu-chi-ròng-saving rate, top categories và trend chart |
| Saving goals | Implemented MVP core | `/app/goals`: create/edit, target date/account, progress, pause/resume và contribution history qua atomic RPC |
| Notifications | Implemented core | `/app/notifications`: list, unread state, mark one/all read |
| PWA | Partial | Manifest, icon, service worker shell |
