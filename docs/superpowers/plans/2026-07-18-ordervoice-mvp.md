# SpeechToInvoice voice-booking implementation plan

**Status:** Delivered foundation; this retained path documents the current product direction.

## Objective

Maintain the foundation for SpeechToInvoice, a Vietnamese AI Voice Agent đặt vé xe. The public experience is a deterministic, two-sided bus-ticket workspace; it must remain useful without credentials or browser speech support.

## Delivered interfaces

| Area | Responsibility |
|---|---|
| `packages/contracts/src/index.ts` | Typed current-demo call, message, trip, booking, and aggregate-evidence contracts |
| `packages/core/src/bus-booking.ts` | Static catalog, deterministic draft progression, keyword/manual confirmation gate, in-memory duplicate-confirm reuse |
| `apps/web/src/components/bus-call/` | Passenger and care-desk surfaces, transcript, facts, mode switching |
| `apps/web/src/hooks/use-speech-recognition.ts` | Optional browser recognition with visible fallback |
| `apps/web/src/lib/device-speech.ts` | User-triggered device speech, replay, and stop |

## Delivery rules

1. Preserve the public demo's aggregate final-message IDs; partial input cannot update the supported draft parser.
2. Require origin, destination, `travelDateLabel`, passenger count, selected trip, passenger name, and `phone` before a code. Fare, time window, and seats are derived summary data, not prerequisites.
3. A keyword/manual confirmation reuses the first deterministic code within the confirmed in-memory draft; it is not a persisted explicit event or scoped idempotency contract.
4. Human takeover preserves conversation state and prevents future automatic messages.
5. Text and presets remain complete controls when speech is unavailable.
6. Treat all provider integrations and the target per-field-evidence/authorization/scoped-idempotency safety contract as pilots until a credentialed runtime check is recorded.
7. Never represent the simulated code, seat, or status label as a real inventory reservation or ticket.

## Verification

```bash
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build
git diff --check
```

Browser verification covers the canonical passenger journey, confirmation retry, human takeover, mobile layout, keyboard/focus behavior, and no error overlay. Details belong in [`../../vedi-release-manifest.md`](../../vedi-release-manifest.md).
