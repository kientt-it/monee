# Monee

Progressive Web App quản lý tài chính cá nhân dành cho người dùng Việt Nam. Ứng dụng dùng Next.js App Router và Supabase, với số tiền lưu bằng số nguyên VND và mọi thay đổi số dư được thực hiện atomic qua PostgreSQL RPC.

## Chạy local

1. Sao chép `.env.example` thành `.env.local`.
2. Điền URL và publishable key của Supabase. Tên cũ `NEXT_PUBLIC_SUPABASE_ANON_KEY` vẫn được hỗ trợ.
3. Chạy hai migration trong `supabase/migrations` theo thứ tự tên file.
4. Cài dependencies và chạy ứng dụng:

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Route `/app/*` yêu cầu đăng nhập khi Supabase đã được cấu hình.

## Kiểm tra

```bash
npm run test
npm run lint
npm run build
```

Tài liệu kiến trúc, business rules và trạng thái triển khai nằm trong thư mục `docs`.
