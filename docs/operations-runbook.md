# SpeechToInvoice operations runbook

## Pre-demo checklist

- Confirm the profile is **public demo** or **credentialed pilot** and present only its supported claims.
- Test text/preset booking flow, staff human takeover, explicit confirmation, and exact duplicate confirmation retry.
- For pilot only: verify participant consent, token endpoint authorization/short expiry, worker readiness, provider status, Neon migration/health, and browser fallback on two devices.
- Confirm raw audio recording is disabled unless separate recording consent and retention configuration are demonstrably enabled.
- Confirm logs, screenshots, and support tools redact phone numbers and contain no credentials; create or carry a correlation ID for the session.
- Keep a staff operator available for takeover. Do not present payment, real inventory, SMS, PSTN, or production realtime as active without recorded pilot evidence.

## Correlation IDs and log redaction

Create a correlation ID at session creation and propagate it through browser command headers, BFF, worker, gateway, provider metadata where supported, database confirmation/audit records, and incident notes. Keep it stable across reconnects and exact retries; add distinct event IDs rather than replacing it. Operators use it to locate a redacted event timeline.

Log structured event type, timestamp, component, runtime profile, role, session/draft/confirmation references, provider event ID, error class, and outcome. Redact phone numbers, names where unnecessary, transcript/evidence excerpts, tokens, authorization headers, database URLs, room tokens, raw audio, and request bodies by default. Access raw consent/confirmation evidence only through approved restricted tools.

## Incident responses

| Situation | Detection | Safe state | Fallback | Recovery signal | Escalation owner |
|---|---|---|---|---|---|
| Microphone denied/unsupported | Browser permission/error state; no audio activity | Preserve existing draft; no synthetic voice evidence | Text/preset input; staff takeover | User can send final text/preset or grants permission | Demo operator; web owner if reproducible |
| ASR, LLM, or TTS failure | Worker/provider timeout, malformed event, error metric | Do not use partial transcript or issue a booking; preserve final validated draft | Text/preset; text-only Agent reply; staff takeover; retry only with user-visible state | Final valid message/reply arrives and errors clear | Agent/provider owner |
| LiveKit disconnect | Room connection event, worker participant loss | Keep same session and confirmation gate closed until state is revalidated; never create a booking from reconnect | Browser text/preset, staff contact/takeover, controlled reconnect to same authorized session | Participant and worker rejoin; token/room/session checks pass | Realtime/worker owner |
| Database failure | BFF/worker transaction error, health failure, migration alert | Report booking unconfirmed; do not mint code or mutate confirmed snapshot | Continue non-confirming conversation; recover database; retry same scoped idempotency command | Health and migration version pass; transaction returns accepted prior result or one new code | Data/on-call owner |
| Duplicate confirmation | Same idempotency key/event ID, conflict metric, user retry | Return existing code only for exact scope/hash/actor retry; otherwise reject conflict | Explain result; let user review/reconfirm with a new valid command when needed | Canonical confirmation record and audit event reconcile | Booking-core owner |
| Leaked credential | Secret scan, log alert, user report, unexpected provider activity | Stop affected provider/token issuance; do not expose diagnostic secret values | Public demo/browser fallback; temporarily disable pilot ingress | Secret revoked/rotated, deployment env updated, access/log review complete | Security owner with runtime owner |

## Escalation and evidence

The incident owner records start/end time, correlation ID, profile, affected component, user-visible impact, safe-state action, recovery signal, and redacted provider/deployment evidence. Escalate immediately to the security owner for suspected credential/PII exposure and to the data owner for loss of confirmation integrity. Do not paste secrets or raw audio into an incident channel. A booking-integrity incident remains open until the confirmation/audit transaction is reconciled and an exact retry cannot create a second code.
