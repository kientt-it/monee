# Business logic

- Expense lưu amount dương và trừ `accounts.current_balance`.
- Income lưu amount dương và cộng balance.
- Transfer trừ account nguồn, cộng account đích; không phải income/expense và không vào spending report hay saving rate.
- Tạo/sửa/xóa giao dịch phải atomic. Sửa reverse impact cũ rồi apply impact mới. Xóa ưu tiên soft delete, reverse balance effect.
- Total balance là tổng current balance của account chưa archive và `include_in_total = true`.
- Net cash flow = income − expense; saving rate = net cash flow / income × 100, bằng 0 nếu income bằng 0.
- VND lưu BIGINT, không lưu chuỗi tiền đã format.
- Credit card MVP giữ cùng quy ước balance hiện tại; chưa triển khai logic kỳ sao kê/lãi.
- Saving goal có contribution history; cached current_amount phải đồng bộ với contributions.
