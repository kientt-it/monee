# Xóa hàng loạt và reset khoản trả một tài khoản

## Trong ứng dụng

Khoản trả > Chọn nhiều kỳ > chọn từng kỳ hoặc tất cả đang hiển thị > Xóa N kỳ > xác nhận. Tối đa 200 kỳ/lần, chỉ trong danh sách/bộ lọc đang xem; đổi bộ lọc sẽ bỏ chọn. Không chọn kỳ có thanh toán. Các kỳ ngoài 200 dòng hiển thị không bị chọn ngầm.

Migration `202611021800_bulk_delete_repayment_dues.sql` chạy sau 1600 và 1700. RPC kiểm tra owner, số lượng/duplicate/revision; khóa các row theo ID; dùng lại kiểm tra paid/legacy của xóa đơn. Nếu một mục lỗi, cả batch rollback. Xóa mềm, không xóa plan/giao dịch tiền, retry không xóa thêm.

## SQL reset dữ liệu để nhập lại

File **maintenance**, không phải migration: `supabase/maintenance/reset_one_users_repayments.sql`.

1. Lấy UUID của đúng tài khoản tại Authentication > Users, thay `REPLACE_WITH_USER_UUID` trong file.
2. Chạy nguyên file với lệnh cuối `ROLLBACK`. Kiểm tra user_id, rows_to_delete và xuất repayment_backup trong kết quả SELECT cuối. Dữ liệu sau lần chạy này vẫn nguyên vẹn.
3. Khi đã kiểm tra và lưu backup, đổi **lệnh rollback cuối file** thành `COMMIT`, chạy lại nguyên file để xóa thật.

Script xóa toàn bộ plan/kỳ/payment của user đã chọn, dữ liệu legacy khoản cần trả/trả góp/khoản vay và mục phân bổ nợ. Bảng loans/loan_payments nếu chưa từng cài được bỏ qua. Giữ user, tài khoản, số dư, giao dịch tiền, lương, ngân sách sinh hoạt/dự phòng và dữ liệu người khác. Không xóa bảng, không tự tạo lại giao dịch quá khứ khi nhập lịch mới. Các dòng tổng dư nợ thẻ legacy có thể được trigger tài khoản tạo lại khi phát sinh biến động sau này; chúng không phải lịch kỳ trong app mới.

Đây là reset lịch sử theo dõi khoản trả, khác với bỏ các kỳ chưa thanh toán trong UI. Các liên kết thanh toán bị xóa nhưng tiền thực vẫn nằm trong lịch sử giao dịch và số dư. Chưa chạy script này trên Supabase thật.

## Kiểm tra

- Unit suite 46 tests; TypeScript/ESLint.
- SQL `supabase/tests/bulk_delete_repayment_dues.sql` trên PostgreSQL disposable: owner, validation, paid guard, rollback toàn batch, đúng phạm vi, retry/count.
- Script maintenance được thử cả ROLLBACK và COMMIT với fixture hai user: user mục tiêu hết lịch, user khác và fingerprint toàn bộ accounts/transactions giữ nguyên.
- React UI harness (Server Actions mock) kiểm tra select/cancel/submit payload, bỏ chọn khi đổi filter, modal và bố cục 1440/390/320px; không tràn ngang/lỗi JS. Không phải E2E Supabase live.
