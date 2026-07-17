# VéĐi pilot roadmap

## P0, public demo

- Two-sided same-browser Web Call.
- Human/Agent mode handoff.
- Deterministic Sài Gòn → Đà Lạt booking flow.
- Optional browser STT and device TTS.
- Unit, component, E2E, production smoke.

## P1, two-device pilot

- LiveKit Cloud room and secure token endpoint.
- Separate customer/staff routes.
- Agent worker with VALSEA-first STT/TTS.
- Neon final transcript, booking and audit persistence.
- Reconnect, duplicate event and human takeover tests.

## P2, Vietnam telephony pilot

- Consent and retention policy.
- Compare one live Twilio call with Stringee commercial media capability.
- Route PSTN audio into the same final-message booking boundary.
- Measure latency, recognition accuracy, cost and number provisioning.

## Exit criteria

Không gọi một integration là “live” trước khi có production credential test, timestamp, deployment ID, latency và failure evidence. Public demo phải tiếp tục chạy không key trong mọi giai đoạn.
