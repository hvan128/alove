---
title: Phase 05 — Turn latency surface
status: pending
priority: P1
effort: small
plan: 2026-07-18-valsea-rubric-gap
---

# Phase 05 — Turn latency surface

## Context

The Python worker logs EOU/transcription delay, TTFT and TTFB but does not aggregate
or publish them. Current web events are ordered and call-bound; latency should use
that contract and remain ephemeral in this phase.

## Architecture

- New pure `agent/latency_metrics.py` aggregates stages by `speech_id` and emits
  only complete/expired bounded records.
- `agent.py` publishes `latency.turn` best-effort through `_publish`.
- `AgentEvent` adds a validated latency variant with non-negative seconds.
- `LiveKitCall` forwards it; workspace stores latest turn; `CallStage` shows total
  plus stage detail.
- No DB migration or dashboard persistence in this phase.

## Current touchpoints

- `agent/agent.py`, new helper + Python tests.
- `apps/web/src/lib/call-contract.ts` + tests.
- `livekit-call.tsx`, `bus-call-workspace.tsx`, `call-stage.tsx` + tests.
- `specs/api-contracts.md`, `e2e/console.spec.ts`.

## Checklist

- [ ] Aggregate stages by speech ID with bounded cleanup.
- [ ] Publish ordered `latency.turn` without blocking metrics callback.
- [ ] Validate event and ignore malformed/stale/cross-call payloads.
- [ ] Render total honestly from available metric semantics; no cherry-picked stage.
- [ ] Hide metric until a complete turn exists.
- [ ] Python, web and E2E tests pass.

## Acceptance

- UI value matches the worker event for a test turn.
- No LiveKit/demo-less call shows `0 ms` or stale prior-call latency.
- Publish failure does not affect the call.

## Out of scope

- Persisting turn latency or adding a dashboard chart.
- Claiming stage sum until LiveKit metric semantics prove stages are additive.
