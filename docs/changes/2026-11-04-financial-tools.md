# Công cụ tài chính

Trang mới `/app/tools` có đổi tiền tệ và tính lãi tiền gửi; tính hụi giữ `/app/hui` với link quay về bộ công cụ. Menu desktop và mobile Khác > Công cụ chuyển đến trang mới. Không cần SQL hoặc thay đổi schema.

## Quy đổi tiền tệ

12 đồng tiền: VND, USD, EUR, JPY, KRW, CNY, GBP, SGD, THB, AUD, CAD, TWD. Fetch trực tiếp endpoint công khai https://open.er-api.com/v6/latest/USD từ trình duyệt; không gửi số tiền người dùng đến nhà cung cấp. Tính tỷ giá chéo từ USD, kiểm tra schema/rate dương, cache tỷ giá trong localStorage trong 24 giờ, nhắc nếu dữ liệu quá 48 giờ. Timeout 10 giây, thông báo và nút thử lại; vẫn nhập tỷ giá tay khi offline. Không dùng tỷ giá giả khi tải thất bại. Đảo chiều tỷ giá tay lấy nghịch đảo; đổi đồng tiền xóa tỷ giá tay cũ. Không tạo giao dịch tài chính.

Nguồn/các điều kiện: https://www.exchangerate-api.com/docs/free — open endpoint không cần API key, cập nhật hằng ngày, yêu cầu attribution (đã hiển thị trên giao diện); cho phép cache cho mục đích chuyển đổi. Kết quả là tỷ giá tham khảo chưa tính phí/chênh mua bán. VND/JPY/KRW hiển thị tròn đơn vị; đồng khác tối đa hai chữ số thập phân, tính nội bộ không làm tròn sớm.

## Tiền gửi

Nhập gốc VND, %/năm, ngày gửi, kỳ hạn ngày/tuần/tháng. Chọn nhanh 1/3/6/12/24 tháng. Nhận lãi cuối kỳ, nhận lãi hàng tháng (không nhập gốc), hoặc tái tục gốc+lãi theo số kỳ (gồm kỳ đầu). Lãi suất mẫu 5% được ghi rõ là ví dụ; không phải lãi suất niêm yết ngân hàng. Tái tục giả định cùng lãi suất qua mọi kỳ.

Lãi = gốc * lãi suất năm /100 * số ngày thực tế /365, làm tròn đồng tại từng lần trả lãi. Ngày lịch dùng UTC để không bị DST; các mốc cuối tháng được chặn theo ngày hợp lệ, giữ ngày neo ban đầu cho các kỳ sau. Hàng tháng có kỳ lẻ cuối cùng nếu cần. Tổng nhận gồm gốc và các khoản lãi đã nhận; có bảng ngày nhận, số ngày, gốc, lãi và gốc tái tục. Chưa điều chỉnh ngày nghỉ, rút trước hạn hoặc lãi suất thay đổi. Nguồn cơ sở ngày thực tế/365: https://www.vietcombank.com.vn/KHCN/Cong-cu-Tien-ich/KHCN---Lai-suat (link trên giao diện).

## Kiểm tra

- Toàn bộ 66 unit tests đạt, trong đó 20 test công cụ (ngày thực tế, năm nhuận, cuối tháng, kỳ lẻ, tái tục, số nhập sai, precision FX, schema tỷ giá).
- ESLint, TypeScript và production webpack build đạt; route `/app/tools` có trong build.
- Playwright React harness với Next navigation/link stubs: đổi chiều, số thập phân, cùng đồng, tỷ giá nhập tay, fallback offline, monthly calendar, compound, lỗi input. Light/dark ở 1440/390/320px không tràn trang/lỗi JS; bảng lịch cuộn riêng.
- Browser thực tải endpoint thật và hiển thị ngày cập nhật thành công. Harness chưa phải E2E đăng nhập Supabase. Không thay đổi hoặc chạy SQL trên dữ liệu thật.
- Hình QA/script ở `outputs/dashboard-20261102`, đã ignore, không push.
