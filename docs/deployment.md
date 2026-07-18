# SpeechToInvoice deployment guide

## Runtime profiles

| Profile | Purpose and runtime | Data/provider boundary | Promotion condition |
|---|---|---|---|
| Local/public demo | Next.js workspace; same-browser passenger/staff Web Call | Deterministic browser state; text/presets guaranteed; browser STT/TTS optional | Build and no-key smoke pass; do not claim remote media, Neon, payment, inventory, SMS, or PSTN |
| Vercel web/BFF | Next.js UI, health endpoint, authenticated booking commands, short-lived LiveKit-token endpoint | Browser receives no service secret; BFF does not host long-lived media | Environment review, health/smoke evidence, token-endpoint authorization test |
| Credentialed pilot | Vercel web/BFF plus LiveKit Cloud, separately deployed Agent worker, and Neon | Consented provider audio; final normalized messages reach core; final-only pilot persistence | Two-device exit criteria, consent, secret, migration, provider, reconnect, and rollback evidence |

`apps/api` Fastify is an optional direct-media, replay, PSTN, or webhook gateway. It is a separate deployable service with its own health checks, domain/TLS, secret store, observability, and rollback. Do not run it inside a Next.js request lifecycle or use it as a replacement for the BFF.

## Environment variables and owners

| Runtime owner | Variables | Handling |
|---|---|---|
| Browser | `NEXT_PUBLIC_*` values that are explicitly non-secret, such as a public UI label or public LiveKit URL when required | Build-time/public; never place API keys, database URLs, webhook secrets, signing keys, or provider tokens here |
| Vercel BFF | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, BFF session/signing secret, approved provider endpoint configuration | Managed encrypted environment; token route only exposes short-lived participant token |
| Agent worker | LiveKit server credentials, `VALSEA_API_KEY`, approved LLM/TTS keys, worker configuration | Managed encrypted environment on worker host; outbound provider access only; never browser-visible |
| Fastify gateway | Gateway auth/signing secret, verified-provider webhook secret, provider media credentials | Managed encrypted environment on the independently deployed gateway |
| Neon/Drizzle migration job | `DATABASE_URL` and migration-only access where supported | Managed encrypted environment; least privilege; never in client bundle or logs |

No secret may use `NEXT_PUBLIC_*`, be copied into source/config committed to git, or appear in build output, correlation logs, screenshots, or support exports.

## Build and release gates

1. Confirm the intended runtime profile and that the release does not overstate unavailable providers.
2. Run repository lint/typecheck/test/build gates recorded in the release manifest, plus a secret scan and documentation checks.
3. For the public demo, run a no-key smoke: load both panels, complete text/preset flow, take over as staff, explicitly confirm once, retry the same confirmation, and verify the existing deterministic code is returned.
4. For a pilot, additionally verify role/session authorization, server-only short-lived token issuance, explicit audio consent, provider failure fallback, two-device reconnect, human takeover, and redacted logs.
5. Record deployment ID, source SHA, runtime profile, timestamp, region where relevant, checks, known unavailable integrations, and correlation IDs for smoke evidence.

## Database migration order

1. Review target schema, retention impact, indexes, ownership, and rollback/compatibility plan.
2. Take a verified backup/restore point and deploy additive, backward-compatible Drizzle migration.
3. Validate health, connection, constraints for session/message/evidence/confirmation/idempotency records, and read compatibility.
4. Deploy code that writes the new shape; run transaction-level confirmation/idempotency smoke with synthetic/consented pilot data.
5. Backfill only with reviewed, redacted jobs; monitor errors and row counts.
6. Remove obsolete paths only in a later release after retention and rollback windows expire.

Never run a destructive migration as an unreviewed deploy step. A database failure leaves the booking unconfirmed; retry uses the same scoped idempotency key after recovery.

## Health, smoke, and rollback

Health checks: web/BFF responds without secrets; Fastify responds independently when enabled; worker reports connected/ready without exposing credentials; Neon connection/migration version is checked from a server runtime. A pilot smoke uses consented test participants and verifies final-message evidence, explicit confirmation, one code for an exact retry, disconnect/reconnect without a second booking, and browser text/preset fallback.

Rollback when a release breaks authorization/token issuance, confirmation/idempotency, PII redaction, consent, health, provider error handling, or a migration threatens integrity. First disable pilot routing/provider ingress or revert the affected web/worker/gateway deployment, keep the core confirmation gate closed for affected sessions, preserve redacted correlation evidence, and notify the operations owner. Restore the last compatible application version; roll forward with a corrective migration unless the reviewed migration plan explicitly permits a safe rollback. Do not claim a booking, payment, inventory hold, or delivery after a rollback.
