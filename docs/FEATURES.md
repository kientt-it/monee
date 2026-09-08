# Features

| Feature | Status | Notes |
|---|---|---|
| Mobile dashboard | Implemented preview | Tổng tài sản, dòng tiền, ngân sách, nhóm chi, mục tiêu, giao dịch gần đây |
| Auth foundation | Partial | Login/register/reset/callback và middleware; cần Supabase env để chạy thật |
| Accounts | Partial | Danh sách, tổng số dư, form tạo tài khoản qua server action; edit/archive planned |
| Transactions | Implemented MVP core | List/detail/create/edit/soft-delete; atomic RPC; 9 domain tests; filters/pagination/receipt planned |
| Budgets | Foundation | Schema + Zod; CRUD/report planned |
| Reports | Planned | Domain formulas đã có |
| Saving goals | Foundation | Schema + Zod; contribution UI planned |
| Recurring | Foundation | Tables + idempotent execution log; scheduler planned |
| PWA | Partial | Manifest, icon, service worker shell |
