# Hoàn trả thẻ tín dụng

Mỗi tài khoản loại thẻ tín dụng có đúng một khoản cần trả loại “Hoàn trả thẻ tín dụng”, kể cả khi số còn phải trả là 0. Khoản này không có ngày trả và luôn hiện trong bộ lọc ngày. Hạn mức của thẻ là `accounts.initial_balance`; hạn mức còn lại là `accounts.current_balance`; số cần trả bằng phần chênh lệch dương giữa hai giá trị. Thẻ tín dụng không tính vào tổng tài sản.

Chi tiêu, sửa/xóa/khôi phục giao dịch và chuyển tiền vào thẻ đều làm cập nhật khoản cần trả qua trigger trong cùng một database transaction. Nút “Ghi nhận đã trả” cho nhập số tiền từng lần và chọn tài khoản nguồn; RPC `pay_credit_card` tạo giao dịch chuyển khoản, giảm số dư nguồn, tăng hạn mức còn lại và giảm số cần trả. Khoản hoàn trả do hệ thống tính, không sửa/xóa hoặc đánh dấu đã trả thủ công; các khoản cần trả thông thường giữ cách quản lý cũ.

Cần apply `supabase/migrations/202610261400_credit_card_payables.sql` sau migration Khoản cần trả. Kiểm thử PostgreSQL riêng ở `supabase/tests/credit_card_payables.sql`.
