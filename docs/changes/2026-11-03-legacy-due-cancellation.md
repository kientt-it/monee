# Xóa kỳ có liên kết thanh toán cũ

Ảnh lỗi LEGACY_PAYMENT_UNRECONCILED xuất phát từ manage_repayment_due: guard cũ áp dụng cả edit và soft delete. Migration 202611030900_allow_legacy_due_cancellation.sql chỉ giới hạn guard này cho edit. Xóa một kỳ hoặc hàng loạt được phép với liên kết legacy chưa gán kỳ; không xóa liên kết, không ghi nhận đã trả, không đổi giao dịch/số dư. Kỳ có payment mới đang hoạt động vẫn bị chặn; giữ kiểm tra owner, revision và retry.

Chạy nguyên file migration trên Supabase sau 1700; bulk delete cần 1800 như trước. Không cần chạy lại migration cũ hoặc reset toàn tài khoản để dùng bản sửa này. Deploy frontend để đổi “bố trí” thành “phân bổ” và làm rõ xác nhận xóa giữ liên kết cũ.

Kiểm tra: PostgreSQL disposable với harness legacy_due_cancellation.sql chạy các migration thật và regression trước đó; legacy edit bị chặn, single/bulk soft cancel thành công, fingerprint toàn accounts/transactions/legacy payment links giữ nguyên. ESLint/TypeScript; React UI harness kiểm tra edit/delete/bulk và bố cục 1440/390/320. Chưa apply Supabase thật; UI harness mock Server Actions.
