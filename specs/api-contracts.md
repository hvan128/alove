# API and Event Contracts — SpeechToInvoice

> **Status after TASK-003 integration:** current source contract is the versioned `vedi.events` schema in `packages/contracts/src/index.ts`, used by `/call`, `/staff`, LiveKit data and the Agent worker. The first contract below is retained only as the historical pre-TASK-003 browser demo. Current runtime mapping is documented in [`../docs/current-vs-target-architecture.md`](../docs/current-vs-target-architecture.md).

This document names the historical browser contract and **Pilot Contract v1 — target credentialed pilot**. Neither section overrides current source schemas.

## Historical web surface

| Method | Path | Response | Invariant |
|---|---|---|---|
| `GET` | `/api/health` | `{ status: 'ok' }` | no provider or database dependency |
| `GET` | `/console` | SpeechToInvoice Web Call workspace | deterministic browser demo |
| `GET` | `/design-system` | shared token/component catalogue | same UI primitives as console |

## Historical pre-TASK-003 browser-demo contract

This removed `/console`-first profile was a same-browser, in-memory state machine. It remains documented to explain old release artifacts; it is not the current `/call` + `/staff` source contract.

```ts
type CallMode = 'human' | 'auto'
type CallStatus = 'idle' | 'connected' | 'ended'
type CallRole = 'customer' | 'staff' | 'agent' | 'system'
type BookingStatus =
  | 'collecting'
  | 'trip_proposed'
  | 'awaiting_confirmation'
  | 'confirmed'

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

`advanceBookingAgent` accepts only final (`final === true`) `customer` messages. When a supported message changes the draft, its ID is appended to the flat `evidenceMessageIds` array. That array is not field-level evidence: it neither maps a field to a supporting message nor validates that a message supports the current field value.

The demo's readiness check requires these seven current values: `origin`, `destination`, `travelDateLabel`, `passengerCount`, `selectedTrip`, `passengerName`, and `phone`. `timeWindow`, `seats`, and `totalFareVnd` are derived summary/output data, not readiness prerequisites. The automatic path recognizes supported Vietnamese confirmation keywords; the staff surface can invoke its manual demo confirm action. Neither behavior creates or resolves a persisted explicit-confirmation event, and the staff action performs no authorization check.

Once an in-memory draft is confirmed, `confirmBooking` returns that same draft and its deterministic `bookingCode` on a repeat call. This is demo-state reuse only—not a scoped API idempotency guarantee—and it does not define request-key, payload-conflict, or cross-scope behavior.

Trip data is static in the public demo. Any displayed code, seats, fare, or **Đã giữ vé** state is deterministic demonstration output, not a ticket, inventory hold, or availability promise.

## Pilot Contract v1 — target credentialed pilot

Pilot Contract v1 — target credentialed pilot intentionally uses a separate schema namespace and names from the public demo: `agent` rather than `auto`, `passenger` rather than `customer`, `travelDate` rather than `travelDateLabel`, `vietnamesePhone` rather than `phone`, and `fieldEvidenceMessageIds` rather than `evidenceMessageIds`.

```ts
type PilotCallMode = 'agent' | 'human'
type PilotCallRole = 'passenger' | 'staff' | 'agent' | 'system'
type PilotRequiredBookingField =
  | 'origin'
  | 'destination'
  | 'travelDate'
  | 'passengerCount'
  | 'selectedTrip'
  | 'passengerName'
  | 'vietnamesePhone'

type PilotBookingDraft = {
  id: string
  conversationId: string
  status: BookingStatus
  origin: string | null
  destination: string | null
  travelDate: string | null
  passengerCount: number | null
  selectedTrip: BusTrip | null
  passengerName: string | null
  vietnamesePhone: string | null
  fieldEvidenceMessageIds: Partial<Record<PilotRequiredBookingField, string>>
  summary: string | null
  bookingCode: string | null
}

type ConfirmationEvent = {
  id: string
  conversationId: string
  messageId: string
  actor: 'passenger' | 'staff'
  actorId: string
  kind: 'explicit_booking_confirmation'
}

type StaffConfirmationAuthorization = {
  staffId: string
  conversationId: string
  permission: 'booking:confirm'
  active: boolean
}

type PilotConfirmBookingInput = {
  confirmationEventId: string
  actor: 'passenger' | 'staff'
  staffAuthorization?: StaffConfirmationAuthorization
  idempotencyKey: string
  /** Derived by the server from conversation, draft, actor role and actor ID. */
  idempotencyScope?: never
  /** Calculated by the server from the normalized command. */
  requestHash?: never
  /** Calculated by the server from the read-back summary the actor accepted. */
  acceptedSummaryHash?: never
}
```

For Pilot Contract v1 — target credentialed pilot, `awaiting_confirmation` and `confirmed` require all seven `PilotRequiredBookingField` values, a current field-to-final-passenger-message entry for each value, and a persisted summary. `timeWindow`, fare, and seat assignments remain derived summary data rather than readiness prerequisites.

`confirmPilotBooking` must resolve a persisted explicit confirmation event in the same conversation. A staff actor must have a matching active, conversation-bound `booking:confirm` authorization. The server derives the idempotency scope from the conversation, draft, actor role, and actor ID, stores that scope with the caller's `idempotencyKey`, a normalized `requestHash`, and the accepted-summary hash.

| Retry case | Required Pilot Contract v1 — target credentialed pilot behavior |
|---|---|
| Same scope, same key, same normalized payload and accepted summary | Return the originally accepted booking code. |
| Same scope and key, changed payload or accepted summary | Reject with `IDEMPOTENCY_CONFLICT`; do not return or create a code. |
| Same raw key in another server-derived scope | Reject with `IDEMPOTENCY_SCOPE_CONFLICT`; do not disclose or return another scope's code. |

The Pilot Contract v1 — target credentialed pilot command must make this decision transactionally, with uniqueness on `(idempotencyScope, idempotencyKey)`. See `docs/data-model.md` for the target storage design.

## Provider boundary and exclusions

Trip data may be provider-sourced only after that provider is enabled and credentialed. Current source includes a LiveKit/VALSEA pilot path but does not claim credentialed production success without smoke evidence. Payment, real seat lock, delivery messaging, PSTN/SIP, Zalo raw call media and autonomous confirmation remain excluded until separately verified.
