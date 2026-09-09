# API and actions

## Supabase RPC

`create_financial_transaction(input)` — authenticated; validates owner, amount, account/category và transfer; inserts transaction + updates balances atomically; trả transaction id. Supports `idempotency_key`.

`recalculate_account_balance(account_id)` — authenticated owner; tính lại initial balance + effects từ non-deleted transactions.

Server Actions cho CRUD sẽ validate bằng Zod, gọi service/domain layer, map lỗi RPC, rồi revalidate route.

`createAccountAction(input)` — authenticated; validate tên, loại, tiền BIGINT và currency bằng `accountSchema`; gọi `create_financial_account` để server buộc initial/current balance bằng nhau; revalidate `/app/accounts` và `/app`.

`createTransactionAction(input)` — authenticated; validate bằng `transactionSchema`; gọi `create_financial_transaction` với idempotency key; RPC insert transaction và cập nhật account balances atomic; map lỗi ownership/transfer/category thành thông báo thân thiện.

`updateTransactionAction(id, input)` — authenticated; gọi `update_financial_transaction`; reverse effect cũ và apply effect mới trước khi update record, tất cả trong một DB transaction.

`deleteTransactionAction(id)` — authenticated; gọi `soft_delete_financial_transaction`, reverse balance effect và set `deleted_at`. `restoreTransactionAction(id)` gọi RPC restore tương ứng.

`process_due_recurring_transactions(p_limit)` — service-role only; xử lý lịch đã đến hạn, ghi execution log, gọi scheduled transaction helper atomic, cập nhật `next_run_date` và tạo notification. Edge Function `supabase/functions/recurring-scheduler` bảo vệ endpoint bằng `x-scheduler-secret`.
