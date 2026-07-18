---
title: Phase 04 — Executable booking output
status: pending
priority: P1
effort: medium
plan: 2026-07-18-valsea-rubric-gap
---

# Phase 04 — Executable booking output

## Context

Confirmed bookings already persist atomically in Neon and the current ticket has a
real QR plus PNG download. Missing pieces are machine-readable JSON, a secure phone
verification flow, and optional server-to-server delivery.

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

- [ ] Versioned BookingSnapshot JSON exporter + download UI.
- [ ] Phone-gated verification API/page with rate limiting.
- [ ] QR encodes the verification URL, not a protected API URL.
- [ ] Server-side signed/idempotent webhook with bounded retry.
- [ ] Route, component and E2E tests.
- [ ] Manual QR phone verification recorded in rubric checklist.

## Acceptance

- Downloaded JSON validates against the current contract.
- A phone scan opens verification and reveals booking only after matching phone.
- Wrong phone/code does not disclose booking data.
- Webhook retries transient failures and never sends when unconfigured.

## Out of scope

- Restoring `/api/booking/advance` or client-side booking logic.
- An unauthenticated lookup-by-code endpoint.
