# Lộ trình pilot Alove

## Mục tiêu

Tài liệu evergreen này định hướng pilot Alove với một nhà xe, một luồng đặt vé
tiếng Việt và dữ liệu vận hành thật. Đây là deliverable mới của Alove, không phải
việc khôi phục roadmap OrderVoice cũ.

Pilot cần chứng minh ba outcome:

1. Khách có thể tìm chuyến, giữ ghế, xác nhận và hủy vé qua hội thoại.
2. Nhà xe nhận dữ liệu có cấu trúc, kiểm chứng được và không bị bán trùng ghế.
3. Đội vận hành có bằng chứng về độ chính xác, độ trễ, lỗi và khả năng khôi phục.

## Baseline đã có

- Web production tại <https://vedi-one.vercel.app/>; LiveKit agent chạy tại vùng
  `ap-south` với cascade VALSEA STT, direct LLM và Google Chirp 3 TTS.
- API/Neon là nguồn sự thật cho lịch, giá, ghế, booking và audit. Agent không tự
  tạo fact vận hành.
- Search, hold, confirm, cancel, QR phone-gated verification, BookingSnapshot JSON
  v1 và webhook outbox đã có contract và automated tests.
- Synthetic tonal Vietnamese, code-switch và noisy telephone 8 kHz có artifact
  so sánh VALSEA với baseline Whisper.
- Production smoke đã xác nhận web/health, agent join + greeting và một booking
  synthetic từ search tới cancel mà không để lại hold.

Baseline chưa chứng minh cuộc gọi PSTN, customer speech production, scan QR bằng
camera điện thoại, giao webhook tới receiver ngoài hoặc giọng vùng miền thật.

## Phạm vi pilot

### Trong phạm vi

- Một operator Mai Anh, inventory và fare do Neon quản lý.
- Web call trước; SIP/PSTN chỉ mở khi có số, trunk và consent phù hợp.
- Tiếng Việt giao tiếp tự nhiên; code-switch thuật ngữ phổ biến.
- Dashboard audit cho operator; không dùng dashboard làm nguồn quyết định booking.
- Dữ liệu production tối thiểu, không đưa PII vào log, report hay artifact demo.

### Ngoài phạm vi ban đầu

- Multi-tenant billing, marketplace nhiều nhà xe hoặc automatic provider failover.
- Tuyên bố hỗ trợ accent vùng miền khi chưa có fixture thật có consent.
- Tuyên bố multilingual-array khi provider chưa hỗ trợ contract đó.

## Lộ trình 90 ngày

### Ngày 0–30 — pilot có giám sát

- Chọn 5–10 nhân viên/khách thử nghiệm có consent và khung giờ trực vận hành.
- Hoàn tất scan QR trên điện thoại thật: đúng phone hiển thị snapshot tối thiểu;
  sai phone/code không tiết lộ booking.
- Cấu hình một webhook receiver staging của nhà xe; kiểm tra HMAC, idempotency,
  retry và dead-letter/recovery path.
- Ghi một bộ 20–30 lượt thoại có consent, gồm im lặng, sửa ý, nói nhanh và
  code-switch; redaction trước khi phân tích.
- Đặt runbook sự cố và owner cho inventory, LiveKit, VALSEA, LLM và TTS.

Điều kiện qua cổng: không bán trùng ghế, không rò PII, toàn bộ booking test được
hủy/đối soát và các lỗi provider có đường phục hồi rõ.

### Ngày 31–60 — đo chất lượng thực tế

- Đo completion rate search → hold → confirm, cancel success, abandonment và số
  lần operator phải can thiệp.
- Thu EOU/TTFT/TTFB cùng full-turn latency trên customer speech; phân tích p50/p95
  theo provider và chất lượng mạng.
- Xây fixture giọng vùng miền thật có consent; so sánh trên cùng input và cùng
  language hint, không dùng synthetic để thay thế claim này.
- Review ngẫu nhiên transcript đã redacted về xưng hô, xác nhận rõ ràng và lỗi
  nhận dạng tên riêng/địa danh.
- Diễn tập webhook outage, agent restart và database migration/rollback.

Điều kiện qua cổng: booking completion và latency đạt ngưỡng đã thống nhất với
operator; lỗi quan trọng có alert, owner và thời gian phục hồi đo được.

### Ngày 61–90 — mở rộng có kiểm soát

- Nếu web pilot ổn định, chạy một PSTN canary với số và SIP trunk thật; giữ web
  làm đường fallback.
- Mở thêm ca vận hành hoặc tuyến, không mở nhiều operator cùng lúc.
- Đánh giá chi phí mỗi cuộc gọi/booking, provider credits và tải database/outbox.
- Chốt quyết định tiếp tục, chỉnh scope hoặc dừng dựa trên metric và incident.

Điều kiện tốt nghiệp pilot: operator chấp nhận quy trình, có bằng chứng end-to-end
trên kênh được chọn và chi phí/độ tin cậy phù hợp để mở rộng.

## Scorecard

| Nhóm | Metric tối thiểu |
|---|---|
| Booking | Completion rate; hold/confirm/cancel success; zero double-sell |
| Voice | EOU, TTFT, TTFB, full-turn p50/p95; STT correction rate |
| Quality | Task accuracy; code-switch; regional-accent evidence có consent |
| Operations | Intervention rate; incident count; recovery time; outbox backlog |
| Trust | PII/log audit; wrong-phone disclosure = 0; consent coverage |
| Business | Cost/call; cost/confirmed booking; operator acceptance |

Ngưỡng số cụ thể được ký với operator trước pilot để tránh chọn mục tiêu sau khi
đã xem kết quả.

## Go/no-go và bằng chứng

- **Go:** không có lỗi an toàn nghiêm trọng, không bán trùng, dữ liệu đối soát được,
  operator chấp nhận và metric đạt ngưỡng đã ký.
- **Hold:** thiếu evidence nhưng không có sự cố an toàn; giữ phạm vi và thu thêm
  mẫu thay vì mở rộng.
- **No-go:** rò PII, sai inventory/fare, bán trùng, không thể phục hồi hoặc chi phí
  vượt ngưỡng.

Bằng chứng release hiện hành nằm trong
`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md` và
`docs/rubric-checklist.md`. Các plan có ngày chỉ là lịch sử triển khai; roadmap
này là tài liệu pilot canonical.
