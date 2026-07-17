# API and Event Contracts

All JSON payloads use UTF-8, RFC 3339 timestamps and Vietnamese strings unchanged. Server validates request/response shapes with Zod. No browser request contains provider credentials.

## Core types

```ts
type Source = 'browser' | 'telephony' | 'replay'
type Speaker = 'caller' | 'agent' | 'unknown'
type TranscriptKind = 'partial' | 'final'
type OrderStatus = 'capturing' | 'review_required' | 'ready_for_approval' | 'approved' | 'exported'

type Evidence = {
  segmentId: string
  quote: string
  startMs: number
  endMs: number
  confidence: number
}

type TranscriptSegment = {
  id: string
  conversationId: string
  kind: TranscriptKind
  speaker: Speaker
  text: string
  startedAtMs: number
  endedAtMs: number
  confidence: number | null
  source: Source
}

type OrderLine = {
  id: string
  sku: string | null
  productLabel: string
  quantity: number | null
  unit: string | null
  resolution: 'resolved' | 'ambiguous' | 'unresolved'
  evidence: Evidence[]
}
```

## HTTP endpoints

| Method | Path | Request | Response | Invariant |
|---|---|---|---|---|
| `GET` | `/api/health` | — | `{ status: 'ok' }` | no secret/DB dependency |
| `GET` | `/api/demo` | — | `DemoWorkspace` | deterministic, labelled fixture |
| `POST` | `/api/demo/advance` | `{ step: number }` | `DemoWorkspace` | applies only final fixture segments |
| `POST` | `/api/conversations` | `{ source }` | `Conversation` | source recorded once |
| `POST` | `/api/conversations/:id/segments` | `TranscriptSegment` sans id | `Conversation` | rejects `partial` persistence |
| `PATCH` | `/api/orders/:id` | validated user changes | `OrderDraft` | preserves audit metadata |
| `POST` | `/api/orders/:id/approve` | `{ actor }` | `OrderDraft` | requires no blocking exceptions |
| `POST` | `/api/orders/:id/export` | `{ idempotencyKey }` | `ExportResult` | requires approved state; retry is stable |
| `POST` | `/api/replies/:conversationId/speak` | `{ replyId, provider? }` | audio or `{ mode: 'device' }` | human UI action only |
| `POST` | `/api/webhooks/twilio/voice` | Twilio form body | TwiML | verifies signature in production |
| `POST` | `/api/webhooks/twilio/status` | Twilio form body | `204` | updates call state only |

## Gateway WebSocket protocol

Connect: `wss://<gateway>/ws/media/:conversationId?source=browser|replay`.

Client binary messages contain raw little-endian PCM16. Client control messages are JSON:

```ts
{ type: 'start', source: 'browser' | 'replay', trackId: string }
{ type: 'end_of_utterance' }
{ type: 'stop' }
```

Server text messages are JSON:

```ts
{ type: 'transcript.partial', segment: Omit<TranscriptSegment, 'id' | 'conversationId'> }
{ type: 'transcript.final', segment: Omit<TranscriptSegment, 'id' | 'conversationId'> }
{ type: 'source.status', state: 'connecting' | 'live' | 'error', detail?: string }
```

`transcript.partial` never invokes the order reducer. `transcript.final` is idempotent by provider event ID or segment content hash.
