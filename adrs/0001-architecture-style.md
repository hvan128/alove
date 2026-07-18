# ADR 0001: Modular monolith with a separate realtime worker

## Status

Accepted — 2026-07-18

## Context

SpeechToInvoice is a Vietnamese AI voice-agent bus-ticket booking product. Its public profile is a same-browser Web Call that must run without provider credentials; its next profile adds remote realtime media. Booking safety, final-message evidence, explicit confirmation, and idempotency must remain the same in either profile. Long-lived media streams and agent jobs do not have the lifecycle of a Next.js BFF request.

## Decision

Use a modular monolith for the web/BFF and booking application, with pure shared contracts and booking core. Deploy a separate realtime worker/direct-media gateway when the credentialed pilot needs it.

- Next.js App Router owns the passenger/staff workspace, BFF routes, authentication and short-lived room-token issuance.
- Contracts, booking state transitions, confirmation validation and idempotency remain transport-independent.
- A separately deployed Agent worker owns LiveKit participation, media turns and provider adapters.
- Fastify is an optional direct-media/PSTN gateway, not the default BFF or booking owner.

## Consequences

- The public demo remains credential-free and deployable without the worker.
- The pilot has multiple deployables and requires correlation IDs, health checks and secret ownership per runtime.
- The worker and gateway may propose or relay messages, but only the booking application/core may confirm a booking.
- Long-lived media does not run inside the Next.js BFF.

## Migration impact

Keep existing Fastify and provider code as optional adapter seams. Move any booking rule that depends on HTTP, WebSocket, React or a provider SDK behind contracts/core before enabling the credentialed pilot. Do not rename legacy packages as part of this documentation migration.
