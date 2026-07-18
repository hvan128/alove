---
title: Phase 01 — VALSEA-first compliance
status: completed
priority: P1
effort: small
plan: 2026-07-18-valsea-rubric-gap
---

# Phase 01 — VALSEA-first compliance

## Context

Phase 00 proved the current VALSEA endpoints. The Alove migration removed the old
provider package and `/engine`; production audio now belongs exclusively to the
Python LiveKit worker. Batch ASR remains maintainer/evaluation evidence and must
not be inserted into the realtime hot path.

## Requirements

- Default `STT_PROVIDER` to `valsea` and reject unknown values instead of silently
  falling through to Speechmatics.
- Emit an explicit warning whenever a supported non-VALSEA provider is selected.
- Keep missing VALSEA credentials fail-closed; never add a browser/demo fallback.
- Document `VALSEA_WS_URL` and `VALSEA_MODEL` in `agent/.env.example`.
- Preserve Phase 00 batch report as the REST compliance artifact; do not proxy the
  VALSEA key through Next.js.

## Current touchpoints

- New pure config helper: `agent/provider_config.py`.
- Narrow integration: `agent/agent.py` provider constants and `_cascade_stt`.
- Public env contract: `agent/.env.example`.
- Tests: `agent/tests/test_provider_config.py`.

## Checklist

- [x] Add allowlisted STT provider resolver with VALSEA default.
- [x] Reject invalid provider names with an actionable error.
- [x] Warn clearly for supported non-VALSEA A/B providers.
- [x] Wire resolver into `agent.py` without changing booking/call lifecycle logic.
- [x] Update worker env example for endpoint/model and VALSEA-first behavior.
- [x] Agent unit tests and Python compile pass.
- [x] Tester + code reviewer confirm no provider fallback regression.

## Acceptance

- Missing or blank `STT_PROVIDER` resolves to `valsea`.
- `speechmatics` and `openai` remain explicit supported A/B choices because the
  current `_cascade_stt` implements them.
- Any other value fails before a call starts.
- Phase 00 remains the only batch client; realtime uses `agent/valsea_stt.py`.

## Out of scope

- Recreating `packages/providers`, `/engine`, browser audio capture or Fastify.
- Calling REST batch inside a realtime call.
