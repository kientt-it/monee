# Lãi/lỗ hụi cả dây

Trang `/app/hui` thêm kỳ dự định hốt (1-based) thay cho số chân đã hốt, mặc định ví dụ 17/34. Giữ mô hình một chân mỗi người và một lần hốt mỗi tháng. Tính theo tổng đã góp thực tế hoặc bình quân các kỳ trước (ghi rõ ước tính). Khi đổi kỳ, tổng thực tế đã nhập được xóa để tránh áp dụng lịch sử của kỳ cũ; kỳ 1 tự dùng 0. Số tiền trống không được coi là 0.

Lãi/lỗ danh nghĩa = tiền thực nhận lúc hốt - đã góp trước hốt - còn góp sau hốt. Tiền thực nhận đã loại phần góp đồng thời của người hốt và phí chủ hụi, nên không trừ hai khoản đó lần nữa. Tỷ lệ hiển thị trên tổng các khoản đã/sẽ góp, chưa xét thời điểm dòng tiền hay các phí ngoài phí chủ hụi; không phải lãi suất năm.

Ví dụ 34 kỳ, hốt kỳ 17, hụi chết 2 triệu, giá mở 1,8 triệu, mức bỏ 1,7 triệu, bình quân trước hốt 1,8 triệu, phí 0: thực nhận 16*2 +17*1,7 =60,9 triệu; đã góp 16*1,8 =28,8 triệu; còn góp 17*2 =34 triệu; lỗ 1,9 triệu. Đổi tổng lịch sử thành 26,9 triệu thì hòa vốn; không kết luận lãi/lỗ từ riêng kỳ hốt.

Kiểm tra: toàn suite 77 tests, trong đó 14 test hụi; ESLint/TypeScript đạt. React Playwright harness (Next navigation/link stubs) kiểm tra kết quả 17/34, lịch sử trống/thực tế, hòa vốn/lãi/lỗ, đổi kỳ, kỳ đầu/cuối/vượt giới hạn; light/dark ở 1440/390/320 không tràn trang hoặc lỗi JS. Có xem ảnh QA mobile; script/ảnh ở outputs được ignore. Không cần SQL.
