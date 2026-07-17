# TASK-001 — OrderVoice Voice-to-Order MVP

**Owner:** Codex + product owner

**Status:** Done — production deployment verified on 2026-07-18

## Goal

Deliver a deployable Vietnamese voice-to-order operator console with browser, phone and Zalo replay entry points; VALSEA-first audio adapters; evidence-backed human-approved drafts; and a speaking demonstration.

## Acceptance criteria

- [x] Browser, Phone and Zalo replay are visible, selectable and truthfully report their mode/readiness.
- [x] Browser/replay use normalized PCM16/16 kHz frames; Twilio event/media conversion is implemented and fixture-tested.
- [x] VALSEA realtime protocol is implemented server-side; OpenAI fallback is opt-in dev only.
- [x] Final transcript segments, not partials, produce a structured Vietnamese/code-switching order draft with evidence.
- [x] Ambiguous catalog resolution and blocking exceptions are visible and block approval.
- [x] Human correction and approval gate idempotent ERPNext draft export.
- [x] Human-clicked reply speech works in the no-key demo and provider TTS has an adapter seam.
- [x] `/design-system` documents tokens/shared controls and console follows it responsively.
- [x] Third-party feasibility/live-test result is recorded in docs.
- [x] `lint`, `typecheck`, `test`, `test:e2e`, `build` and deploy smoke pass or have a specific external blocker recorded.

## Definition of done

All acceptance criteria map to source/tests/docs in the release manifest. The source branch has clean status, no credential in history/diff, quality gates pass, integration caveats are documented, and the Vercel production deployment is confirmed.
