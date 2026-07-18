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

## Public ticket verification

The QR opens the page route `/verify?code=<booking-code>`; it never targets an API
or contains a phone/secret. The page must collect the matching phone before it
calls the read-only endpoint:

```text
POST /api/booking/verify
Content-Type: application/json
{ "code": "MA-260718-0001", "phone": "0909123456" }
```

The request body is capped at 2 KiB. Code+phone are matched in one database
predicate; either factor being wrong returns the same `404` body. Responses are
`no-store`/`no-referrer`. Successful responses contain only the route, departure,
vehicle, pickup/dropoff, seats, passenger count, fare and booking code—never name,
phone, conversation/internal IDs or confirmation text. Atomic Neon rate buckets
apply coarse IP and credential-pair budgets across serverless instances; bucket
keys are HMAC digests and fail closed if storage or
`BOOKING_VERIFICATION_SECRET` is unavailable.
Each successful confirmation stores an immutable verification snapshot on the
booking row. Later route, schedule, vehicle or price edits therefore cannot
rewrite or invalidate an already-issued ticket.

Downloaded ticket JSON is a strict `BookingSnapshot` with
`schemaVersion: "1.0"`. It is portable personal data, not a signed proof; the
code+phone verification flow remains authoritative.

## Optional booking webhook

When the URL, signing secret, host allowlist and `CRON_SECRET` are valid,
authoritative confirmation enqueues a strict `booking.confirmed` v1 event in the
durable outbox in the same SQL statement. Delivery is `disabled` when URL,
signing secret and allowlist are all absent, even if `CRON_SECRET` was provisioned
independently. If any of those three delivery variables is present, all four must
be valid; partial/weak/unsafe configuration is `misconfigured` and performs no
request.

```text
POST <BOOKING_WEBHOOK_URL>
Content-Type: application/json
Idempotency-Key: booking.confirmed.v1:<booking-code>
X-Alove-Event: booking.confirmed
X-Alove-Timestamp: <unix-seconds>
X-Alove-Signature: sha256=<hex HMAC>
```

The signature input is the exact UTF-8 string
`<X-Alove-Timestamp>.<raw JSON body>` using `BOOKING_WEBHOOK_SECRET`. Receivers
must compare in constant time, reject timestamps outside a five-minute replay
window, and deduplicate `Idempotency-Key`. Production URLs are HTTPS port 443,
must match `BOOKING_WEBHOOK_ALLOWED_HOSTS`, resolve only to public addresses and
cannot redirect. The sender pins a validated public IPv4 address into the TLS
connection while preserving the allowlisted hostname for SNI/Host, so request
delivery performs no second DNS lookup. Delivery retries only network errors,
408/425/429/5xx, with a
2.5 s per-attempt timeout and at most three attempts persisted across retries.
Webhook failure never rolls back a confirmed booking. Logs exclude URL, payload,
name, phone, signature and secrets.

`GET /api/booking/webhook/drain` is invoked every minute by Vercel Cron and
requires `Authorization: Bearer <CRON_SECRET>`. It claims at most three due rows,
including stale one-minute leases after a process crash. Only network/DNS,
408/425/429/5xx failures receive a future `next_attempt_at`; invalid payload,
private destination and other 4xx results are terminal even if confirmation is
replayed.

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
  | {
      type: 'latency.turn'
      latency: {
        speechId: string
        measuredAt: string
        slowestStageSeconds: number
        endOfUtteranceSeconds: number
        transcriptionSeconds: number
        llmTtftSeconds: number
        ttsTtfbSeconds: number
      }
    }
  | { type: 'call.end' }
)
```

Browser chỉ áp dụng event từ LiveKit participant kind `AGENT`, đúng current call,
schema hợp lệ và sequence lớn hơn event đã nhận.

`latency.turn` chỉ được phát khi đã ghép đủ EOU, LLM TTFT và TTS TTFB của cùng
`speechId`. Mỗi số là giây hữu hạn, không âm. Vì cascade bật preemptive generation,
các chặng có thể chồng lấn; `slowestStageSeconds` là
`max(EOU, transcription, TTFT, TTFB)` để
tóm tắt chặng lâu nhất, **không** phải tổng end-to-end. Browser giữ duy nhất lượt
hoàn chỉnh mới nhất trong bộ nhớ và xóa nó khi bắt đầu call mới; metric không được
persist vào dashboard. `measuredAt` lấy từ timestamp của EOU để
completion đến muộn không thể ghi đè một lượt mới hơn. Giá trị EOU/transcription
`0` của LiveKit nghĩa là không đo được và được UI hiển thị bằng dấu `—`, không phải
`0 ms`.

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

Provider probe lúc `2026-07-18T15:17:31.294Z` chỉ xác nhận response shape sau:

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
