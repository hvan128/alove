# Kiến trúc Alove

## Tổng quan

Alove có một luồng production duy nhất. Next.js phục vụ giao diện và API, Python
agent giữ phiên hội thoại trong LiveKit, còn Neon là nguồn sự thật cho inventory
và booking.

```text
Web browser                         SIP caller
     |                                  |
     +--------------- LiveKit ----------+
                         |
                  Python agent
                         |
             authenticated HTTPS tools
                         |
                     Next.js
                  /api/booking/*
                    /api/call/*
                    /verify
                    /evidence
                    /     \
                 Neon    HTTPS webhook (optional)
```

## Thành phần

### `apps/web`

- `/`: trang bán vé, đọc lịch chạy công khai từ inventory thật.
- `/console`: màn cuộc gọi LiveKit độc lập.
- `/dashboard`: lịch sử cuộc gọi, transcript và booking projection.
- `/verify?code=…`: trang xác minh vé, chỉ trả snapshot tối thiểu sau khi code và
  phone cùng khớp.
- `/evidence`: kết quả benchmark synthetic/no-PII đã commit; không nhận provider key.
- `/api/livekit/token`: tạo call ID, identity và token customer ở server.
- `/api/livekit/observer-token`: chỉ dashboard được cấp token nghe giám sát.
- `/api/livekit/redispatch`: chỉ chấp nhận signed call-session capability.
- `/api/booking/*`: search, hold, confirm, lookup, cancel và public verify.
- `/api/booking/webhook/drain`: cron-authenticated drainer cho durable outbox.
- `/api/call/events`: nhận audit event có bearer auth từ Python agent.
- `src/lib/db/schema.ts` và `drizzle/`: schema/migration duy nhất.

### `agent`

LiveKit Python worker sở hữu STT, turn handling, LLM tool selection và TTS. Agent
không sở hữu giá, lịch, ghế hoặc mã vé. Mọi fact vận hành phải đến từ response của
booking API.

Cascade mặc định dùng VALSEA realtime STT và fail startup nếu provider/credential
đang chọn không hợp lệ. Sau final customer transcript, `agent/valsea_api.py` có
thể gọi annotation HTTP bất đồng bộ; response chỉ tạo evidence advisory và không
tham gia tool selection hay booking lifecycle.

`scripts/probe-valsea-endpoints.ts` nằm ngoài runtime và chỉ dùng để maintainer
xác minh API provider bằng fixture synthetic. Nó không tạo web upload endpoint;
Alove hiện không có route so sánh batch audio, còn audio cuộc gọi production đi
qua VALSEA realtime trong worker.

### LiveKit

LiveKit vận chuyển audio, caption và realtime UI event. Data channel là đường cập
nhật nhanh, không phải database. Browser chỉ nhận event từ participant có kind
`AGENT` và chỉ áp dụng payload qua schema validation.

### Neon

Neon sở hữu:

- operators, routes, trips và seats;
- seat holds có thời hạn;
- bookings, immutable verification snapshots và payments;
- calls, final call turns và booking snapshots cho audit.
- public rate-limit buckets dùng HMAC digest, không lưu raw IP/code/phone;
- booking webhook outbox, lease, attempt count và lịch retry.

## Trust boundaries

1. Public browser không gửi room name, role hay identity vào token service.
2. Server tạo signed call session; redispatch phải gắn với session đó.
3. Observer token luôn đi qua dashboard authentication.
4. Booking/call-event endpoints yêu cầu `AGENT_WEBHOOK_SECRET`.
5. Confirm/cancel là thao tác atomic tại database; retry phải idempotent.
6. Booking cũ chỉ được tra cứu hoặc hủy khi mã vé và số điện thoại cùng khớp.
7. Public verify dùng cùng predicate code+phone, response tối thiểu, `no-store` và
   rate limit phân tán; HMAC key tách khỏi các secret khác.
8. Webhook chỉ được gửi tới HTTPS host allowlist sau DNS/IP validation, ký HMAC và
   không follow redirect.
9. Không lưu raw audio. Transcript audit chỉ nhận lượt final.

## Booking lifecycle

```text
collecting
    -> trip_proposed          hold ghế còn hiệu lực
    -> awaiting_confirmation  đã đọc lại thông tin
    -> confirmed              transaction tạo booking + immutable verify snapshot
                              + chuyển ghế sang booked + enqueue webhook nếu bật
```

Hold hết hạn được coi như available khi search và không thể confirm. Đổi chuyến
hoặc đổi số lượng phải trả lại hold thừa của call trước khi giữ tập ghế mới.

## Call audit

Agent phát hai loại dữ liệu:

- Realtime event qua LiveKit: `agent.state`, `booking.update`,
  `semantic.annotation`, `latency.turn`, `call.end`.
- Persisted event qua `/api/call/events`: `call.started`, `transcript.final`,
  `booking.updated`, `call.ended`.

Event có `eventId` để retry không tạo bản ghi trùng; worker retry có giới hạn khi
gửi lỗi. Dashboard đọc persisted projection; nếu data channel bị mất, booking
trong database vẫn không thay đổi. Call-audit delivery chưa có durable queue nên
lỗi mạng kéo dài phải được phát hiện qua log/monitoring. Riêng webhook xác nhận vé
có durable outbox trong Neon và retry tối đa ba attempt đã persist.

`semantic.annotation` là evidence tham khảo, không sửa transcript/entity/booking.
`latency.turn` ghép metric theo speech ID và hiển thị chặng lâu nhất bằng `max` vì
các chặng preemptive có thể chồng lấn; nó không phải tổng end-to-end và không được
persist vào dashboard.

## Chế độ lỗi

- Thiếu LiveKit/DB/agent config: readiness trả lỗi và UI báo unavailable; không rơi
  về demo giả.
- Agent không vào room: browser thử redispatch tối đa theo signed session rồi đưa
  ra trạng thái kết thúc có thể thử lại.
- Booking API lỗi: agent xin khách chờ hoặc thử lại; không tạo fact thay thế.
- Annotation lỗi/timeout: bỏ evidence của lượt đó; cuộc gọi và booking tiếp tục.
- Webhook lỗi: booking vẫn confirmed; durable outbox retry theo policy đã persist.
- Realtime event sai sender/schema/call/sequence: browser bỏ event.

## Ngoài phạm vi runtime

Gateway cũ, ERP export, deterministic browser booking, browser speech fallback và
human/agent two-sided demo không thuộc runtime hiện hành.
