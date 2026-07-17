# API and Event Contracts

All JSON is UTF-8. Vietnamese text is retained unchanged. The Fastify gateway validates inputs with Zod and never accepts provider credentials from a browser.

## Web surface

| Method | Path | Response | Invariant |
|---|---|---|---|
| `GET` | `/api/health` | `{ status: 'ok' }` | Next.js/Vercel demo health; no provider or DB dependency |

## Fastify gateway HTTP surface

Gateway routes are prefixed with `/v1`.

| Method | Path | Request | Response | Invariant |
|---|---|---|---|---|
| `GET` | `/v1/health` | — | `{ status: 'ok' }` | no secret/DB dependency |
| `GET` | `/v1/demo` | — | `DemoWorkspace` | labelled fixture or hydrated Neon state |
| `POST` | `/v1/demo/advance` | `{ step: positive integer }` | `DemoWorkspace` | applies only final fixture segments |
| `POST` | `/v1/conversations/:id/segments` | full `TranscriptSegment` with `kind: 'final'` | `DemoWorkspace` | rejects partial persistence; duplicate final is idempotent |
| `POST` | `/v1/orders/:id/lines/:lineId/correct` | `{ sku, productLabel, quantity > 0, unit }` | `OrderDraft` | explicit human correction preserves evidence, clears only that line's exception and resets approval |
| `POST` | `/v1/orders/:id/approve` | `{ actor }` | `OrderDraft` | rejects blocking exceptions |
| `POST` | `/v1/orders/:id/export` | `{ idempotencyKey }` | `{ draft, externalReference }` | requires approved state; retry is stable |
| `POST` | `/v1/webhooks/twilio/voice` | Twilio form body | TwiML | production verifies Twilio signature |
| `POST` | `/v1/webhooks/twilio/status` | Twilio form body | `204` | production verifies Twilio signature |

The no-key public demo speaks only through an explicit browser/device-voice button. Provider TTS remains server-only and is not exposed as a public browser endpoint.

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
  providerEventId?: string
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

## Browser/replay WebSocket protocol

Connect to `wss://<gateway>/ws/media/:conversationId`. Client binary frames are raw little-endian PCM16, mono, 16 kHz, normally 20 ms / 320 samples. Client control messages are JSON:

```ts
{ type: 'start', source: 'browser' | 'replay', trackId: string }
{ type: 'end_of_utterance' }
{ type: 'stop' }
```

Server messages are JSON:

```ts
{ type: 'transcript.partial', segment: Omit<TranscriptSegment, 'id' | 'conversationId'> }
{ type: 'transcript.final', segment: Omit<TranscriptSegment, 'id' | 'conversationId'> }
{ type: 'source.status', state: 'connecting' | 'live' | 'error', detail?: string }
```

`transcript.partial` is ephemeral UI only. Only a validated final event reaches the repository. The repository deduplicates final segments by provider event ID, or by source/speaker/time/text when that ID is unavailable; the Neon schema also has a per-conversation provider-event unique index.

## Direct phone WebSocket protocol

Twilio connects to `wss://<gateway>/ws/telephony/:conversationId` using Media Streams events. The gateway accepts `media` events containing base64 μ-law 8 kHz samples, decodes/resamples them to the same PCM16 16 kHz internal contract, then starts a VALSEA session only when `VALSEA_API_KEY` is server configured. The initial `Connect/Stream` route is inbound-ASR-first; live phone-side TTS needs the separately provisioned outbound-media step recorded in `docs/integration-feasibility.md`.
