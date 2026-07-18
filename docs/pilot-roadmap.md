# SpeechToInvoice pilot roadmap

[Business Case and Roadmap](business-case-and-roadmap.md) là nguồn chuẩn cho chi phí, ROI, team và roadmap thương mại P0–P3. File này giữ promotion gates kỹ thuật chi tiết và không thay thế báo giá provider/customer.

Each stage preserves booking evidence, explicit confirmation, scoped idempotency, human takeover, and browser fallback. A later stage cannot start merely because an adapter exists; it needs the prior stage's recorded exit evidence.

| Stage | Scope | Exit criteria | Not claimed |
|---|---|---|---|
| P0 — public demo | Same-browser passenger/staff Web Call; deterministic Sài Gòn → Đà Lạt flow; text/presets; optional device STT/TTS | No-key build/smoke, staff takeover, final evidence, explicit confirmation, and exact retry shows one deterministic code | LiveKit, provider success, Neon persistence, durable catalog/internal seat hold, payment, SMS, PSTN |
| P1 — two-device pilot | LiveKit room, server-only short-lived token endpoint, separate Agent worker, VALSEA-first consented speech, Neon target persistence | P0 evidence plus authorized two-device join, token expiry, worker readiness/restart, final-message handling, reconnect, redaction/retention checks, human takeover, transaction/idempotency and fallback evidence | Telephony, operator dashboard/internal holds, external inventory, payment, SMS, production-wide realtime reliability |
| P1b — operator operations pilot | Apple-like dashboard, catalog draft/validate/publish, vehicle templates, staff-only seat map and internal per-trip holds | Role authorization, immutable publish, seat-layout validation, concurrent-hold one-winner test, expiry/release/consume, atomic booking/audit and labeled memory fallback | External operator synchronization, ticket guarantee, payment, passenger seat map |
| P2 — telephony feasibility | One authorized Vietnamese media-call evaluation through separately deployed Fastify gateway; compare Twilio documented media path with confirmed Stringee commercial capability | P1b evidence plus provisioned account/number, signed ingress, consent, media access, latency/accuracy/cost, disconnect and browser/staff fallback evidence | Broad PSTN rollout, SMS delivery, payment, automatic recording |
| P3 — external inventory decision | Replace/bridge internal inventory through a documented operator adapter only after policy, contract, and reconciliation design | P1b evidence plus operator authorization, inventory freshness/hold semantics, failure/reconciliation tests, operational ownership, and rollback plan; P2 evidence only when telephony is also in scope | Ticket guarantee or payment until those integrations independently pass |

## Promotion evidence

For every gate, record source SHA, deployment ID, runtime profile, date/time, region/account mode where relevant, correlation IDs, latency, happy-path result, failure result, fallback used, and owner approval. A failed or missing check keeps the prior label and returns the experience to the public-demo/browser fallback rather than creating a stronger claim.

## Rollback rule

If authorization, consent, redaction, confirmation/idempotency, persistence, or provider health regresses, disable the affected pilot route/provider ingress, keep the booking confirmation gate closed for affected sessions, and roll back the independently deployed BFF, worker, gateway, or migration according to the deployment guide. An operational rollback never turns simulated output into a real booking, inventory hold, payment, SMS, PSTN, or production realtime claim.
