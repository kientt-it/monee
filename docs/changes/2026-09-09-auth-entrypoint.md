# Auth entrypoint

## Delivered

- Root `/` không còn render dashboard mẫu.
- Người chưa đăng nhập được chuyển đến `/login`.
- Người đã có phiên Supabase được chuyển đến `/app`; proxy tiếp tục đưa người chưa hoàn tất onboarding đến `/app/onboarding`.
- Dashboard `/app` không còn fallback sang sample dashboard.
- Khi Supabase chưa cấu hình, route protected cũng không hiển thị dữ liệu mẫu.

## Validation

- Các route công khai trả về thành công.
- Các route `/app/*` chưa đăng nhập chuyển về `/login`.
- Login/register links đã kiểm tra điều hướng.
- `npm run lint`
- `npm run test` — 27 tests pass
- `npm run build`
