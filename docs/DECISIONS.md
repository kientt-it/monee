# Architecture decisions

## ADR-001 — Money stored as BIGINT
Date: 2026-09-07 · Status: Accepted

VND không cần fractional unit ở MVP; BIGINT tránh lỗi floating point và giữ amount dương nhất quán.

## ADR-002 — Balance is cached and changed by RPC
Date: 2026-09-07 · Status: Accepted

Dashboard cần đọc nhanh, nhưng balance là dữ liệu nhạy cảm; client không được tự update. RPC là source of truth cho effect và có function recalculate.

## ADR-003 — PWA caches shell only
Date: 2026-09-07 · Status: Accepted

Dữ liệu tài chính không cache vô thời hạn. Offline write queue sẽ chỉ thêm khi có idempotency và trạng thái pending rõ ràng.
