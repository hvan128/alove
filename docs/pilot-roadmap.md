# VéĐi pilot roadmap

## P0, public demo

- Two-sided same-browser Web Call.
- Human/Agent mode handoff.
- Deterministic Sài Gòn → Đà Lạt booking flow.
- Optional browser STT and device TTS.
- Unit, component, E2E, production smoke.

## P1, two-device pilot

- LiveKit Cloud room and secure token endpoint. *(code in repo)*
- Separate customer/staff routes.
- Agent worker with Speechmatics-default STT, A/B OpenAI/Gemini (ADR 0008). *(code in repo)*
- Neon final transcript, booking and audit persistence. *(code in repo — `apps/web/src/lib/db`)*
- `/dashboard` live transcript + call history. *(code in repo)*
- Reconnect, duplicate event and human takeover tests.

## P2, Vietnam telephony pilot

- Consent and retention policy.
- PSTN via LiveKit SIP + Telnyx/Twilio trunk — run `docs/pstn-sip-runbook.md`
  end-to-end; plan `plans/2026-07-18-pstn-call-dashboard/`. *(config templates in repo)*
- Vietnamese local number: confirm a VN commercial SIP trunk (FPT/CMC/iTel…)
  pointing at the same LiveKit SIP URI.
- Measure latency, recognition accuracy on 8 kHz phone audio, cost and number provisioning.

## Exit criteria

Không gọi một integration là “live” trước khi có production credential test, timestamp, deployment ID, latency và failure evidence. Public demo phải tiếp tục chạy không key trong mọi giai đoạn.
