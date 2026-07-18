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
                         |
                       Neon
```

## Thành phần

### `apps/web`

- `/`: trang bán vé, đọc lịch chạy công khai từ inventory thật.
- `/console`: màn cuộc gọi LiveKit độc lập.
- `/dashboard`: lịch sử cuộc gọi, transcript và booking projection.
- `/api/livekit/token`: tạo call ID, identity và token customer ở server.
- `/api/livekit/observer-token`: chỉ dashboard được cấp token nghe giám sát.
- `/api/livekit/redispatch`: chỉ chấp nhận signed call-session capability.
- `/api/booking/*`: search, hold, confirm, lookup và cancel.
- `/api/call/events`: nhận audit event có bearer auth từ Python agent.
- `src/lib/db/schema.ts` và `drizzle/`: schema/migration duy nhất.

### `agent`

LiveKit Python worker sở hữu STT, turn handling, LLM tool selection và TTS. Agent
không sở hữu giá, lịch, ghế hoặc mã vé. Mọi fact vận hành phải đến từ response của
booking API.

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
- bookings và payments;
- calls, final call turns và booking snapshots cho audit.

## Trust boundaries

1. Public browser không gửi room name, role hay identity vào token service.
2. Server tạo signed call session; redispatch phải gắn với session đó.
3. Observer token luôn đi qua dashboard authentication.
4. Booking/call-event endpoints yêu cầu `AGENT_WEBHOOK_SECRET`.
5. Confirm/cancel là thao tác atomic tại database; retry phải idempotent.
6. Booking cũ chỉ được tra cứu hoặc hủy khi mã vé và số điện thoại cùng khớp.
7. Không lưu raw audio. Transcript audit chỉ nhận lượt final.

## Booking lifecycle

```text
collecting
    -> trip_proposed          hold ghế còn hiệu lực
    -> awaiting_confirmation  đã đọc lại thông tin
    -> confirmed              transaction tạo booking + chuyển ghế sang booked
```

Hold hết hạn được coi như available khi search và không thể confirm. Đổi chuyến
hoặc đổi số lượng phải trả lại hold thừa của call trước khi giữ tập ghế mới.

## Call audit

Agent phát hai loại dữ liệu:

- Realtime event qua LiveKit: `agent.state`, `booking.update`, `call.end`.
- Persisted event qua `/api/call/events`: `call.started`, `transcript.final`,
  `booking.updated`, `call.ended`.

Event có `eventId` để retry không tạo bản ghi trùng; worker retry có giới hạn khi
gửi lỗi. Dashboard đọc persisted projection; nếu data channel bị mất, booking
trong database vẫn không thay đổi. Hệ thống hiện chưa có external durable queue,
vì vậy lỗi mạng kéo dài vẫn phải được phát hiện qua log/monitoring.

## Chế độ lỗi

- Thiếu LiveKit/DB/agent config: readiness trả lỗi và UI báo unavailable; không rơi
  về demo giả.
- Agent không vào room: browser thử redispatch tối đa theo signed session rồi đưa
  ra trạng thái kết thúc có thể thử lại.
- Booking API lỗi: agent xin khách chờ hoặc thử lại; không tạo fact thay thế.
- Realtime event sai sender/schema/call/sequence: browser bỏ event.

## Ngoài phạm vi runtime

OrderVoice, Fastify gateway, ERP export, deterministic browser booking, `/engine`,
Web Speech/device TTS và Human/Agent two-sided demo đã bị loại khỏi repository.
