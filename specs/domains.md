# Domain Boundaries — SpeechToInvoice / VéĐi

## Call intake and assignment

Owns incoming notification, `ringing` queue, staff acceptance, exclusive session owner, reassignment and escalation. It does not own audio transport, transcript extraction or booking rules.

## Call session

Owns lifecycle, participant presence, reply authority, transcript display preference and handoff events. It preserves state across Human/Agent switches; it does not decide booking validity.

## Realtime transport

Owns local fallback channel or LiveKit room connection, short-lived role/room token, audio/data delivery and reconnect. It cannot mutate booking directly or expose provider secrets to browser code.

## Conversation and transcript

Owns ordered partial/final messages, speaker, channel, provider/source, confidence, timings, original text and translations. Partial is display-only. Only final caller message enters semantic extraction.

## Agent worker

Owns long-lived LiveKit participation, VALSEA STT/TTS adapters, guarded LLM turns and publishing normalized room events. Human mode suppresses spontaneous reply. Worker cannot confirm booking, create fare/inventory facts or bypass contracts/core.

## Trip catalog

Owns operator, branch, route, stop, schedule, vehicle template, vehicle, fare, capacity, effective dates, validation and immutable publish versions. Agent reads published data only. It does not own per-trip seat state or booking confirmation.

## Seat inventory

Owns per-trip seat snapshots, `available/held/booked/blocked` state, atomic hold, renewal, expiry, release, consumption and future operator adapter normalization. Existing `BookingDraft.seats` remains a conversation/display field; inventory decides whether those codes can be held. External operator synchronization requires separate credentialed reconciliation evidence.

## Booking draft and semantic workflow

Owns structured field extraction, exact evidence, revision precedence, missing-field prompts, review items, catalog matching, summary readiness and booking state transitions. Staff/Agent messages cannot replace caller evidence.

## Customer-care workspace

Owns incoming queue UI, accept/delegate/takeover controls, live transcript, suggestions, field review/correction, staff-only seat picker and authorized confirmation. It requests inventory holds through application commands; it does not grant itself passenger evidence or mutate inventory directly.

## Confirmation and idempotency

Owns actor/session authorization, accepted summary, field-evidence validation, unexpired hold validation, scoped idempotency and immutable confirmed snapshot. Booking creation, hold consumption and audit commit atomically. Exact retry returns existing booking; changed scope/payload with same key is rejected.

## Persistence and audit

Owns final messages, snapshots, typed evidence, confirmation, assignment/authority events, retention and redaction. Partial/raw audio are not stored by default. Persistence failure cannot produce confirmed state.

## Enterprise operations

Owns Apple-like cross-session dashboard, queue/metrics/search, departures, occupancy, roles and catalog/inventory administration surfaces. It consumes call/booking/catalog/inventory/audit read models and does not bypass domain commands.
