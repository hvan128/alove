# ADR 0003: SpeechToInvoice cross-boundary messages and provenance

## Status

Accepted — 2026-07-18

## Context

Passenger input can arrive as browser text, preset input, optional device speech, LiveKit media, or an optional direct-media gateway. These transports must not change what counts as a booking fact or confirmation evidence.

## Decision

Define Zod schemas and inferred TypeScript types in `packages/contracts` for all cross-boundary messages, commands, provider events and persisted payloads. Zod validation owns final-message provenance at every ingress boundary.

Only a message that is both `role: passenger` and `final: true`, belongs to the draft conversation, and supports the current field value may update a booking draft or serve as field evidence. An explicit confirmation event is separately persisted and validated; an Agent cannot manufacture it.

## Consequences

- Partial transcripts are display-only and cannot mutate booking state or become evidence.
- Staff and Agent messages cannot populate passenger facts, although an authorized staff member may submit a separately validated confirmation.
- Provider payloads are normalized before application/core code sees them.
- Invalid payloads receive stable errors and a correlation ID without reaching domain mutation.

## Migration impact

Wrap existing browser and gateway message shapes with canonical Zod schemas before connecting new providers. Replace any generic evidence rule with field-level references to final passenger messages; preserve old payload readers only as explicit migration adapters.
