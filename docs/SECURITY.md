# Security

- RLS trên mọi bảng user; policy dùng `auth.uid()`.
- Anon key chỉ ở browser; service role không expose.
- Auth dùng Supabase SSR cookie strategy, không lưu credential trong localStorage.
- Storage bucket private; path bắt đầu bằng user id.
- PWA chỉ cache shell; không cache toàn bộ giao dịch không kiểm soát.
- Production logs không chứa note giao dịch hay dữ liệu tài chính cá nhân.
