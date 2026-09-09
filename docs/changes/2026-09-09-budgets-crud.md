# Budgets CRUD và tiến độ

## Change
Thêm trang quản lý ngân sách và kết nối với các khoản chi tiêu chưa bị xóa mềm để hiển thị tiến độ theo kỳ hiện tại.

## Goal
Cho người dùng đặt giới hạn cho toàn bộ chi tiêu hoặc một nhóm chi tiêu, nhận biết số tiền còn lại và tắt ngân sách mà không mất lịch sử.

## New behavior
`/app/budgets` hỗ trợ tạo/sửa ngân sách, chọn danh mục expense, chọn chu kỳ weekly/monthly/yearly/custom, đặt ngưỡng cảnh báo và bật/tắt ngân sách. Progress được tính theo transactions thuộc user trong cửa sổ hiện tại. Dashboard đã có liên kết tới route này.

## Business logic impact
Budget theo danh mục chỉ cộng expense cùng category; budget không có category áp dụng cho mọi expense. Tắt budget chỉ cập nhật `is_active = false`. Category được kiểm tra là category expense mặc định hoặc của chính user trước khi lưu.

## Database changes
Không có migration mới; dùng bảng `budgets`, `categories`, `transactions` và RLS hiện có.

## Tests
Thêm 3 schema tests cho budget. Tổng 18 tests pass; lint và Next production build pass.

## Follow-up
Thêm báo cáo theo thời gian, notification job dùng `alert_threshold` và authenticated integration tests.
