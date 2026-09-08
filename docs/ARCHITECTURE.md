# Architecture

## Layout
`src/app` chứa route và boundary; `src/features` chứa domain theo feature; `src/components` chứa UI/layout dùng chung; `src/lib/domain` chứa tính toán; `supabase/migrations` là source of truth schema; `docs` ghi lại quyết định.

## Data flow
Server Components fetch initial data qua Supabase SSR client. Client Components chỉ xử lý form, sheet, chart, filter và optimistic UI an toàn. Accounts create đi qua Server Action với Zod + auth check; create/edit/delete/restore giao dịch đều gọi PostgreSQL RPC atomic cho balance.

Financial domain có hàm thuần `applyTransactionEffect`, `replaceTransactionEffect`, `removeTransactionEffect` để dùng làm executable specification và unit test cho effect/reverse.

## Supabase
Browser dùng anon key với RLS. Server dùng `@supabase/ssr` cookie strategy. Service role chỉ dành cho server-side job được kiểm soát, không nằm trong browser bundle.

## Caching/PWA
Service worker chỉ cache application shell và asset tĩnh. Không cache vô thời hạn dữ liệu tài chính; offline write queue chưa implement và không được báo thành công giả.

## Error handling
Route có loading, error, not-found và global-error. Lỗi database/RPC về sau phải map thành domain error thân thiện.
