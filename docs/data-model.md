# SpeechToInvoice data model

This document defines the logical pilot data model. `db/schema.ts` currently contains a mix of legacy generic tables and bus-ticket-shaped tables; it is a persistence seam, not proof of a connected Neon runtime. Tables marked **target pilot schema** require a reviewed migration before use.

## Ownership and global invariants

The booking application/core owns state transitions, provenance validation, explicit confirmation and idempotency. Repositories own transactions and storage, but cannot decide a booking is valid. Providers and the Agent worker may create normalized message candidates; they cannot write confirmed bookings directly.

- Only `role = passenger` and `final = true` messages may populate or revise booking facts.
- Every current required fact points to a final passenger message in the same call session.
- Partial/provisional transcript is never booking evidence.
- Confirmation is an explicit, persisted `booking_confirmation` record. Staff confirmation additionally requires active, session-bound `booking:confirm` authorization.
- Idempotency is scoped to the session, draft and actor. A retry returns a prior booking only when its key, scope, request hash and accepted-summary hash all match; conflicting key reuse is rejected.
- Confirmed snapshots are immutable. A post-confirmation correction is a new future workflow.
- Raw audio is not retained by default. Any recording requires consent, a stated retention period, access controls and a deletion path.

## Operator catalog — target pilot schema

Current code uses `createBusDemoCatalog()` with static `availableSeats`. That function remains the no-key demo fallback, not the durable catalog owner. Pilot catalog data is versioned and published through these logical records:

| Record | Meaning |
|---|---|
| `catalog_version` | `draft`, `validated`, `published` or `retired`; effective time, creator, validator and publisher |
| `operator_branch` | Branch/office owned by the bus operator |
| `stop` | Pickup/drop-off point with normalized address metadata |
| `route` / `route_stop` | Origin, destination and ordered allowed stops |
| `vehicle_template` | Vehicle type, floor count, derived capacity and layout metadata |
| `vehicle_template_seat` | Stable seat code, floor, row, column, seat type and accessibility metadata |
| `vehicle` | Operator vehicle reference/plate, active state and assigned template |
| `fare_rule` | Route/trip price with effective range and catalog version |
| `trip` | Published route, time, vehicle/template, capacity and catalog version |

Published versions are immutable. A new change forks a draft from the current published version. Validation rejects broken references, duplicate seat codes, overlapping layout cells, capacity mismatch, invalid time order, negative fare and conflicting effective dates. Publication and per-trip seat creation are atomic.

## Trip seat inventory and holds — target pilot schema

Vehicle templates describe physical layout; `trip_seat` owns availability for one scheduled trip. Existing `booking_draft.seats` remains the conversation/display field and must reference an authoritative active hold before confirmation.

### `trip_seat`

| Field | Meaning |
|---|---|
| `trip_id`, `seat_code` | Composite seat identity; unique per trip |
| `template_seat_id` | Source physical seat definition |
| `state` | `available`, `held`, `booked` or `blocked` |
| `active_hold_id`, `booking_id` | Nullable current owner references |
| `revision`, `updated_at` | Optimistic concurrency and freshness |

### `seat_hold`

| Field | Meaning |
|---|---|
| `id`, `call_session_id`, `booking_draft_id`, `trip_id` | Hold identity and scope |
| `seat_codes` | Canonical selected seat set; exactly passenger count |
| `actor_role`, `actor_id` | Authorized staff/dispatcher identity |
| `created_at`, `expires_at` | Default ten-minute lease |
| `released_at`, `consumed_at` | Terminal outcome timestamps |
| `release_reason`, `correlation_id` | Redacted operational explanation and trace |

Only one active hold or booking may own a `(trip_id, seat_code)`. Concurrent hold commands use database locking/constraints so exactly one request succeeds. Changing trip/seats or ending a call releases the prior hold. Expiry returns seats to `available`; confirmation consumes an unexpired hold in the same transaction that creates the immutable booking and audit event.

## `call_session` — target pilot schema

The call/session aggregate owns lifecycle, participants and consent. It maps conceptually to current `busCalls` (and older `conversations`) but requires canonical fields before pilot use.

| Field | Meaning |
|---|---|
| `id` | immutable session ID and correlation anchor |
| `mode` | `auto` or `human` reply authority |
| `status` | `idle`, `connected`, or `ended` |
| `runtime_profile` | `public_demo` or `credentialed_pilot` |
| `room_ref` | nullable LiveKit room reference, never a secret |
| `passenger_ref`, `staff_ref` | participant identities/authorized staff reference |
| `audio_consent_at`, `recording_consent_at` | nullable consent timestamps |
| `started_at`, `ended_at`, `created_at` | lifecycle timestamps |

Lifecycle: create as `idle`; connect; switch mode without creating a new session; end once. Retain only the minimum session metadata required for support/audit policy; delete or anonymize it when the configured retention period expires.

## `call_message` / `transcript_segment` — target pilot schema

Messages are the ordered conversation record. A transcript segment can be represented by the same table with timing/provenance fields, or a child table when timing is high-volume. Current `busCallMessages` and `transcriptSegments` are partial mappings.

| Field | Meaning |
|---|---|
| `id`, `call_session_id` | immutable message ID and parent session |
| `sequence` | monotonically increasing order within session |
| `role`, `author_id` | passenger, staff, Agent or system; persisted author identity |
| `channel` | text, preset, voice, provider or replay source |
| `text` | normalized UTF-8 Vietnamese content |
| `final` | final/provisional boundary |
| `provider_event_id` | nullable dedupe key for provider ingress |
| `started_at_ms`, `ended_at_ms`, `confidence` | optional transcript timing/provenance |
| `created_at`, `correlation_id` | audit and cross-runtime linkage |

`(call_session_id, provider_event_id)` is unique when the provider ID exists. Provisional content is short-lived operational data and is deleted quickly or never persisted; final messages follow the session transcript retention policy. Do not store raw audio by default.

## `booking_draft` — target pilot schema

Exactly one mutable canonical draft belongs to a call session. Current `busBookings` is the closest shape but conflates draft and confirmed booking, and `orderDrafts` is legacy migration debt.

| Field | Meaning |
|---|---|
| `id`, `call_session_id` | draft identity; unique call-session relationship |
| `status` | `collecting`, `trip_proposed`, `awaiting_confirmation`, `confirmed` |
| `origin`, `destination`, `travel_date` | itinerary facts |
| `passenger_count`, `selected_trip`, `seats` | party and chosen trip facts; existing display/conversation shape |
| `catalog_version_id`, `trip_id`, `seat_hold_id` | authoritative published catalog and inventory references |
| `passenger_name`, `vietnamese_phone` | passenger facts; phone is PII |
| `summary_snapshot` | canonical read-back used before confirmation |
| `updated_at`, `version` | optimistic-concurrency/audit support |

Before `awaiting_confirmation`, all required values must be valid and evidence-backed. When seat inventory is enabled, the draft also needs an unexpired hold matching `trip_id`, passenger count and exact seat codes. Revisions replace the evidence reference for the changed field and can return the draft to `collecting` or `trip_proposed`.

## `booking_evidence` — target pilot schema

This table records the field-to-message provenance that prevents stale or non-passenger content from becoming booking facts. Current `busBookings.evidenceMessageIds` is an untyped aggregate field; `orderEvidence` is legacy and line-oriented.

| Field | Meaning |
|---|---|
| `id`, `booking_draft_id` | evidence identity and mutable-draft parent |
| `field_name` | one required booking field |
| `call_message_id` | final passenger message supporting current value |
| `value_snapshot` | normalized value observed in that message |
| `quote` | minimal supporting excerpt, redacted where needed |
| `created_at`, `superseded_at` | provenance lifecycle |

The active uniqueness rule is one unsuperseded evidence record per `(booking_draft_id, field_name)`. The referenced message must be final, passenger-authored and in the same session. Preserve immutable evidence needed by the confirmed snapshot; purge transient/superseded evidence according to policy after audit needs expire.

## `booking` — target pilot schema

`booking` is created only by the confirmation transaction. It maps only partially to current `busBookings`, which needs separation from the mutable draft. With inventory enabled, that transaction also consumes the referenced seat hold.

| Field | Meaning |
|---|---|
| `id`, `booking_code` | immutable booking identity and human-facing code |
| `booking_draft_id`, `call_session_id`, `trip_id`, `seat_hold_id` | source and consumed-inventory links |
| `booking_confirmation_id` | required FK to the authoritative accepted confirmation record |
| `confirmed_snapshot` | immutable itinerary, passenger, trip, summary and evidence-reference snapshot |
| `confirmed_by_role`, `confirmed_by_id`, `confirmed_at` | actor and time |
| `correlation_id` | end-to-end trace key |

`booking_code` is unique and `booking_confirmation_id` is unique, so one accepted confirmation can create at most one immutable booking. The confirmation transaction validates the draft, all active evidence, its authoritative confirmation record and any required unexpired seat hold before inserting `booking`. It atomically consumes the hold and links the booked trip seats. No update may alter `confirmed_snapshot`.

## `booking_confirmation` — target pilot schema

This is the authoritative confirmation persistence record; `audit_event` mirrors it for a broader control-plane timeline but does not replace it. It is created for both accepted and rejected confirmation attempts, and it is the only confirmation record a booking may reference.

| Field | Meaning |
|---|---|
| `id` | immutable confirmation identity |
| `call_session_id`, `booking_draft_id` | required FKs to the session and draft being confirmed |
| `booking_id` | nullable FK set only after an accepted confirmation creates the booking; unique when present |
| `actor_role`, `actor_id` | passenger, staff or service identity that submitted the confirmation |
| `authorization_outcome`, `authorization_reason` | `authorized`/`denied` outcome and redacted policy reason; staff requires session-bound `booking:confirm` authorization |
| `outcome` | `accepted` or `rejected`; a rejected record can never be attached to a booking |
| `accepted_summary_version`, `accepted_summary_hash` | exact read-back version and cryptographic hash accepted by the actor |
| `confirmation_message_id` | required FK to the final passenger confirmation message, or a persisted authorized-staff confirmation command/message in the same session |
| `idempotency_scope`, `idempotency_key` | persisted scope and client retry key for this confirmation command |
| `request_hash` | hash of the normalized confirmation command, including actor, draft/version and message reference |
| `correlation_id`, `created_at` | traceability and immutable ordering |

`call_session_id`, `booking_draft_id` and `confirmation_message_id` must describe the same session. `accepted_summary_version` and `accepted_summary_hash` must match the draft summary used by the transaction; an accepted record cannot be revised after insertion. `booking.call_session_id` and `booking.booking_draft_id` must equal the referenced confirmation's FKs. An accepted `booking_confirmation` also emits an append-only `audit_event` with the same correlation ID and confirmation ID in its redacted payload.

## Scoped idempotency — target pilot schema

The effective idempotency identity is `(idempotency_scope, idempotency_key)`, not a bare key. `idempotency_scope` is a canonical value derived from exactly the `call_session_id`, `booking_draft_id`, `actor_role` and `actor_id` of the confirmation attempt (for example, `session:cs_01:draft:bd_01:staff:st_04`). It is persisted on `booking_confirmation` and indexed with `idempotency_key`.

| Rule | Required behavior |
|---|---|
| First submission | Persist the scope, key, normalized `request_hash`, `accepted_summary_hash`, authorization outcome and confirmation outcome in one transaction. |
| Exact retry | Find the existing `(idempotency_scope, idempotency_key)` record. Return its booking only if both hashes, actor and accepted outcome match. |
| Key reused with changed request or summary | Reject with `IDEMPOTENCY_CONFLICT`; do not return the existing booking and do not create another booking. |
| Key reused in a different session/draft/actor scope | Reject with `IDEMPOTENCY_SCOPE_CONFLICT`; do not look up or return another scope's booking. |
| Concurrent submission | Enforce unique `(idempotency_scope, idempotency_key)` and lock/read the canonical confirmation record before deciding retry versus conflict. |

The target pilot schema therefore has a unique index on `(idempotency_scope, idempotency_key)` and a lookup guard for a raw key appearing in another scope. The guard prevents an accidentally reused client key from disclosing or returning a booking belonging to another session, draft or actor.

## `audit_event` — target pilot schema

Append-only audit records explain control-plane changes and failures. Current `bookingAuditEvents` is a partial mapping because it attaches only to `busBookings`; target events may attach to a call session, draft or booking.

| Field | Meaning |
|---|---|
| `id`, `call_session_id` | event identity and primary scope |
| `booking_draft_id`, `booking_id` | nullable related aggregates |
| `booking_confirmation_id` | nullable FK to the authoritative confirmation record when the event concerns confirmation |
| `event_type` | takeover, correction, confirmation accepted/rejected, provider failure, retention action |
| `actor_role`, `actor_id` | passenger, staff, Agent, system or service identity |
| `payload` | redacted structured detail, never raw audio/full phone |
| `correlation_id`, `created_at` | traceability and ordering |

Audit events are append-only. Retain confirmation and authorization evidence according to legal/support policy; redact PII from payloads and enforce restricted access.

## Relations and confirmation lifecycle

```text
call_session 1--* call_message/transcript_segment
call_session 1--1 booking_draft 1--* booking_evidence --1 call_message
catalog_version 1--* trip 1--* trip_seat
vehicle_template 1--* vehicle_template_seat; trip 1--1 vehicle_template snapshot
call_session 1--* seat_hold --* trip_seat
call_session 1--* booking_confirmation --1 booking_draft
booking_confirmation --1 confirmation_message; booking_confirmation 0..1--1 booking
call_session 1--* audit_event
booking_draft 1--0..1 booking (immutable confirmed snapshot)
booking 1--* audit_event
```

1. A final passenger message is validated and appended.
2. Core revises the mutable draft and the active field evidence references.
3. Once all facts and summary are valid, the draft reaches `awaiting_confirmation`.
4. When inventory is enabled, an authorized seat hold binds the exact trip and seat set to the draft; expired/conflicting holds close the confirmation gate.
5. One transaction persists an authoritative `booking_confirmation` with actor, authorization outcome, confirmation-message FK, accepted summary version/hash, scoped idempotency key and request hash.
6. Only an accepted record consumes the hold, writes the immutable `booking` and linked audit event. An exact scoped retry returns that booking; a changed request, summary or scope is rejected rather than returning another booking.

## Mapping to `db/schema.ts`

| Logical record | Current schema mapping | Pilot action |
|---|---|---|
| `catalog_version`, routes, stops, templates, vehicles, fares, trips | static `createBusDemoCatalog()` only | create versioned catalog tables and draft/validate/publish transaction |
| `trip_seat`, `seat_hold` | `BusTrip.availableSeats` and `busBookings.seats` only | create per-trip inventory, expiring hold and conflict-safe transaction tables |
| `call_session` | `busCalls`; older `conversations` | migrate to canonical session/participant/consent fields |
| `call_message` / `transcript_segment` | `busCallMessages`, `transcriptSegments` | add sequence, author, correlation and retention metadata |
| `booking_draft` | `busBookings`; legacy `orderDrafts` | separate mutable draft from confirmed booking |
| `booking_evidence` | `busBookings.evidenceMessageIds`; legacy `orderEvidence` | create typed field-to-final-message target table |
| `booking_confirmation` | no canonical current record | create authoritative confirmation, scoped-idempotency and summary-hash table with FKs to session/draft/message/booking |
| `booking` | `busBookings` | create immutable snapshot linked one-to-one to accepted confirmation |
| `audit_event` | `bookingAuditEvents` | allow session/draft/confirmation scope and redacted correlation payload |

All target pilot schema changes require Drizzle migrations, backfill/compatibility review and transaction-level tests before a credentialed pilot writes them.
