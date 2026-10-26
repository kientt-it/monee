# API and actions

## Supabase RPC

`create_financial_transaction(input)` — authenticated; validates owner, amount, account/category và transfer; inserts transaction + updates balances atomically; trả transaction id. Supports `idempotency_key`.

`recalculate_account_balance(account_id)` — authenticated owner; tính lại initial balance + effects từ non-deleted transactions.

Server Actions cho CRUD sẽ validate bằng Zod, gọi service/domain layer, map lỗi RPC, rồi revalidate route.

`createAccountAction(input)` — authenticated; validate tên, loại, tiền BIGINT và currency bằng `accountSchema`; gọi `create_financial_account` để server buộc initial/current balance bằng nhau; revalidate `/app/accounts` và `/app`.

`updateAccountAction(id, input)` — authenticated; validate metadata và `initialBalance` bằng `accountEditSchema`; gọi `update_financial_account` để điều chỉnh current balance theo chênh lệch opening balance mà không sửa lịch sử giao dịch; revalidate `/app`, `/app/accounts` và `/app/transactions`.

`createTransactionAction(input)` — authenticated; validate bằng `transactionSchema`; gọi `create_financial_transaction` với idempotency key; RPC insert transaction và cập nhật account balances atomic; map lỗi ownership/transfer/category thành thông báo thân thiện.

`updateTransactionAction(id, input)` — authenticated; gọi `update_financial_transaction`; reverse effect cũ và apply effect mới trước khi update record, tất cả trong một DB transaction.

`deleteTransactionAction(id)` — authenticated; gọi `soft_delete_financial_transaction`, reverse balance effect và set `deleted_at`. `restoreTransactionAction(id)` gọi RPC restore tương ứng.

`deleteTransactionsAction(ids)` — authenticated; validate tối đa 50 UUID trên trang hiện tại, gọi `soft_delete_financial_transactions` để xóa mềm nhiều giao dịch và cập nhật số dư trong một database transaction. Cần apply migration `202610261300_bulk_delete_transactions.sql`.

Không còn API/action cho recurring; migration cleanup dừng cron scheduler và gỡ các RPC service-role không còn sử dụng.

`savePayableAction(id, input)` — authenticated + Zod; thêm/sửa khoản cần trả qua RLS. `setPayablePaidAction(id, paid)` ghi nhận/hoàn tác trạng thái đã trả, không tạo giao dịch tài chính.

`deletePayablesAction(ids)` — validate UUID, gọi RPC `delete_payables` để xóa nhiều mục của user trong một lệnh database. Các action revalidate `/app/payables` và `/app`.

`deleteGoalAction(id)` — authenticated + UUID validation; xóa mục tiêu thuộc user qua RLS. Foreign key `ON DELETE CASCADE` xóa các đóng góp liên quan; action revalidate `/app/goals` và `/app`.
