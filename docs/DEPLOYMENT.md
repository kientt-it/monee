# Deployment

## Local
Copy `.env.example` thành `.env.local`, điền Supabase URL và anon key, sau đó chạy dev/build.

## Supabase
Apply migrations theo thứ tự trong `supabase/migrations`. Kiểm tra trigger tạo profile, RLS, RPC và storage policies trước khi kết nối production.

## Production checklist
HTTPS, Supabase redirect URLs, email verification, private storage, RLS review, build pass, test critical financial flows và không deploy `.env.local`.
