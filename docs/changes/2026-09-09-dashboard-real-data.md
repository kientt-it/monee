# Dashboard real data và Supabase publishable key

## Change
Chuyển dashboard bảo vệ `/app` từ dữ liệu mẫu sang dữ liệu Supabase thật và hỗ trợ tên publishable key mới.

## Goal
Sau khi kết nối Supabase và apply migrations, người dùng đăng nhập có thể nhìn thấy bức tranh tài chính hiện tại thay vì số liệu minh họa.

## Previous behavior
Mọi dashboard đều dùng dữ liệu mẫu. Mã chỉ nhận `NEXT_PUBLIC_SUPABASE_ANON_KEY`, nên cấu hình bằng `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bị xem là chưa kết nối.

## New behavior
`/app` tải song song profile, accounts, giao dịch tháng, giao dịch gần đây, categories, ngân sách tháng, saving goals và số thông báo chưa đọc. Root `/` tiếp tục là preview có nhãn rõ ràng. Cấu hình Supabase ưu tiên publishable key và tương thích ngược với anon key.

## Business logic impact
Tổng tài sản tôn trọng `is_archived` và `include_in_total`. Thu nhập, chi tiêu, dòng tiền ròng và tỷ lệ tiết kiệm loại transfer. Khoảng tháng được tính theo `Asia/Ho_Chi_Minh`. Amount được kiểm tra là số nguyên an toàn trước khi tính.

## UI impact
Dashboard có empty states cho ngân sách, nhóm chi, mục tiêu và giao dịch. Màu tiến độ ngân sách phản ánh mức bình thường, cảnh báo và vượt ngân sách.

## Database changes
Không có migration mới. Người dùng xác nhận hai migration hiện tại đã được apply lên Supabase dev.

## Tests
Endpoint Supabase Auth trả HTTP 200. 9 unit tests, lint và Next production build đều pass.

## Risks
Chưa có authenticated integration test tự động, nên ownership, rollback và idempotency của RPC mới chỉ được bảo vệ bởi migration review và domain unit tests.

## Follow-up
Thêm user test cho Supabase integration suite, onboarding/profile, accounts edit/archive và budgets CRUD.
