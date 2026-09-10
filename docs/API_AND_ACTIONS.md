# API and actions

## Supabase RPC

`create_financial_transaction(input)` — authenticated; validates owner, amount, account/category và transfer; inserts transaction + updates balances atomically; trả transaction id. Supports `idempotency_key`.

`recalculate_account_balance(account_id)` — authenticated owner; tính lại initial balance + effects từ non-deleted transactions.

Server Actions cho CRUD sẽ validate bằng Zod, gọi service/domain layer, map lỗi RPC, rồi revalidate route.

`createAccountAction(input)` — authenticated; validate tên, loại, tiền BIGINT và currency bằng `accountSchema`; gọi `create_financial_account` để server buộc initial/current balance bằng nhau; revalidate `/app/accounts` và `/app`.

`createTransactionAction(input)` — authenticated; validate bằng `transactionSchema`; gọi `create_financial_transaction` với idempotency key; RPC insert transaction và cập nhật account balances atomic; map lỗi ownership/transfer/category thành thông báo thân thiện.

`updateTransactionAction(id, input)` — authenticated; gọi `update_financial_transaction`; reverse effect cũ và apply effect mới trước khi update record, tất cả trong một DB transaction.

`deleteTransactionAction(id)` — authenticated; gọi `soft_delete_financial_transaction`, reverse balance effect và set `deleted_at`. `restoreTransactionAction(id)` gọi RPC restore tương ứng.

Không còn API/action cho recurring; migration cleanup dừng cron scheduler và gỡ các RPC service-role không còn sử dụng.

`saveLoanAction(id, input)` — authenticated + Zod; gọi `save_monthly_loan` với UUID ổn định cho create retry. Lịch/số tiền không được sửa sau khi có payment.

`setLoanPaymentAction({loanId, installmentNumber, paid})` — gọi `set_monthly_loan_payment`; khóa loan, kiểm tra owner/term/archived và ghi nhận/hoàn tác kỳ đóng idempotent. Không tạo transaction.

`setLoanArchivedAction(id, archived)` — archive/restore bằng RPC, giữ payment history. Các action revalidate `/app/loans` và `/app` ngay trong phản hồi, không gọi thêm client refresh.
