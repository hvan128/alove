# SpeechToInvoice security and privacy policy

## Scope and safety boundary

SpeechToInvoice is a Vietnamese bus-ticket booking workspace. The public demo is credential-free and does not process provider audio, payments, live seat inventory, SMS, PSTN, or recorded calls. The credentialed pilot may process consented audio only after the controls in this policy and its deployment evidence are in place.

For the credentialed pilot target, a booking code is issued only by the booking application/core after final passenger-message evidence, a persisted explicit confirmation, and a scoped idempotency check. A provider, browser, or Agent worker cannot create or confirm a booking directly. An exact retry returns its existing code; a changed request, summary, actor, or scope is rejected. Current local fallback displays a deterministic simulated code and does not yet prove this durable transaction contract.

## Roles and access

| Role | Allowed actions | Prohibited actions |
|---|---|---|
| Passenger | Join own session, supply/correct facts, hear/read summary, explicitly confirm | Access another session, provider/admin secrets, staff controls |
| Customer-care staff | Observe assigned session, reply, take over, and confirm only with active session-bound `booking:confirm` authorization | Invent passenger evidence, bypass confirmation/idempotency, view secrets |
| Agent | Produce provisional/final normalized message candidates and structured proposals | Self-confirm, write bookings, claim inventory or payment success |
| Service/BFF | Authenticate session/role, validate commands, issue room tokens, invoke core | Run long-lived media or expose service credentials |
| Agent worker/gateway | Consume provider media/events and submit normalized input through contracts | Use browser credentials, make policy decisions, persist confirmed booking directly |

Reply-authority handoff is an audited `human ↔ auto` change for the same accepted session; it preserves draft/evidence and transfers reply authority only. Target workflow also audits incoming assignment, Agent delegation, takeover and revocation.

## Secrets, tokens, and webhooks

Classify LiveKit API secrets, VALSEA/LLM/TTS keys, telephony credentials, database URLs, signing keys, and webhook secrets as **restricted**. Store them only in the runtime owner's managed secret store; rotate on suspected exposure and never commit, paste into logs, test fixtures, browser storage, URLs, or support tickets. No secret may use a `NEXT_PUBLIC_*` name.

The BFF is the only issuer of a LiveKit participant token. After authenticated role/session checks it creates a server-signed, room- and identity-scoped token with a short expiry, least-privilege grants, and no provider secret. The browser receives only its own token over HTTPS and must request a new token after expiry; it never signs a token.

Webhook/gateway ingress must use HTTPS, validate the provider signature against the raw request and current webhook secret before parsing or acting, enforce timestamp/replay protection where supported, deduplicate provider event IDs within the session, and reject failed verification. Store only a redacted verification outcome and correlation ID in the audit trail.

## Consent, PII, retention, and deletion

Before sending microphone audio to a provider or joining the credentialed pilot, show a Vietnamese consent notice that names the purpose (booking assistance), audio processor/provider, optional recording choice, and text/preset alternative. Record `audio_consent_at` only after affirmative consent. Recording is **off by default**: raw audio is not retained or sent to a recording sink unless a separate affirmative recording consent and configured retention period exist.

Treat passenger name, Vietnamese phone number, transcript, booking evidence, staff identity, room/session references, and booking code as PII or sensitive operational data. Collect the minimum required to form a booking draft. Do not use partial transcripts as evidence; delete them quickly or avoid persistence. Limit final transcript and immutable confirmation/evidence storage to the documented support/audit retention schedule approved before the pilot. Restrict it to authorized support and operations roles.

Provide a verified deletion/anonymization request path keyed by the session or booking reference. It deletes or anonymizes eligible transcript/session data, preserves only the minimum legally required confirmation/audit evidence, records a redacted retention action, and returns a completion reference. Backups follow their documented expiry rather than ad-hoc alteration. The public demo retains no server-side passenger data.

Phone numbers must be redacted in logs, audit payloads, screenshots, traces, and support exports (for example, `0901***789`). Never log raw audio, authorization headers, tokens, database URLs, full transcript by default, or booking evidence quotes containing unnecessary PII.

## Asset, threat, control, and evidence

| Asset | Threat | Control | Verification evidence |
|---|---|---|---|
| Booking confirmation and code | Duplicate/replayed confirmation creates another booking | Atomic confirmation transaction; scoped idempotency key plus request/summary hashes; immutable snapshot | Transaction tests and audit record with confirmation/correlation IDs |
| Passenger facts/evidence | Agent or staff fabricates facts | Final passenger-only evidence, same-session provenance validation | Core tests and evidence references in accepted confirmation |
| Room access | Uninvited participant or leaked room secret | Server-only, short-lived room token bound to role/identity/room | Token endpoint test; token expiry and two-device pilot smoke |
| Provider/webhook ingress | Forged, replayed, malformed event | Signature, timestamp/replay validation, schema validation, provider-event dedupe | Negative signature/replay tests and redacted ingress audit event |
| Phone/transcript/audio | Disclosure or unapproved recording | Consent, no-default-recording, redaction, least access, retention/deletion | Consent record, retention job evidence, access review |
| Runtime credentials | Secret reaches client/source/logs | Managed secret stores, server-only names, rotation procedure | Secret scan, deployment env review, rotation incident record |
| Availability/voice media | Provider or room outage causes unsafe state | Text/preset browser fallback, human takeover, no confirmation on failed persistence | Runbook exercise and degraded-mode smoke |

## Required audit evidence

Append-only, redacted audit events include a correlation ID, session/draft/confirmation references where applicable, actor role/ID, event type, outcome, and timestamp. Required event types include consent, incoming assignment, Agent delegation/revocation, takeover, provider/webhook verification failure, confirmation accepted/rejected, idempotency conflict/retry, retention action, and credential rotation. Audit access is restricted and does not substitute for retaining raw audio.
