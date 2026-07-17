# TASK-002 — VéĐi two-sided bus-ticket voice demo

**Owner:** Codex + product owner  
**Status:** In progress  
**Source:** `feature/TASK-002-bus-ticket-agent`

## Goal

Replace the sales-order demo with a deployable Vietnamese bus-ticket Web Call demo showing customer and customer-care sides, human/automatic reply modes, a deterministic speaking agent, and an evidence-backed booking confirmation.

## Acceptance criteria

- [ ] Product copy, landing, console, design-system examples, specs, ADR, and docs describe bus-ticket booking rather than sales orders.
- [ ] Console visibly presents customer and customer-care sides in one responsive Web Call workspace.
- [ ] `Nhân viên` mode never sends an automatic reply; staff can send and speak a response.
- [ ] `Agent tự động` mode advances a deterministic booking conversation and speaks replies.
- [ ] Demo completes Sài Gòn → Đà Lạt, two-seat trip selection, passenger details, explicit confirmation, and stable booking code.
- [ ] Optional browser speech recognition degrades to guaranteed preset/text controls.
- [ ] Confirmation is blocked until required booking fields exist and is idempotent.
- [ ] LiveKit/project-4 research and the no-LiveKit demo decision are documented honestly.
- [ ] Unit, component, E2E, lint, typecheck, build, browser smoke, credential scan, and production smoke pass.
- [ ] Vercel production alias serves the improved demo.

## Definition of done

All criteria map to source/tests/docs in a release manifest. Feature branch is clean, verification passes, no credential is tracked, production deployment is Ready, and external LiveKit/provider blockers are explicit.

