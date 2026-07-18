# TASK-001 — SpeechToInvoice voice booking foundation

**Owner:** Codex + product owner

**Status:** Superseded by TASK-002; retained as the tracked foundation artifact

## Goal

Deliver the reusable Vietnamese voice-workspace foundation for AI Voice Agent đặt vé xe: transcript provenance, human-reviewed draft state, optional speech controls, and provider seams. The current public demo is defined by TASK-002.

## Acceptance criteria

- [x] Final transcript segments, rather than partial text, retain evidence and update a draft safely.
- [x] Human review, correction, and an explicit confirmation gate exist before one idempotent booking-code result.
- [x] Human-triggered reply speech has a device-voice preview and a provider seam.
- [x] `/design-system` documents accessible shared controls and responsive behavior.
- [x] Provider feasibility and live-test limits are recorded without claiming an unverified integration.
- [x] Quality gates are defined; the current booking-demo evidence is maintained in [`TASK-002`](TASK-002-bus-ticket-agent-demo.md) and [`vedi-release-manifest.md`](../docs/vedi-release-manifest.md).

## Definition of done

The current implementation maps booking-demo acceptance criteria to source, tests, and truthful release evidence. No historic deployment or provider capability is implied by this retained task.
