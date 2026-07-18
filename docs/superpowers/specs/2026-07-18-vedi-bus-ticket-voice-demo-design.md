# SpeechToInvoice bus-ticket voice-demo design

**Date:** 2026-07-18  
**Status:** Historical design for the shipped browser demo; Pilot Contract v1 — target credentialed pilot safety controls are documented separately.

## Goal

Deliver a repeatable Vietnamese bus-ticket conversation in a single browser workspace. The interface shows the customer and customer-care roles together, works with no provider credential, and demonstrates the shipped deterministic transition from request to an aggregate-evidence, keyword/manual-confirmed demo code.

## Scenario

1. Passenger starts the Web Call and says or enters `Sài Gòn đi Đà Lạt, 2 người`.
2. Automatic mode proposes the 22:00 evening trip; the passenger selects it.
3. Customer supplies name and phone; the UI renders a summary with journey, count, fare, and aggregate message IDs.
4. Passenger says `Tôi xác nhận`; the UI shows one deterministic code.
5. A repeated confirmation reuses that code.
6. Switching to human mode keeps the transcript and draft, while only staff can reply and confirm.

## Decisions

| Decision | Rationale |
|---|---|
| Split view in one browser | Reliable, visible dual-role demo with no signaling or account setup |
| Deterministic catalog and state machine | Repeatable tests and truthful no-key behavior |
| Text/presets first | Guaranteed fallback when microphone permission or browser APIs fail |
| Optional device speech | Useful enhancement only after user interaction; replay and stop are always visible |
| Keyword/manual demo confirmation | Prevents the supported parser from issuing a result before the readiness check; it is not a persisted explicit-confirmation event |

## Domain rules

The demo supports a static Sài Gòn → Đà Lạt catalog with an evening sleeper option and an alternative. The state machine progresses through `collecting`, `trip_proposed`, `awaiting_confirmation`, and `confirmed`. Final `customer` messages may update supported facts and append to flat `evidenceMessageIds`. The readiness values are origin, destination, `travelDateLabel`, passenger count, selected trip, passenger name, and `phone`; fare, time window, and seats are derived summary/output data, not prerequisites.

The result is not an inventory hold or issued ticket. There is no payment, delivery, phone/SIP call, remote two-device call, or live provider connection in the public demo.

## Pilot seam

LiveKit, external ASR/TTS, telephony, and database persistence remain credentialed pilots. Pilot Contract v1 — target credentialed pilot adds `agent`/`passenger` roles, `travelDate`, `vietnamesePhone`, per-field `fieldEvidenceMessageIds`, persisted confirmation/authorization, and scoped idempotency. It needs its own server-side credentials, durable worker/runtime, health checks, and recorded smoke evidence before it is described as operational.

## Verification

Verify the full scenario in automatic mode, retry confirmation, then switch to human mode. Verify that speech-unsupported state retains text/preset controls, desktop/mobile layouts remain usable, and no browser error overlay or page errors occur.
