# Architecture

## Layout
`src/app` chứa route và boundary; `src/features` chứa domain theo feature; `src/components` chứa UI/layout dùng chung; `src/lib/domain` chứa tính toán; `supabase/migrations` là source of truth schema; `docs` ghi lại quyết định.

## Data flow
Server Components fetch initial data qua Supabase SSR client. Client Components chỉ xử lý form, sheet, chart, filter và optimistic UI an toàn. Mutation đi qua Server Action/service trong các phase tiếp theo, gọi PostgreSQL RPC cho balance.

## Supabase
Browser dùng anon key với RLS. Server dùng `@supabase/ssr` cookie strategy. Service role chỉ dành cho server-side job được kiểm soát, không nằm trong browser bundle.

## Caching/PWA
Service worker chỉ cache application shell và asset tĩnh. Không cache vô thời hạn dữ liệu tài chính; offline write queue chưa implement và không được báo thành công giả.

## Error handling
Route có loading, error, not-found và global-error. Lỗi database/RPC về sau phải map thành domain error thân thiện.
