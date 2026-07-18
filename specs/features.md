# Feature Specification — Alove

## F-01: LiveKit-only call

`/` và `/console` mở cùng một luồng LiveKit. Token endpoint tạo room/identity ở
server. Thiếu cấu hình hiển thị lỗi có thể hành động; không có zero-key fallback.

## F-02: Authoritative trip search

Agent chỉ mời trip active trong Neon, đúng chiều tuyến/ngày và đủ ghế còn hiệu
lực. Hold hết hạn được coi là available.

## F-03: Atomic seat hold và confirmation

Hai caller không thể giữ cùng ghế. Đổi chuyến/số lượng trả hold cũ. Confirm chỉ
nhận hold chưa hết hạn, explicit confirmation và idempotency key của call/trip.

## F-04: Ticket result

Booking confirmed hiển thị mã vé, trip, hành khách, ghế, tổng tiền và QR từ
server snapshot đã validate. UI không tự tạo mã hoặc giá.

## F-05: Secure lookup/cancel

Booking của cuộc gọi cũ cần cả code và phone khớp. Booking vừa tạo có thể hủy
trong chính call ID. Cancel và release seats là một thao tác atomic.

## F-06: Persisted call audit

Call lifecycle, transcript final và booking snapshot được ghi idempotent từ agent,
với bounded retry. Không lưu partial transcript hoặc raw audio. Call-audit delivery
chưa có durable queue; booking webhook dùng outbox Neon riêng.

## F-07: Operations dashboard

Dashboard có authentication, danh sách/detail call, persisted transcript, booking
projection và observer token subscribe-only cho call đang active.

## F-08: Readiness

Health/readiness kiểm tra database, LiveKit và server secrets cần thiết. Production
không được báo healthy khi booking không thể hoạt động.

## F-09: Responsive and accessible UI

Call overlay trap/restore focus, hỗ trợ reduced motion, mobile ticket sheet và
trạng thái lỗi mic/kết nối đọc được bằng assistive technology.

## F-10: Semantic evidence

Sau final customer transcript, agent có thể gọi VALSEA annotation và phát
`semantic.annotation` qua LiveKit. Event là advisory evidence: không thay transcript,
entity, intent hoặc booking, và lỗi provider không chặn cuộc gọi.

## F-11: Machine-readable ticket output

Ticket confirmed cung cấp QR tới `/verify?code=…`, JSON contract versioned và
optional HMAC webhook qua durable outbox. Verify yêu cầu code+phone, rate limit
phân tán và chỉ trả immutable minimal snapshot, không trả name/phone/internal ID.

## F-12: Ephemeral turn latency

UI hiển thị EOU, transcription, LLM TTFT, TTS TTFB của lượt hoàn chỉnh mới nhất.
Vì preemptive stages có thể overlap, summary là chặng lâu nhất (`max`), không cộng
thành end-to-end. Metric được reset khi mở call mới và không persist vào dashboard.
