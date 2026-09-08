# Transaction edit and delete

## Change
Hoàn thiện detail, edit và soft-delete giao dịch với cơ chế reverse/apply atomic; thêm unit tests tài chính.

## Goal
Đảm bảo sửa hoặc xóa không bao giờ làm transaction và cached account balance lệch nhau.

## Previous behavior
Chỉ có create RPC. Client còn quyền ghi trực tiếp bảng transaction/account theo grant ban đầu; chưa có UI detail/edit/delete và chưa có test runner.

## New behavior
Update lock record/accounts, reverse effect cũ, apply effect mới rồi update. Delete reverse effect và set `deleted_at`; restore apply lại effect. UI có detail, edit và confirm delete. Direct transaction writes/current_balance updates bị revoke.

## Files changed
Migration `202609071930_transaction_update_delete.sql`, transaction actions/queries/components/routes, finance domain tests, package scripts và docs.

## Database changes
Thêm helper nội bộ `apply_transaction_balance_effect`; RPC update, soft-delete, restore và create account; replace create transaction RPC với validation/category/locking mạnh hơn; giới hạn column privileges.

## Business logic impact
Giữ amount dương. Reverse chính xác expense/income/transfer trước khi apply effect mới. Transfer luôn bảo toàn tổng balance và không nhận category.

## UI impact
Người dùng có thể mở chi tiết, sửa mọi trường tài chính và xác nhận xóa bằng alert dialog mobile-first.

## Risks
Chưa chạy migration/integration test trên Supabase project thật. Undo UI chưa nối với restore RPC.

## Tests
9 Vitest cases pass; Next production build và lint pass.

## Migration notes
Apply sau migration foundation. Sau apply, client writes trực tiếp transactions/current_balance sẽ bị từ chối như chủ đích.

## Rollback
Khôi phục grants cũ và drop ba RPC mới, nhưng việc cho client ghi trực tiếp không được khuyến nghị.

## Follow-up
Kết nối Supabase dev, integration-test rollback/ownership/idempotency, rồi thêm Undo UI và server-side filters.
