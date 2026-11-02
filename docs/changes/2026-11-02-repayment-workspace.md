# Lịch trả theo kỳ và tổng quan kỳ lương

## Thay đổi

- Tổng quan và Khoản trả dùng chung lịch từng nghĩa vụ; chọn tháng hoặc kỳ lương, mặc định ngày 16. Ngày thực trả tách khỏi kỳ được đóng.
- Thêm lịch trả góp theo tiền mỗi kỳ, kỳ cuối khác tiền/bằng 0; thêm chi tiêu thẻ và khoản cần trả khác. Đây là nhập lịch nghĩa vụ, không tự tạo thêm giao dịch mua.
- Thêm nguồn thẻ hoặc trả sau, đối soát dư nợ mở đầu; trả sau không bắt buộc nhập hạn mức.
- Thanh toán mới tạo transfer vào nguồn nợ hoặc expense khoản thường; có liên kết giao dịch sẵn và xác nhận lịch sử. Hỗ trợ trả một phần và nhiều lần cho một kỳ.
- Bỏ phân bổ giữ nguyên giao dịch tiền thật. Giao dịch có phân bổ hiệu lực bị chặn sửa trường tài chính/xóa cho đến khi tháo phân bổ.
- Lưu ngân sách tháng/kỳ lương riêng phần tiền đầu kỳ, sinh hoạt, dự phòng; lương và ngày lương dùng chung tháng. Đây là ngân sách toàn kỳ, không phải dự báo số dư hiện tại. Khoản từ trước kỳ hiển thị riêng và chưa cộng vào ngân sách kỳ.
- Điều hướng chính: Tổng quan, Khoản trả, Ví & thẻ, Giao dịch. Mobile: Tổng quan, Khoản trả, thêm khoản, Ví & thẻ, Khác. Bỏ footer ghi chú bên sidebar, không đưa ghi chú thiết kế/mô phỏng vào sản phẩm.
- `/outputs/` bị Git/ESLint/TypeScript bỏ qua, không commit các workbook, ảnh hoặc junction dependency. Không có file outputs nào được Git theo dõi tại thời điểm kiểm tra.

## Migration và cutover

File `supabase/migrations/202611021600_repayment_workspace.sql` là migration bổ sung, cần các migration allocations/interest ngày 28/10 trước đó. Chưa áp dụng lên Supabase thật.

Các bảng mới `repayment_plans`, `repayment_dues`, `repayment_payments` có RLS chỉ đọc theo owner; ghi qua RPC có auth/ownership, khóa hàng, idempotency và giao dịch atomic. Các bảng cũ không bị xóa. Chọn cách bổ sung để giữ dữ liệu so sánh trong giai đoạn cutover thay vì rename/xóa schema đang hoạt động.

Migration chuyển hợp đồng cũ thành kỳ đúng quy tắc làm tròn gốc/lãi; khoản manual có paid_on được chuyển thành xác nhận lịch sử không tạo thêm giao dịch. Các liên kết thanh toán trả góp cũ **không được tự gán kỳ**. Kỳ liên quan hiển thị chưa xác nhận và cảnh báo liên kết cũ cần đối soát; không xác nhận lịch sử thêm lần nữa nếu tiền đó đã thuộc giao dịch cũ. Công cụ phân bổ lại liên kết cũ chưa có trong đợt này.

Sau migration, đường ghi payables/credit_card_installments cũ và RPC trả góp cũ bị thu hồi khỏi authenticated. `/app/allocations` chuyển về tổng quan mới. Trigger tổng nợ thẻ cũ vẫn phục vụ đối soát tài khoản, không được cộng vào tổng đến hạn mới. Khi migration chưa có, app giữ màn hình cũ.

Trước áp dụng thật: kiểm kê phiên bản migration và số liệu; sao lưu; chuyển trên staging; đối chiếu số kỳ, tổng tiền và dư nợ; đối soát payment cũ; mới cutover. Không chạy harness trong `supabase/tests` lên Supabase.

## Kiểm tra

- Unit/domain: 46 tests qua tại thời điểm triển khai, gồm lịch cuối tháng/năm nhuận, kỳ cuối 0, kỳ lương, carry, partial status và ngân sách 0/trống.
- SQL: PostgreSQL 16 disposable, chạy migration thực từ nền tảng; kiểm tra gốc/lãi, ngày cuối tháng, payment theo kỳ, số dư nguồn/thẻ, retry, overpayment, tổng phân bổ transaction, xóa bị chặn và rollback, undo giữ tiền, budgets theo mode, trả sau hạn mức 0 và owner/RLS.
- TypeScript và ESLint đã kiểm tra. Production build webpack với bundled Node LTS đã qua; Turbopack trong môi trường này lỗi tạo/kết nối worker xử lý CSS. Không thay bundler mặc định của dự án chỉ để che lỗi môi trường.
- Giao diện: render **component React thực** và CSS Tailwind của source trong harness local, mock Next router và Server Actions; Chromium kiểm tra desktop 1440/1024, mobile 390/320, dark mode, modal native, MoneyInput, payload submit và bộ lọc rỗng. Có xem ảnh để sửa wrap tiền, nhãn và kích thước form. Đây chưa phải E2E qua Auth/Supabase live.

## Phần chưa triển khai trong đợt đầu

Import workbook có preview/chống trùng, editor lịch tùy chỉnh/gốc-lãi nâng cao, đối soát và chuyển liên kết payment cũ, trả hàng loạt trong một giao dịch, chỉnh/hủy kỳ, dự báo số dư tích lũy theo ngày và dọn bảng legacy. Không coi các phần đó là đã hoàn thành. Cần chúng trước khi tuyên bố hoàn tất toàn bộ bản quy hoạch.
