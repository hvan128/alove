# Kịch bản demo VéĐi hai phía

## Chuẩn bị

Mở cùng mã phiên `DEMO42`:

- Laptop nhân viên: `/staff?session=DEMO42`
- Điện thoại hoặc tab thứ hai: `/call?session=DEMO42`

Nếu chưa cấu hình LiveKit, hai trang phải ở các tab cùng browser. Nếu đã có LiveKit và worker, dùng hai thiết bị bất kỳ có HTTPS và cấp quyền microphone.

## Luồng Human-in-the-loop

1. Giữ chế độ **Nhân viên** trên `/staff`.
2. Ở `/call`, bấm **Bắt đầu cuộc gọi**.
3. Gửi câu: “Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.”
4. Chỉ ra transcript final và các trường hành trình vừa tự điền. Mở evidence dưới một field để thấy exact quote.
5. Nhấn **Nói câu này** ở gợi ý. Agent chỉ đọc câu đã được nhân viên duyệt; không tự trả lời trong Human mode.
6. Gửi câu: “Tôi tên Nguyễn Minh Anh, số 0909 123 456, đón ở Ngã tư Hàng Xanh, trả tại Chợ Đà Lạt.”
7. Sửa một field trên bàn nhân viên để cho thấy nhãn **Nhân viên đã khóa**.
8. Khi gate đủ dữ kiện, bấm **Xác nhận đặt vé**. Booking code chỉ xuất hiện sau thao tác này.

## Luồng Auto và giọng Agent

1. Tạo phiên mới, ví dụ `AUTO42`, trên cả hai route.
2. Bật **Agent tự động**. Trong local fallback, agent xác định trả lời qua transcript và thiết bị người gọi đọc câu. Khi worker live, VALSEA TTS phát trực tiếp trong room.
3. Người gọi lần lượt nói/gửi hai câu ở trên.
4. Quan sát mỗi final tạo tối đa một agent reply. Chuyển lại **Nhân viên** rồi gửi thêm một câu; không được có agent reply mới.

## Checklist nói thật khi trình bày

- `Mô phỏng cục bộ`: không có audio qua mạng, không phải VALSEA.
- `VALSEA đang kết nối`: worker chưa nhận `session.ready`.
- `VALSEA đang nghe`: RTT đã ready.
- `Agent chưa cấu hình`: chưa deploy hoặc chưa bật feature flag.
- Nếu mic bị từ chối, dùng câu mẫu/text; không gọi đó là live STT.
