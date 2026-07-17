# TASK-003 - VéĐi staff-first live call console

**Owner:** Codex + product owner  
**Status:** In progress  
**Source:** `feature/TASK-003-staff-live-call-console`

## Goal

Replace the same-browser split demo with a staff-first booking console, a simple mobile caller route, a credential-gated LiveKit/VALSEA voice path, and a clearly labeled zero-key fallback.

## Acceptance criteria

- [ ] `/staff` shows realtime partial/final transcript, selected translation language, evidence-backed booking fields, review states, and reply suggestions.
- [ ] `/call` is phone-friendly and can publish microphone audio and receive staff/agent audio through LiveKit when configured.
- [ ] Caller finalized speech updates only supported fields; partial, staff, and agent speech cannot mutate booking facts.
- [ ] Human edits are confirmed and protected from unsafe machine overwrite.
- [ ] Human mode never auto-speaks; Auto mode can answer through the deployed voice agent.
- [ ] LiveKit token grants are short-lived, room-scoped, and dispatch the named agent only for the caller.
- [ ] Python agent links to the caller participant and uses custom VALSEA realtime STT.
- [ ] VALSEA chat/TTS or an explicit OpenAI fallback can produce agent speech.
- [ ] Neon migration covers sessions, booking evidence, messages, and audit events.
- [ ] Same-device no-key fallback remains fully demoable and honestly labeled.
- [ ] `/console` redirects to `/staff`; landing and design-system routes reflect the new information architecture.
- [ ] Unit, component, typecheck, lint, build, E2E, browser, secret, and production checks pass.
- [ ] Vercel deployment is ready; any worker deployment blocked by missing user credentials is documented with exact required keys.

## Definition of done

All deterministic gates pass from a clean feature branch. Live integrations are either smoke-tested with supplied credentials or explicitly marked credential-blocked without false success claims. Documentation maps every acceptance criterion to source and tests.

