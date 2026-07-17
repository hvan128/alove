# Product Vision — VéĐi

## Purpose

VéĐi is a Vietnamese voice-assisted bus-ticket workspace. It lets a passenger ask for a trip naturally while customer-care staff watch the same conversation, take over when needed, and confirm a reviewable booking. The hackathon demo prioritizes a complete, repeatable Web Call over unavailable phone or LiveKit credentials.

## Users

| User | Need | Product outcome |
|---|---|---|
| Passenger | Book a suitable trip without navigating a long form | Conversational route search, clear fare, seats and confirmation code |
| Customer-care employee | See what the passenger asked and intervene safely | Shared transcript, extracted booking, human mode and explicit confirmation |
| Bus operator | Demonstrate automation without losing operational control | Auto-agent mode, staff takeover, evidence and deterministic booking rules |

## Principles

1. Two sides remain visible: passenger experience and customer-care control.
2. Agent automation is a mode, not an irreversible handoff; staff can take over without losing state.
3. A final customer message may update the draft; provisional speech may not.
4. Explicit confirmation is required before a booking code is issued.
5. Provider readiness is truthful. The zero-key demo never claims a real phone or LiveKit connection.
6. Preset and text controls always work; browser speech is progressive enhancement.

## MVP success measures

- Complete Sài Gòn → Đà Lạt booking for two passengers in under two minutes.
- Demonstrate both `Nhân viên` and `Agent tự động` modes.
- Auto agent proposes a trip, collects passenger details, reads a summary and confirms once.
- Human mode sends no automatic reply and permits explicit staff response.
- Every extracted value links to at least one customer message.
- Demo works on deployed Vercel without provider credentials and at desktop/mobile widths.

## Scope

Included: two-sided Web Call workspace, deterministic bus catalog and agent, text/preset input, optional browser speech recognition, device TTS, staff takeover, evidence-backed booking draft, idempotent demo confirmation, Apple-like shared UI, tests and production deployment.

Excluded: payment, real seat inventory lock, SMS/Zalo delivery, PSTN/SIP, remote two-device audio, production LiveKit deployment without project credentials, and autonomous purchase without explicit confirmation.

