---
title: Alove re-scout for VALSEA rubric gap
date: 2026-07-18T22:45:21+07:00
status: complete
scope: plans/2026-07-18-valsea-rubric-gap
---

# Alove re-scout for VALSEA rubric gap

## Summary

Current runtime is LiveKit → Python agent → authenticated Next booking APIs → Neon.
The concurrent Alove migration intentionally removed `packages/*`, `apps/api`,
`/api/booking/advance`, the browser fallback and the old `/engine` route. Phase
01–06 must use current contracts instead of restoring those paths.

## Current touchpoints

| Concern | Current owner | Evidence |
|---|---|---|
| Realtime STT/LLM/TTS | `agent/agent.py`, `agent/valsea_stt.py` | Python worker owns provider credentials and audio |
| Booking authority | `apps/web/src/app/api/booking/*`, Neon stores | Search/hold/confirm/lookup/cancel are server-authoritative |
| Ephemeral agent events | `apps/web/src/lib/call-contract.ts` | Ordered `alove-events` envelope |
| Live call UI | `livekit-call.tsx` → `bus-call-workspace.tsx` → `call-stage.tsx` | No local/demo fallback |
| Confirmed ticket | `ticket-result.tsx`, `bookingSnapshotSchema` | QR + PNG exist; JSON/secure verification do not |
| Evidence | Phase 00 scripts/report | No current upload comparison route |

## Phase corrections

| Phase | Historical assumption removed | Current direction |
|---|---|---|
| 01 | provider package + `/engine` batch route | Python provider default/validation; batch remains maintainer evidence |
| 02 | `/understand`, `advanceBookingAgent`, entity authority | async agent annotation event; advisory UI only |
| 03 | extend deleted `/engine` | create a new `/evidence` surface + synthetic fixture harness deliberately |
| 04 | `bookingDraftSchema`, client fallback, unauthenticated lookup URL | `BookingSnapshot` export, phone-gated verification, server webhook |
| 05 | deleted contracts package | extend current `AgentEvent` and Python metrics publisher |
| 06 | restore deleted roadmap/console | update only canonical Alove docs/specs and evidence checklist |

## Public contracts to preserve

- Booking mutations remain search → hold → confirm and require agent bearer auth.
- `BookingSnapshot` is authoritative; semantic tags never mutate it.
- Web never receives provider credentials or proxies production audio.
- Missing production dependencies fail readiness; there is no browser fallback.
- Raw call audio is not persisted. Evidence fixtures must be synthetic/no-PII with provenance.

## Verification commands

- Root: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- Agent: `cd agent && uv run python -m unittest discover -s tests`.
- Release evidence: Docker smoke + staging call across STT/tools/TTS/audit.

## Unresolved questions

- No real regional-accent fixture is available; Phase 03 must label generated
  fixtures synthetic and leave regional-accent proof open instead of fabricating it.
- Webhook delivery needs an idempotent server seam; it must not be client-triggered.
- The shared worktree remains heavily dirty from concurrent migration work.
