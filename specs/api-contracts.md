# API and Event Contracts — Alove

Tất cả booking và audit endpoint chạy Node runtime. Provider credentials chỉ tồn
tại ở Vercel/agent secret manager.

## Public call session

```text
POST /api/livekit/token
body: none

200 {
  token,
  sessionToken,
  conversationId,
  serverUrl,
  roomName
}
```

Server tự tạo `conversationId`, customer identity và role. `sessionToken` là
capability ngắn hạn dùng cho redispatch; client-supplied room,
role hoặc identity không có hiệu lực.

```text
POST /api/livekit/redispatch
{ sessionToken }
```

Observer dùng endpoint riêng có dashboard auth:

```text
POST /api/livekit/observer-token
{ conversationId }
```

## Agent booking API

Mọi endpoint yêu cầu `Authorization: Bearer <AGENT_WEBHOOK_SECRET>`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/booking/search` | Tìm trip thật theo tuyến/ngày/số khách |
| POST | `/api/booking/hold` | Giữ ghế atomic cho call |
| POST | `/api/booking/confirm` | Xác nhận explicit, tạo một booking idempotent |
| POST | `/api/booking/lookup` | Tra vé bằng cả code và phone |
| POST | `/api/booking/cancel` | Hủy current-call hoặc code+phone, trả ghế atomic |

## Persisted call events

```ts
type CallEvent =
  | { conversationId: string; type: 'call.started'; channel: 'web' | 'phone'; callerNumber?: string }
  | { conversationId: string; type: 'call.ended' }
  | { conversationId: string; type: 'transcript.final'; eventId: string; sequence: number; role: 'customer' | 'agent'; text: string }
  | { conversationId: string; type: 'booking.updated'; eventId: string; sequence: number; booking: BookingSnapshot }
```

`POST /api/call/events` yêu cầu agent bearer secret. Hai event có payload cuối
phải idempotent theo `eventId`; worker gửi với bounded retry.

## Realtime agent events

```ts
type AgentEvent = {
  callId: string
  eventId: string
  sequence: number
} & (
  | { type: 'agent.state'; state: 'idle' | 'listening' | 'thinking' | 'speaking' }
  | { type: 'booking.update'; booking: BookingSnapshot }
  | {
      type: 'semantic.annotation'
      timestamp: string
      sourceTranscript: string
      correctedText?: string
      tags: string[]
      annotations: string[]
    }
  | { type: 'call.end' }
)
```

Browser chỉ áp dụng event từ LiveKit participant kind `AGENT`, đúng current call,
schema hợp lệ và sequence lớn hơn event đã nhận.

### Semantic annotation

`semantic.annotation` là event có thứ tự trong cùng envelope `callId` / `eventId` /
`sequence` như các realtime agent event khác. `timestamp` là thời điểm Alove
tạo event sau khi nhận response annotation, không phải timestamp do VALSEA trả về;
giá trị là chuỗi ISO 8601 UTC kết thúc bằng `Z`. `sourceTranscript` là final
customer transcript đã gửi tới `POST /v1/annotations` và được giữ nguyên.
`correctedText` được map từ provider field `text`; response có `text` rỗng bị
coi là không hợp lệ, còn adapter chỉ bỏ `correctedText` khi giá trị hợp lệ đó
giống hệt `sourceTranscript`. `tags` và `annotations` luôn có mặt trong event,
nhưng mỗi mảng có thể rỗng.

Để event luôn nằm trong budget của LiveKit data channel, source/corrected text
tối đa 4.096 Unicode code point; mỗi mảng tối đa 16 item và mỗi chuỗi hiển thị
tối đa 80 code point. Python producer và Zod consumer đếm cùng đơn vị này.
Adapter stream response với trần 64 KiB trước khi parse, đồng thời giới hạn JSON
ở depth 8, 64 node mỗi item và 512 node toàn response. Vượt bất kỳ budget nào
được xử lý như response không hợp lệ và không ảnh hưởng call/booking flow.
Event hoàn chỉnh được serialize thành compact UTF-8 JSON (`ensure_ascii=false`)
và phải nằm trong 60 KiB, gồm cả ordering envelope; producer bỏ event vượt trần
và browser cũng từ chối raw payload vượt trần trước khi decode. Khoảng đệm này
giữ packet dưới giới hạn end-to-end của LiveKit.

Probe live Phase 00 chỉ xác nhận response shape sau:

```ts
type ObservedValseaAnnotationResponse = {
  text: string
  raw_text: string
  annotated_text: string
  annotations: []
}
```

Sample probe có `annotations: []`; không có `semantic_tags` hoặc
`accent_corrections`. Vì vậy adapter coi các field provider này là optional,
chuẩn hoá field vắng thành mảng rỗng, và chỉ phát các chuỗi hiển thị đã
kiểm tra vào `tags` / `annotations`. Contract không khẳng định raw element
schema mà probe chưa quan sát.

Event này chỉ là bằng chứng tham khảo. Nó không thay thế transcript, không
xác lập entity hay intent, không mutate `BookingSnapshot`, và không được dùng
để search, hold, confirm hoặc cancel booking. Network error, timeout, non-2xx hay
response không hợp lệ không tạo event thành công giả với mảng rỗng; call và
booking flow vẫn tiếp tục. Do đó, không có `semantic.annotation` không đồng
nghĩa với "không có semantic tag"; chỉ event thành công có `tags: []` mới
biểu diễn empty result đã quan sát.
