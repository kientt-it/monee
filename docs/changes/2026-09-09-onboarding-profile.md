# Onboarding và hồ sơ cá nhân

## Change
Thêm onboarding bắt buộc cho người dùng mới, trang hồ sơ, theme preference, đăng xuất và hoàn thiện password recovery.

## Goal
Đảm bảo người dùng mới có hồ sơ tối thiểu trước khi tạo dữ liệu tài chính, đồng thời có một nơi rõ ràng để quản lý tùy chọn cá nhân.

## Previous behavior
Sau đăng nhập mọi user đi thẳng vào dashboard. Chưa có UI cập nhật profile, onboarding, đăng xuất hoặc màn hình nhập mật khẩu mới. Middleware convention cũ tạo cảnh báo trên Next 16.

## New behavior
Next Proxy kiểm tra `profiles.onboarding_completed`. User mới được chuyển đến `/app/onboarding`; user đã hoàn tất đi thẳng vào app. `/app/settings/profile` cập nhật tên và theme, đồng thời hỗ trợ đăng xuất. Liên kết khôi phục mật khẩu đi qua callback đến `/reset-password`.

## Business logic impact
Profile update được kiểm tra bằng Zod, xác thực lại user ở server và ghi qua RLS. Onboarding chỉ chuyển từ chưa hoàn tất sang hoàn tất; chỉnh profile sau đó không thể vô tình đặt lại trạng thái này.

## UI impact
Form onboarding/profile mobile-first, có lựa chọn sáng, tối hoặc theo thiết bị. Theme được lưu trong Supabase và đồng bộ khi vào khu vực app.

## Database changes
Không có migration mới; dùng các cột hiện có của `profiles`.

## Tests
Thêm 3 schema tests. Tổng 12 tests, lint và Next production build pass.

## Risks
Chưa có E2E tự động với Supabase Auth/email thật. Redirect URL của môi trường production phải nằm trong allowlist của Supabase khi triển khai.

## Follow-up
Hoàn thiện account edit/archive, sau đó thêm authenticated integration tests cho Auth và financial RPC.
