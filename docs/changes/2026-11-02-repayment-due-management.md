# Sửa và xóa kỳ trả

## Hành vi

Mỗi dòng trong Tổng quan/Khoản trả có Sửa và Xóa. Form sửa cho đổi tên hiển thị riêng của kỳ, hạn và số tiền (kể cả 0). Không đổi nguồn, số kỳ hợp đồng hoặc các kỳ khác. Xóa là soft-delete kỳ đang chọn; không xóa plan, giao dịch hay lịch sử phân bổ.

Kỳ có phân bổ thanh toán hiệu lực phải bỏ phân bổ trước. Kỳ thuộc hợp đồng còn liên kết thanh toán legacy bị chặn cho tới khi đối soát. Các thao tác không làm thay đổi số dư tài khoản. Đây là quản lý từng kỳ; chưa phải editor thay toàn bộ hợp đồng.

## Migration

Apply `202611021700_repayment_due_management.sql` sau `202611021600_repayment_workspace.sql` trước khi triển khai frontend mới. Migration thêm title_override, deleted_at và revision; RPC `manage_repayment_due` xác thực chủ sở hữu, khóa cùng row với thanh toán, kiểm tra revision và các phân bổ hiệu lực. Payment RPC bỏ qua kỳ đã xóa; bỏ phân bổ cũng tăng revision để form cũ không ghi đè trạng thái mới. Giữ nguyên grant bảo mật của các RPC tiền đã có.

Query vẫn đọc các dòng đã xóa để giữ số kỳ gốc trong hợp đồng nhưng loại chúng khỏi danh sách/tổng và carry. Tên override của một kỳ không thay tên các kỳ còn lại.

## Kiểm tra

`supabase/tests/repayment_due_management.sql` chạy trên PostgreSQL disposable, bao gồm harness nền tảng: sửa riêng một kỳ, giữ kỳ khác, tiền 0, revision conflict, chặn sửa/xóa kỳ có tiền, xóa lặp an toàn, không thanh toán kỳ đã xóa, không sửa phục hồi ngầm kỳ đã xóa, giữ history và số dư, chặn owner khác.

UI kiểm tra component React thật với Server Actions/router được mock trong harness local: payload sửa/xóa, số 0, xác nhận phạm vi, chặn nút khi có tiền, form/nút ở 1440/390/320px, không tràn ngang hoặc lỗi JavaScript. Đây không phải E2E qua Supabase thật.

Không áp dụng migration lên database live trong tác vụ này. `outputs/` tiếp tục bị Git bỏ qua.
