# API and actions

## Supabase RPC

`create_financial_transaction(input)` — authenticated; validates owner, amount, account/category và transfer; inserts transaction + updates balances atomically; trả transaction id. Supports `idempotency_key`.

`recalculate_account_balance(account_id)` — authenticated owner; tính lại initial balance + effects từ non-deleted transactions.

Server Actions cho CRUD sẽ validate bằng Zod, gọi service/domain layer, map lỗi RPC, rồi revalidate route.

`createAccountAction(input)` — authenticated; validate tên, loại, tiền BIGINT và currency bằng `accountSchema`; insert account với initial/current balance; revalidate `/app/accounts` và `/app`. Khi thiếu env Supabase trả trạng thái cấu hình thay vì báo lưu thành công.

`createTransactionAction(input)` — authenticated; validate bằng `transactionSchema`; gọi `create_financial_transaction` với idempotency key; RPC insert transaction và cập nhật account balances atomic; map lỗi ownership/transfer/category thành thông báo thân thiện.
