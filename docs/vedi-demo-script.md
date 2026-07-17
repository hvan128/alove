# Kịch bản demo VéĐi

## Demo Agent tự động, khoảng 90 giây

1. Mở `/console`, chỉ vào hai khu vực **Phía khách hàng** và **Nhân viên chăm sóc**.
2. Chọn **Agent tự động**, bấm **Bắt đầu Web Call**.
3. Bấm **Gửi yêu cầu mẫu**. Agent đề xuất chuyến giường nằm 22:00 và chuyến limousine 23:30.
4. Bấm **Chọn chuyến 22:00**. Agent giữ chuyến và hỏi tên/số điện thoại.
5. Bấm **Gửi thông tin hành khách**. Phiếu chuyển sang chờ xác nhận; Agent đọc lại hành trình và tổng tiền.
6. Bấm **Xác nhận đặt vé**. Kết quả phải có hai ghế, mã dạng `VD-240718-xxxx` và giọng Agent phát từ thiết bị.
7. Bấm **Phát lại phản hồi** hoặc **Dừng giọng** để chứng minh TTS control.

Nếu trình duyệt không có SpeechRecognition, nhãn fallback xuất hiện nhưng bốn nút demo và text vẫn chạy đầy đủ.

## Demo nhân viên chăm sóc, khoảng 60 giây

1. Tải lại `/console`, giữ chế độ **Nhân viên**, bấm **Bắt đầu Web Call**.
2. Bấm **Gửi yêu cầu mẫu**. Phiếu cập nhật nhưng không có tin nhắn Agent tự động.
3. Bấm **Dùng gợi ý**, rồi **Gửi & nói**. Câu trả lời của Thu Hà xuất hiện và được đọc bằng device voice.
4. Tiếp tục ba câu khách hàng còn lại. Khi đủ thông tin, bấm **Xác nhận thủ công**.
5. Chỉ ra rằng cùng booking state có thể chuyển sang **Agent tự động** hoặc trở lại nhân viên mà không mất hội thoại.

## Câu nói thử mic

Nếu Chrome cho phép Web Speech API, có thể nói:

> Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, hai vé.

Web Speech là khả năng của browser, không phải VALSEA success. Khi demo VALSEA/LiveKit thật phải dùng credentials và checklist trong `livekit-bus-pilot.md`.
