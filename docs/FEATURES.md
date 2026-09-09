# Features

| Feature | Status | Notes |
|---|---|---|
| Mobile dashboard | Implemented | `/app` đọc dữ liệu Supabase thật; `/` giữ preview có nhãn dữ liệu mẫu |
| Auth + onboarding | Implemented core | Login/register/recovery, route protection, onboarding, profile, theme và sign-out; cần E2E |
| Accounts | Implemented MVP core | Create/edit/archive/restore, include-in-total, lịch sử giữ account archived; delete vĩnh viễn không hỗ trợ |
| Transactions | Implemented MVP core | List/detail/create/edit/soft-delete; atomic RPC; 9 domain tests; filters/pagination/receipt planned |
| Budgets | Implemented MVP core | `/app/budgets`: create/edit, category/all spending, weekly/monthly/yearly/custom periods, current-period progress, warning threshold, active/inactive history |
| Reports | Implemented MVP core | `/app/reports`: week/month/year/custom, summary thu-chi-ròng-saving rate, top categories và trend chart |
| Saving goals | Implemented MVP core | `/app/goals`: create/edit, target date/account, progress, pause/resume và contribution history qua atomic RPC |
| Recurring | Implemented management | `/app/recurring`: create/edit, frequency, next run date, active/inactive; scheduler execution planned |
| Notifications | Implemented core | `/app/notifications`: list, unread state, mark one/all read; generators planned |
| PWA | Partial | Manifest, icon, service worker shell |
