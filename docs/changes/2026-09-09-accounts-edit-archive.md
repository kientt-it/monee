# Accounts edit, archive và restore

## Change
Hoàn thiện vòng đời tài khoản với sửa metadata, tùy chọn tính vào tổng tài sản, lưu trữ và khôi phục.

## Goal
Cho phép người dùng quản lý tài khoản lâu dài mà không xóa số dư hoặc làm mất ngữ cảnh của giao dịch lịch sử.

## Previous behavior
Accounts chỉ có danh sách và tạo mới. Query loại bỏ hoàn toàn account archived, khiến transaction cũ về sau có thể mất tên account.

## New behavior
User có thể sửa tên, loại, màu và `include_in_total`; archive account sau bước xác nhận; xem khu vực đã lưu trữ và restore. Transaction mới chỉ dùng account active, trong khi detail/edit lịch sử vẫn nhận account archived liên quan.

## Business logic impact
Không action nào cho phép sửa `current_balance`. Archive không thay đổi balance hoặc transaction history. Account có recurring transaction active bị chặn archive cho đến khi lịch định kỳ được tắt.

## Database changes
Không có migration mới; dùng RLS và column-level update grant từ migration hiện tại.

## UI impact
Account card có trạng thái tính tổng, thao tác edit/archive và khu vực archived riêng. Form tạo mới bổ sung màu và include-in-total. Khi không còn account active, form transaction hướng người dùng về trang tài khoản.

## Tests
Thêm 3 schema tests cho account. Tổng 15 tests, lint và Next production build pass.

## Risks
Kiểm tra recurring và update archive hiện là hai request server liên tiếp; integration test concurrent archive/recurring chưa có.

## Follow-up
Thêm authenticated integration tests cho account ownership và financial RPC, sau đó triển khai budgets CRUD.
