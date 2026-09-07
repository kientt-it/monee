# PWA

Manifest ở `src/app/manifest.webmanifest`, icon ở `public/icon.svg`, service worker ở `public/sw.js`. Root layout đăng ký worker ở client.

Current strategy chỉ cache asset/shell; khi mạng lỗi request đọc có thể dùng cache match. Mutation offline chưa được xác nhận thành công và sẽ cần pending queue + idempotency trước khi triển khai.
