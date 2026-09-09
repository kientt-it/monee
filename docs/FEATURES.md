# Features

| Feature | Status | Notes |
|---|---|---|
| Mobile dashboard | Implemented | `/app` đọc dữ liệu Supabase thật; `/` giữ preview có nhãn dữ liệu mẫu |
| Auth + onboarding | Implemented core | Login/register/recovery, route protection, onboarding, profile, theme và sign-out; cần E2E |
| Accounts | Partial | Danh sách, tổng số dư, form tạo tài khoản qua server action; edit/archive planned |
| Transactions | Implemented MVP core | List/detail/create/edit/soft-delete; atomic RPC; 9 domain tests; filters/pagination/receipt planned |
| Budgets | Foundation | Schema + Zod; CRUD/report planned |
| Reports | Planned | Domain formulas đã có |
| Saving goals | Foundation | Schema + Zod; contribution UI planned |
| Recurring | Foundation | Tables + idempotent execution log; scheduler planned |
| PWA | Partial | Manifest, icon, service worker shell |
