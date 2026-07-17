# TASK-001 — OrderVoice Voice-to-Order MVP

**Owner:** Codex + product owner

**Status:** In progress

## Goal

Deliver a deployable Vietnamese voice-to-order operator console with browser, phone and Zalo replay entry points; VALSEA-first audio adapters; evidence-backed human-approved drafts; and a speaking demonstration.

## Acceptance criteria

- [ ] Browser, Phone and Zalo replay are visible, selectable and truthfully report their mode/readiness.
- [ ] Browser/replay use normalized PCM16/16 kHz frames; Twilio event/media conversion is implemented and fixture-tested.
- [ ] VALSEA realtime protocol is implemented server-side; OpenAI fallback is opt-in dev only.
- [ ] Final transcript segments, not partials, produce a structured Vietnamese/code-switching order draft with evidence.
- [ ] Ambiguous catalog resolution and blocking exceptions are visible and block approval.
- [ ] Human correction and approval gate idempotent ERPNext draft export.
- [ ] Human-clicked reply speech works in the no-key demo and provider TTS has an adapter seam.
- [ ] `/design-system` documents tokens/shared controls and console follows it responsively.
- [ ] Third-party feasibility/live-test result is recorded in docs.
- [ ] `lint`, `typecheck`, `test`, `test:e2e`, `build` and deploy smoke pass or have a specific external blocker recorded.

## Definition of done

All acceptance criteria map to source/tests/docs in the release manifest. The source branch has clean status, no credential in history/diff, quality gates pass, integration caveats are documented, and the Vercel production deployment is confirmed when account access allows it.
