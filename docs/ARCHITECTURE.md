# Architecture

## Layout
`src/app` chứa route và boundary; `src/features` chứa domain theo feature; `src/components` chứa UI/layout dùng chung; `src/lib/domain` chứa tính toán; `supabase/migrations` là source of truth schema; `docs` ghi lại quyết định.

## Data flow
Server Components fetch initial data qua Supabase SSR client. Dashboard dùng một server query tổng hợp song song profile, accounts, giao dịch tháng/gần đây, categories, budgets, saving goals và số thông báo chưa đọc; client chỉ nhận view model đã chuẩn hóa. Client Components chỉ xử lý form, sheet, chart, filter và optimistic UI an toàn. Accounts create đi qua Server Action với Zod + auth check; create/edit/delete/restore giao dịch đều gọi PostgreSQL RPC atomic cho balance.

Account metadata edit/archive/restore đi qua Server Actions, auth check, Zod và RLS; không có action nào nhận hoặc ghi `current_balance`. Query transaction options giữ account archived để render lịch sử, còn form create lọc chúng ở view model.

Budgets dùng Server Component query `/app/budgets` để đọc budget, category expense và giao dịch trong các cửa sổ hiện tại; view model tính spent/remaining/status bằng domain calculation. Create/edit/toggle đi qua Server Action với Zod, auth, kiểm tra category expense và RLS; dashboard dùng lại dữ liệu budget tháng cho summary.

Reports dùng Server Component query `/app/reports` với range an toàn từ search params, lấy transactions theo trend window rồi chuẩn hóa tại server thành summary, top categories và trend series. Chart là client-only Recharts component nhận view model đã chuẩn hóa; transfer và transaction soft-deleted không xuất hiện trong báo cáo.

Goals dùng Server Component query `/app/goals` để đọc goal, contribution history và account liên kết. Metadata create/edit/status qua Server Action + Zod + RLS; contribution chỉ qua `add_saving_goal_contribution` RPC security definer có row lock, tránh race condition giữa lịch sử và cached amount.

Recurring và Notifications dùng Server Components + Server Actions với auth/RLS. Recurring management chỉ lưu cấu hình và ngày chạy kế tiếp; scheduler/Edge Function là follow-up riêng để thực thi qua transaction RPC. Notification view đọc theo user và các action chỉ cập nhật `is_read`.

Next Proxy refresh session, bảo vệ route và enforce onboarding theo `profiles.onboarding_completed`. Profile được đọc qua request-scoped React cache; update đi qua Server Action với Zod và RLS. `next-themes` áp dụng preference đã lưu bằng `data-theme`.

Financial domain có hàm thuần `applyTransactionEffect`, `replaceTransactionEffect`, `removeTransactionEffect` để dùng làm executable specification và unit test cho effect/reverse.

## Supabase
Browser dùng publishable/anon key với RLS. Server dùng `@supabase/ssr` cookie strategy. Cấu hình ưu tiên `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` và vẫn hỗ trợ `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Service role chỉ dành cho server-side job được kiểm soát, không nằm trong browser bundle.

## Caching/PWA
Service worker chỉ cache application shell và asset tĩnh. Không cache vô thời hạn dữ liệu tài chính; offline write queue chưa implement và không được báo thành công giả.

## Error handling
Route có loading, error, not-found và global-error. Lỗi database/RPC về sau phải map thành domain error thân thiện.
