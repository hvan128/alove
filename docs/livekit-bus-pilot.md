# SpeechToInvoice LiveKit bus-ticket pilot

> Tài liệu lịch sử của TASK-002. Worker và hai route đã được implement trong TASK-003; hướng deploy hiện hành nằm tại [`livekit-valsea-deployment.md`](livekit-valsea-deployment.md).

**Status:** TASK-003 đã có code cho worker và hai route, nhưng production web hiện vẫn chạy local fallback. Chưa claim LiveKit room, VALSEA media hoặc Neon live khi chưa có credentialed smoke evidence.

## Role, credentials, and runtime

| Part | Role | Credential owner/runtime | Readiness and fallback | Verification evidence required |
|---|---|---|---|---|
| LiveKit Cloud | Consented two-device audio/data room | Project URL/key/secret held server-side by BFF and worker | Pilot seam; use browser public demo/text-preset if unavailable | Two authorized devices, room connection, reconnect, latency, deployment ID |
| Next.js BFF | Authenticated UI/booking commands and token issuer | Holds signing credentials in Vercel secret environment | Must not run long-lived media; deny token issuance safely | Server-only token endpoint test, short expiry, role/room/identity binding |
| Agent worker | Long-lived room participant and realtime orchestration | Separate container/VM/service; holds provider credentials in its own managed secret store | Must not self-confirm or write booking; staff/text fallback on failure | Ready signal, worker join/restart, provider failure and takeover exercise |
| Booking application/core + Neon | Final-message evidence, confirmation, idempotency, pilot persistence | BFF/data runtime only; `DATABASE_URL` never browser-visible | Leave booking unconfirmed if persistence fails | Confirmation transaction and exact-retry evidence |

The BFF endpoint validates the authenticated staff/passenger session and requested room/identity, then issues a server-signed participant token with a short TTL and least privileges. The browser receives the token but never an API secret. Refresh occurs through the BFF after authorization, not by extending an expired client token.

## Pilot topology

```text
Passenger browser ----\
                     LiveKit room <--> separate Agent worker --> VALSEA / optional LLM-TTS
Staff browser --------/       |
                             v
             Next.js BFF -> booking application/core -> Neon audit/pilot records
```

The worker treats speech events as transport input. It can display provisional text and create normalized proposals; only final passenger messages may become evidence. The booking application/core alone validates the read-back, explicit confirmation, scoped idempotency key, and immutable confirmed snapshot. Human takeover changes reply authority without creating a new session or allowing staff/Agent messages to replace passenger evidence.

## Entry and exit checks

Before enabling the pilot: obtain approved credentials in managed secret stores, deploy BFF token route and separate worker, show Vietnamese audio consent, keep recording off by default, configure redacted correlation logs, and retain browser fallback.

The pilot exits only after a recorded two-device test proves: authorized short-lived token issuance; worker join and restart; consented final-message ASR; text/preset fallback; staff takeover; disconnect/reconnect to the same session; persistence health; explicit confirmation; exact duplicate retry returning one code; and redacted audit evidence. Capture date, source SHA, deployment IDs, account mode, correlation ID, latency, and observed failure behavior.

Do not label the capability live from architecture review, a local room, or credentials alone. Real inventory, payment, SMS, PSTN, and a production realtime claim are outside this pilot until their separate roadmap gates pass.
