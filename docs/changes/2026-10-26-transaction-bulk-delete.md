# Chọn và xóa nhiều giao dịch

Danh sách Giao dịch mặc định không hiện checkbox. Bấm “Chọn” để hiện checkbox, “Chọn tất cả” cho các giao dịch đang hiển thị trên trang, “Xóa đã chọn” và “Hủy chọn”. Xóa nhiều giao dịch cần xác nhận trước khi thực hiện.

Migration `202610261300_bulk_delete_transactions.sql` thêm RPC xóa mềm tối đa 50 giao dịch mỗi lần. RPC gọi luồng xóa hiện có cho từng giao dịch trong cùng một database transaction, vì vậy nếu một giao dịch không thuộc người dùng hoặc có lỗi, toàn bộ lần xóa được rollback và số dư không bị cập nhật dở dang. Cần apply migration trước khi dùng tính năng trên dữ liệu thật.
