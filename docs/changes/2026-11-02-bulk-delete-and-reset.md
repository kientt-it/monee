# Xóa hàng loạt và reset khoản trả một tài khoản

## Trong ứng dụng

Khoản trả > Chọn nhiều kỳ > chọn từng kỳ hoặc tất cả đang hiển thị > Xóa N kỳ > xác nhận. Tối đa 200 kỳ/lần, chỉ trong danh sách/bộ lọc đang xem; đổi bộ lọc sẽ bỏ chọn. Không chọn kỳ có thanh toán. Các kỳ ngoài 200 dòng hiển thị không bị chọn ngầm.

Migration `202611021800_bulk_delete_repayment_dues.sql` chạy sau 1600 và 1700. RPC kiểm tra owner, số lượng/duplicate/revision; khóa các row theo ID; dùng lại kiểm tra paid/legacy của xóa đơn. Nếu một mục lỗi, cả batch rollback. Xóa mềm, không xóa plan/giao dịch tiền, retry không xóa thêm.

## SQL reset dữ liệu để nhập lại

File **maintenance**, không phải migration: `supabase/maintenance/reset_one_users_repayments.sql`.

1. Chạy `supabase/maintenance/preview_one_users_repayments.sql` với đúng UUID ở CTE `target`. Xuất kết quả `repayment_backup`; bảng loans/loan_payments tùy chọn được lưu dưới dạng XML trong JSON.
2. Mở lại file reset mới: UUID ở `v_user_id`, `v_delete boolean := false` mặc định chỉ kiểm tra, không xóa. Chạy nguyên khối DO; không thêm BEGIN/COMMIT/ROLLBACK.
3. Sau khi kiểm tra và lưu backup, đổi `v_delete boolean := true` và chạy nguyên khối để xóa thật. Cả hai file phải trỏ cùng UUID. Thành công có thể hiển thị `Success. No rows returned`; query preview cho phép kiểm tra lại dữ liệu sau xóa.

Bản sửa 2026-11-03 không dùng bảng tạm, tránh phụ thuộc trạng thái giữa nhiều câu lệnh trong SQL Editor. Chưa xác định được nguyên nhân runner báo thiếu bảng tạm trong lần chạy của người dùng; không quy lỗi cho việc chọn thiếu query.

Script xóa toàn bộ plan/kỳ/payment của user đã chọn, dữ liệu legacy khoản cần trả/trả góp/khoản vay và mục phân bổ nợ. Bảng loans/loan_payments nếu chưa từng cài được bỏ qua. Giữ user, tài khoản, số dư, giao dịch tiền, lương, ngân sách sinh hoạt/dự phòng và dữ liệu người khác. Không xóa bảng, không tự tạo lại giao dịch quá khứ khi nhập lịch mới. Các dòng tổng dư nợ thẻ legacy có thể được trigger tài khoản tạo lại khi phát sinh biến động sau này; chúng không phải lịch kỳ trong app mới.

Đây là reset lịch sử theo dõi khoản trả, khác với bỏ các kỳ chưa thanh toán trong UI. Các liên kết thanh toán bị xóa nhưng tiền thực vẫn nằm trong lịch sử giao dịch và số dư. Chưa chạy script này trên Supabase thật.

## Kiểm tra

- Unit suite 46 tests; TypeScript/ESLint.
- SQL `supabase/tests/bulk_delete_repayment_dues.sql` trên PostgreSQL disposable: owner, validation, paid guard, rollback toàn batch, đúng phạm vi, retry/count.
- Script maintenance được thử cả chế độ validate và apply với fixture hai user: user mục tiêu hết lịch, user khác và fingerprint toàn bộ accounts/transactions giữ nguyên.
- React UI harness (Server Actions mock) kiểm tra select/cancel/submit payload, bỏ chọn khi đổi filter, modal và bố cục 1440/390/320px; không tràn ngang/lỗi JS. Không phải E2E Supabase live.
