# ADR 0003: Zod contracts own cross-boundary data

**Status:** Accepted

## Decision

Define Zod schemas and inferred TypeScript types in `packages/contracts`. HTTP request/response, WebSocket messages, normalized audio frames, transcript events and order patches validate against those schemas at their boundaries.

## Rationale

Browser, telephony and replay channels must be interchangeable. Shared contracts prevent a provider adapter from silently changing order semantics and make deterministic fixture testing possible.

## Rules

- `NormalizedAudioFrame` must be PCM signed little-endian, mono, 16 kHz.
- Partial transcript schemas cannot be accepted by persistent segment endpoints.
- Every generated order field includes one or more evidence references to final transcript segments.
- LLM response parsing may produce an order patch proposal only; resolver and rules determine valid domain state.
