---
title: Phase 04 — Executable booking output
status: in-progress
priority: P1
effort: medium
plan: 2026-07-18-valsea-rubric-gap
---

# Phase 04 — Executable booking output

## Context

Confirmed bookings already persist atomically in Neon and the current ticket has a
real QR plus PNG download. JSON export, secure phone verification and optional
server-to-server delivery are implemented and production API/browser validation is
complete. A physical phone-camera QR scan remains the only Phase 04 evidence gap.

## Requirements

- Export versioned JSON that round-trips through `bookingSnapshotSchema`.
- QR links to `/verify?code=...`; the page requires phone before lookup.
- Add a public rate-limited verification POST that returns a minimally disclosed,
  validated snapshot without exposing the agent bearer secret.
- Optional webhook runs server-side after authoritative confirm, uses HMAC,
  idempotency key, bounded retry and redacted logging.
- Missing webhook config is an explicit disabled state, not a fake delivery.

## Current touchpoints

- `ticket-result.tsx`, `call-contract.ts` and their tests.
- Booking lookup/confirm routes and `booking-store.ts`.
- New `/verify` page + verification route.
- New server webhook helper and confirm-route integration.
- `apps/web/.env.example`, `docs/deployment.md`, `specs/api-contracts.md`.

## Checklist

- [x] Versioned BookingSnapshot JSON exporter + download UI.
- [x] Phone-gated verification API/page with rate limiting.
- [x] QR encodes the verification URL, not a protected API URL.
- [x] Server-side signed/idempotent webhook with bounded retry.
- [x] Route, component and E2E tests.
- [x] Production search/hold/confirm, correct/wrong-phone verification and cancel
      smoke without retained hold or PII in the report.
- [ ] Manual QR phone verification recorded in rubric checklist.

## Acceptance

- Downloaded JSON validates against the current contract.
- A phone scan opens verification and reveals booking only after matching phone.
- Wrong phone/code does not disclose booking data.
- Webhook retries transient failures and never sends when unconfigured.

Automated and production API/browser evidence satisfies the software behavior.
Phase status remains `in-progress` until a physical phone scan records the QR
handoff itself; no external receiver is configured, so delivery evidence also
remains open without invalidating the explicit disabled behavior.

## Out of scope

- Restoring `/api/booking/advance` or client-side booking logic.
- An unauthenticated lookup-by-code endpoint.
