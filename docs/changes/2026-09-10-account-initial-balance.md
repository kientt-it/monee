# Chỉnh sửa số dư ban đầu tài khoản

## New behavior

Form “Sửa tài khoản” có thêm trường “Số dư ban đầu”, hiển thị dấu chấm phân cách theo định dạng Việt Nam. Khi lưu, số dư hiện tại thay đổi theo phần chênh lệch giữa số mới và số cũ; các giao dịch đã ghi nhận không bị sửa.

Ví dụ: tài khoản có số dư ban đầu 2.500.000 và đã phát sinh giao dịch chi 500.000, sửa số dư ban đầu thành 3.000.000 sẽ làm số dư hiện tại tăng lên 2.500.000.

## Database and rollout

Apply `supabase/migrations/202609101200_edit_account_initial_balance.sql` in Supabase SQL Editor before using the field. The migration adds the owner-checked `update_financial_account` RPC and does not alter existing account or transaction rows by itself.

## Verification

The account edit schema validates non-negative VND integer amounts up to 1,000,000,000,000. The RPC updates metadata, opening balance and cached current balance atomically while preserving transaction history.
