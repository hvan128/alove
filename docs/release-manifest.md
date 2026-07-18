# SpeechToInvoice release manifest

> Bản phát hành này là lịch sử trước khi sản phẩm chuyển sang VéĐi. Manifest TASK-003 hiện hành nằm ở [`vedi-release-manifest.md`](vedi-release-manifest.md).

## Release truth

SpeechToInvoice is an AI Voice Agent đặt vé xe demo. The public surface supports text and preset input reliably, with optional device speech recognition and device speech synthesis when the browser supports them. It is not a live inventory, payment, phone-call, or provider-backed media release.

Any displayed booking code, seat assignment, or **Đã giữ vé** label is deterministic demo output. It is neither an inventory hold nor an issued or guaranteed ticket.

## Acceptance mapping

| Acceptance criterion | Source path | Verification command |
|---|---|---|
| Passenger and care-desk surfaces render in one workspace | `apps/web/src/components/bus-call/bus-call-workspace.tsx` | `pnpm test` |
| `auto` mode collects a deterministic booking draft | `packages/core/src/bus-booking.ts` | `pnpm test` |
| Changed final `customer` messages append flat `evidenceMessageIds` | `packages/core/src/bus-booking.ts`, `packages/contracts/src/index.ts` | `pnpm test` |
| A keyword/manual demo confirmation produces and reuses an in-memory deterministic code | `packages/core/src/bus-booking.ts` | `pnpm test` |
| Human takeover prevents automatic replies | `apps/web/src/components/bus-call/bus-call-workspace.tsx` | `pnpm test` |
| Text/preset fallback works without browser speech | `apps/web/src/hooks/use-speech-recognition.ts` | `pnpm test` |
| Replay and stop controls remain user-triggered | `apps/web/src/lib/device-speech.ts` | `pnpm test` |
| Responsive, accessible shared controls are documented | `apps/web/src/app/design-system/page.tsx`, `docs/design-system.md` | `pnpm test:e2e` |

## Evidence boundaries

| Evidence class | Required evidence | Release claim it supports |
|---|---|---|
| Local | `pnpm lint`, `pnpm -r --if-present typecheck`, `pnpm test`, `pnpm build`, `git diff --check` | Source quality only |
| Browser | `pnpm test:e2e` plus a browser check of `/console` at desktop and mobile widths | Demo flow, fallback controls, and responsive layout |
| Credentialed pilot | Provider-specific credentialed smoke run with recorded date and account scope | Only that named pilot integration |
| Unavailable integration | Document missing credential, worker, account, or media entitlement | No runtime capability claim |

## Contract boundaries

The current public-demo contract uses `auto`, `customer`, `travelDateLabel`, `phone`, and a flat `evidenceMessageIds` array. It does not persist field-level evidence, explicit confirmation events, staff authorization, or scoped idempotency inputs.

The separately named **Pilot Contract v1 — target credentialed pilot** uses `agent`, `passenger`, `travelDate`, `vietnamesePhone`, and `fieldEvidenceMessageIds`. It adds persisted confirmation/authorization checks and server-derived scoped idempotency with request and accepted-summary hashes. That target is not release evidence for this public demo; its detailed behavior is in [`../specs/api-contracts.md`](../specs/api-contracts.md).

## Pilot boundaries

- LiveKit, VALSEA, telephony, Zalo delivery, Neon persistence, and payment are pilot seams unless a release records credentialed evidence.
- Browser speech APIs are progressive enhancements; their absence does not block text or presets.
- A production release must not imply that a simulated code has reserved a seat.

See [`vedi-release-manifest.md`](vedi-release-manifest.md) for the booking-demo release checklist.

## VéĐi operator workflow addendum

Source `5af9745` adds a verified demo-only operator path:

| Capability | Browser evidence | Release boundary |
|---|---|---|
| Operations dashboard | Queue, active calls, KPI, departures and alerts render | Deterministic projection in memory mode |
| Catalog publish | Admin validates and publishes a revisioned demo catalog | No external operator connector |
| Vehicle/seat visual | Keyboard grid editor and staff seat picker render state labels | No caller seat controls |
| Seat hold | Two seats are held with expiry feedback | Process memory; lost on restart |
| Confirmation | Active matching hold is consumed before confirmation | Memory transaction verified; Neon unverified |

Verification on 2026-07-18: `pnpm test:e2e` → 6 passed, including 390/768/1440 containment and keyboard grid operation. This evidence must not be described as production seat inventory, guaranteed ticket issuance, credentialed Neon persistence, or a live VALSEA/LiveKit provider run.
