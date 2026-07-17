# API and Event Contracts — VéĐi

All text is UTF-8 Vietnamese. Public demo requires no provider credential and stores no personal data remotely.

## Deployed web surface

| Method | Path | Response | Invariant |
|---|---|---|---|
| `GET` | `/api/health` | `{ status: 'ok' }` | no provider or database dependency |
| `GET` | `/console` | VéĐi Web Call workspace | deterministic no-key demo |
| `GET` | `/design-system` | shared token/component catalogue | same primitives as console |

## Core contracts

```ts
type CallMode = 'human' | 'auto'
type CallStatus = 'idle' | 'connected' | 'ended'
type CallRole = 'customer' | 'staff' | 'agent' | 'system'
type BookingStatus = 'collecting' | 'trip_proposed' | 'awaiting_confirmation' | 'confirmed'

type CallMessage = {
  id: string
  conversationId: string
  role: CallRole
  text: string
  createdAt: string
  channel: 'voice' | 'text' | 'preset'
  final: boolean
}

type BookingDraft = {
  id: string
  conversationId: string
  status: BookingStatus
  origin: string | null
  destination: string | null
  travelDateLabel: string | null
  timeWindow: string | null
  passengerCount: number | null
  selectedTrip: BusTrip | null
  seats: string[]
  passengerName: string | null
  phone: string | null
  totalFareVnd: number | null
  bookingCode: string | null
  evidenceMessageIds: string[]
}
```

`confirmed` is valid only when trip, passenger count, passenger name, phone, one seat per passenger and booking code exist.

## Deterministic agent boundary

```ts
type AgentTurn = {
  draft: BookingDraft
  reply: string
}

advanceBookingAgent(draft: BookingDraft, message: CallMessage): AgentTurn
confirmBooking(draft: BookingDraft, actor: 'customer' | 'staff'): BookingDraft
```

Agent input must be a final customer message. Confirmation is idempotent: existing `bookingCode` and seats are preserved.

## Future LiveKit token endpoint

Not implemented or exposed in this release. Pilot endpoint will accept authenticated participant identity and server-controlled room name, returning only short-lived join token and `wss` URL. `LIVEKIT_API_SECRET` remains server-only.

```ts
POST /api/livekit/token
{ roomName: string, participantName: string, role: 'customer' | 'staff' }

201
{ serverUrl: string, participantToken: string }
```

## Legacy compatibility

Existing Fastify VALSEA/Twilio/order endpoints remain in source for the previous MVP and its tests. VéĐi public UI does not call them. A later pilot may replace their order projection with booking tools after LiveKit/provider credentials are provisioned.

