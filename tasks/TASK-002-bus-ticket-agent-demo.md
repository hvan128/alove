# TASK-002 — SpeechToInvoice two-sided bus-ticket voice demo

**Owner:** Codex + product owner  
**Status:** Implementation delivered; release verification evidence required  
**Source:** `feature/TASK-002-bus-ticket-agent`

## Goal

Deliver a Vietnamese AI Voice Agent đặt vé xe demo with passenger and customer-care surfaces, human/automatic reply modes, a deterministic speaking agent, and aggregate-message-evidence booking behavior.

## Required acceptance and release evidence

- [ ] Product copy, landing, console, design-system examples, specs, ADR, and docs describe bus-ticket booking.
- [ ] Console visibly presents customer and customer-care sides in one responsive Web Call workspace.
- [ ] `Nhân viên` mode never sends an automatic reply; staff can send and speak a response.
- [ ] `Agent tự động` mode advances a deterministic booking conversation and speaks replies.
- [ ] Demo completes Sài Gòn → Đà Lạt, two-seat trip selection, passenger details, keyword/manual confirmation, and stable demo booking code.
- [ ] Optional browser speech recognition degrades to guaranteed preset/text controls.
- [ ] Confirmation is blocked until the demo's seven readiness values exist; repeat use of the confirmed in-memory draft retains its code.
- [ ] LiveKit/project-4 research and the no-LiveKit demo decision are documented honestly.
- [ ] Record dated results for the applicable unit, component, E2E, lint, typecheck, build, browser smoke, credential scan, and production smoke checks; do not mark a check passed without that result.
- [ ] Record any verified deployment separately from local and browser evidence.

## Definition of done

All required evidence maps to source/tests/docs in [`vedi-release-manifest.md`](../docs/vedi-release-manifest.md). Local, browser, and credentialed-pilot evidence remain separate; external LiveKit/provider blockers are explicit.
