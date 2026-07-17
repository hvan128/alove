# VéĐi Bus Ticket Voice Demo — Design

**Date:** 2026-07-18  
**Status:** Approved by product-owner delegation  
**Source branch:** `feature/TASK-002-bus-ticket-agent` from `dev@53cd961`

## Goal

Pivot the OrderVoice demo into a Vietnamese bus-ticket call-center demo that always works without phone numbers or provider credentials. Show both customer and customer-care sides, support human and automatic-agent modes, capture a complete ticket draft, and speak replies through the browser.

## Success scenario

1. Operator starts a Web Call demo.
2. Customer asks for two seats from Sài Gòn to Đà Lạt on Friday evening.
3. In `Agent tự động` mode, the agent proposes the 22:00 sleeper trip and speaks its reply.
4. Customer provides passenger details and confirms.
5. The workspace shows a confirmed booking code, seats, fare, pickup point, and evidence from the conversation.
6. In `Nhân viên` mode, no automatic reply is sent; the staff user can send and speak a reply, edit the draft, and confirm the booking.

## Approaches considered

### A. LiveKit Cloud plus deployed agent worker

Best production transport. Requires a LiveKit project, token secret, agent deployment, model/provider credentials, and ongoing worker capacity. Project-4 records dispatch, stale-worker, cold-start, and CPU sizing failures. This is not the safest zero-credential hackathon demo.

### B. Browser WebRTC with custom signaling

Provides real two-device audio without an SFU. It still needs signaling, reconnection, identity, TURN for restrictive networks, and a durable realtime backend. Vercel WebSocket support is new public beta; this adds avoidable release risk.

### C. Zero-key split-view Web Call demo — selected

Run both roles in one responsive workspace. Customer input uses preset utterances and optional browser speech recognition. Human and agent replies use browser speech synthesis only after user interaction. A deterministic booking agent drives slot filling and confirmation, so the demo remains repeatable and testable without secrets.

## Product shape

### Brand

- Product name: `VéĐi`
- Descriptor: `Trợ lý đặt vé nhà xe qua giọng nói`
- Tone: calm, precise, Vietnamese-first, operational rather than promotional

### Roles

- `Khách hàng`: starts call, speaks/types booking requests, confirms ticket.
- `Nhân viên chăm sóc`: sees transcript and extracted booking, replies manually, takes over from automation, confirms booking.
- `Agent tự động`: proposes trips, asks for missing fields, speaks replies, and prepares confirmation. It never charges money.

### Modes

- `Nhân viên`: customer messages update evidence and draft; staff must send replies and confirm.
- `Agent tự động`: every final customer message advances the deterministic agent and produces a spoken reply.

Switching from auto to human stops future automatic replies but preserves transcript and booking state.

## Booking domain

### Static demo catalog

- Route: Sài Gòn → Đà Lạt
- Recommended trip: `SG-DL-2200`, 22:00, sleeper bus, 320,000 VND per seat
- Alternative trip: `SG-DL-2330`, 23:30, limousine, 390,000 VND per seat
- Pickup: Bến xe Miền Đông mới
- Drop-off: Bến xe liên tỉnh Đà Lạt

### Draft fields

- origin, destination, travel date label, time window
- passenger count
- selected trip and seats
- passenger name and phone
- total fare
- status: `collecting`, `trip_proposed`, `awaiting_confirmation`, `confirmed`
- evidence message IDs for extracted values

### Agent state machine

1. Missing route/date/seats → ask one compact clarification.
2. Route/date/seats complete → recommend matching trip and show alternative.
3. Trip selected → ask passenger name and phone.
4. Passenger complete → read back summary and ask for confirmation.
5. Explicit confirmation → issue deterministic demo booking code and seats.

Unknown free-form text yields a safe clarification. Duplicate confirmation reuses the existing booking code.

## UI architecture

### Route

- `/console`: main two-sided VéĐi demo, replacing sales-order console.
- `/design-system`: retained and updated with bus-call examples.
- `/`: updated product introduction and direct demo CTA.

### Layout

- Header: brand, Web Call status, elapsed time, demo/no-key badge.
- Mode bar: `Nhân viên` / `Agent tự động`, start/end call controls.
- Left device: customer identity, transcript, optional microphone, guaranteed preset utterances.
- Right desk: staff/agent state, response composer, booking facts, confirm control.
- Mobile: roles stack vertically; call controls remain sticky.

### Voice behavior

- Preset utterances guarantee deterministic demo.
- Web Speech API is progressive enhancement; unsupported browsers show a clear fallback.
- `speechSynthesis` speaks staff/agent replies. A visible replay button remains available.
- UI says `Web Call demo cùng trình duyệt`; it does not claim remote telephony or LiveKit connectivity.

## Component boundaries

- `packages/contracts`: booking, call, role, message, and mode schemas.
- `packages/core/src/bus-booking.ts`: pure catalog, parser, state machine, confirmation, idempotency.
- `apps/web/src/lib/bus-demo.ts`: initial deterministic demo state.
- `apps/web/src/hooks/use-speech-recognition.ts`: browser-only recognition adapter.
- `apps/web/src/components/bus-call/*`: workspace, customer side, care side, booking summary, message timeline.
- Existing audio-provider and order modules remain isolated for historical compatibility; new UI imports only bus-ticket contracts.

## LiveKit decision

LiveKit is not used in this zero-key release, so no LiveKit server is deployed. Official docs require signed room tokens; production self-hosting also needs TLS, TURN/firewall configuration, and separate agent capacity. Project-4 recommends managed SFU plus a Singapore worker only after credentials and pilot load exist.

Pilot seam:

1. Add a server-only token endpoint.
2. Replace local transport with `RoomContext.Provider` and `RoomAudioRenderer`.
3. Deploy LiveKit Cloud project plus named agent worker in Singapore.
4. Keep current booking state machine behind the agent tool boundary.

References:

- https://docs.livekit.io/transport/self-hosting/
- https://docs.livekit.io/deploy/custom/deployments/
- https://docs.livekit.io/frontends/build/authentication/endpoint/
- `project-4-reference/docs/live-interview-agent-hosting.md`
- `project-4-reference/src/components/interview/livekit-room.tsx`

## Error handling

- Mic denied/unsupported: preserve presets and text input.
- Speech synthesis unavailable: show text and non-blocking status.
- Invalid passenger count/phone: keep draft unconfirmed and show exact missing field.
- Call ended: disable new messages; retain transcript and booking.
- Agent failure: switch to human mode without losing state.

## Testing

- Core unit tests: extraction, slot progression, safe clarification, confirmation idempotency.
- Component tests: human mode sends no automatic reply; auto mode replies and speaks; takeover preserves state; confirmation gates.
- Playwright: complete auto-agent scenario and complete human-staff scenario.
- Browser verification: meaningful content, no framework overlay, no console errors, responsive split view.
- Release gates: lint, typecheck, unit tests, E2E, build, secret scan, Vercel production health and UI smoke.

## Out of scope

- Real payment, seat locking, operator inventory API, SMS/Zalo delivery.
- Real phone/SIP and remote two-device audio.
- LiveKit deployment without credentials.
- OpenAI key embedded in browser or repository.

