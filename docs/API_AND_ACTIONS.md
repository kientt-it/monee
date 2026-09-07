# API and actions

## Supabase RPC

`create_financial_transaction(input)` — authenticated; validates owner, amount, account/category và transfer; inserts transaction + updates balances atomically; trả transaction id. Supports `idempotency_key`.

`recalculate_account_balance(account_id)` — authenticated owner; tính lại initial balance + effects từ non-deleted transactions.

Server Actions cho CRUD sẽ validate bằng Zod, gọi service/domain layer, map lỗi RPC, rồi revalidate route. Chưa expose actions UI ở foundation.
