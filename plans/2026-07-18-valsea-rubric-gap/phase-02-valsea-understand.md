---
title: Phase 02 — Advisory VALSEA annotations
status: completed
priority: P1
effort: medium
plan: 2026-07-18-valsea-rubric-gap
---

# Phase 02 — Advisory VALSEA annotations

## Context

`POST /v1/annotations` returned a valid live schema in Phase 00, but the clean
booking sample produced no tags. Annotation is therefore advisory evidence, not an
entity/intent authority. Booking state remains controlled by server APIs and Neon.

## Architecture

```text
VALSEA realtime final text
  ├─> LiveKit/LLM turn (unchanged)
  └─> async VALSEA annotation -> semantic.annotation event -> evidence panel

semantic.annotation never mutates BookingSnapshot
```

## Current touchpoints

- New agent client: `agent/valsea_api.py` using existing `httpx`.
- New pure response types/tests: `agent/tests/test_valsea_api.py`.
- Final customer transcript seam: `agent/agent.py` `conversation_item_added`.
- Current event contract: `apps/web/src/lib/call-contract.ts`.
- Event receiver/UI: `livekit-call.tsx`, `bus-call-workspace.tsx`, `call-stage.tsx`.
- Canonical contract doc: `specs/api-contracts.md`.

## Checklist

- [x] Validate annotation response with optional corrections/tags/annotations.
- [x] Call annotation asynchronously only for final customer text.
- [x] Publish `semantic.annotation` through ordered `alove-events` envelope.
- [x] Add Zod event variant and contract tests.
- [x] Render corrected text/tags with an honest empty state.
- [x] Ensure annotation failure cannot break the call or booking flow.
- [x] Compare call behavior with annotation success/failure in tests.

## Acceptance

- A live final transcript produces a timestamped annotation event when VALSEA
  responds, proving a second VALSEA endpoint in the call evidence path.
- Empty tags render as “Không có semantic tag” rather than fabricated entities.
- Booking confirmation rules and `BookingSnapshot` are byte-for-byte unchanged.

## Out of scope

- Replacing the LLM transcript for the same turn.
- Persisting annotations in Neon in this round.
- Feature-flagged zero-key production fallback.
