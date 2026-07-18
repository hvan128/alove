# TASK-003 - VéĐi staff-first live call console

**Owner:** Codex + product owner  
**Status:** Complete — web production verified; live provider smoke credential-blocked  
**Source:** `feature/TASK-003-staff-live-call-console`

## Goal

Replace the same-browser split demo with a staff-first booking console, a simple mobile caller route, a credential-gated LiveKit/VALSEA voice path, and a clearly labeled zero-key fallback.

## Acceptance criteria

- [x] `/staff` shows realtime partial/final transcript, selected translation language, evidence-backed booking fields, review states, and reply suggestions.
- [x] `/call` is phone-friendly and can publish microphone audio and receive staff/agent audio through LiveKit when configured.
- [x] Caller finalized speech updates only supported fields; partial, staff, and agent speech cannot mutate booking facts.
- [x] Human edits are confirmed and protected from unsafe machine overwrite.
- [x] Human mode never auto-speaks; Auto mode answers through the deterministic local demo or the credential-gated voice worker.
- [x] LiveKit token grants are short-lived, room-scoped, and dispatch the named agent only for the caller after readiness is explicitly enabled.
- [x] Python agent links to the caller participant and uses custom VALSEA realtime STT.
- [x] OpenAI is the guarded downstream LLM; VALSEA TTS produces worker speech.
- [x] Neon migration covers sessions, booking evidence, messages, and audit events.
- [x] Same-device no-key fallback remains fully demoable and honestly labeled.
- [x] `/console` redirects to `/staff`; landing and design-system routes reflect the new information architecture.
- [x] Unit, component, typecheck, lint, build, E2E, browser, secret, audit, and production checks pass.
- [x] Vercel web is deployed; worker deployment blocked by missing user credentials is documented with exact required keys.

## Definition of done

All deterministic gates pass from a clean feature branch. Live integrations are either smoke-tested with supplied credentials or explicitly marked credential-blocked without false success claims. Documentation maps every acceptance criterion to source and tests.

## Completion evidence

- Production web: `https://ordervoice-vn.vercel.app`
- Deployment: `dpl_9ZZXQxgRgHaJrkXPYg7RYPH2W6Ce`, source `0297836`
- Automated: 93 TypeScript tests, 13 Python tests, 4 Chromium E2E flows, lint, typecheck, production build and dependency audit passed.
- Production browser: `/call` → `/staff` filled all required fields and confirmed `VD-240718-3010` at a 390px viewport without page errors, overlay or horizontal overflow.
- Credential boundary: LiveKit, VALSEA, OpenAI and Neon live smokes remain explicitly blocked until new secrets are supplied; production reports `transport: local` and never claims otherwise.
