# ADR 0007: Pivot to deterministic two-sided bus-ticket Web Call

**Status:** Accepted  
**Date:** 2026-07-18

## Context

The product must pivot from B2B sales orders to bus-ticket booking, show passenger and customer-care sides, support an automatic speaking agent, and remain demonstrable without a real phone number. LiveKit was evaluated against current official docs and project-4 operational evidence.

LiveKit production requires signed room tokens plus either managed Cloud resources or self-hosted TLS/TURN/firewall infrastructure. Voice agents also require a separately deployed worker and model/provider credentials. Project-4 records failed dispatches, duplicate workers, cold starts and under-sized CPU as real demo risks.

## Decision

Ship a zero-key, same-browser Web Call workspace as the default demo:

- both roles are visible together;
- preset/text input guarantees the scenario;
- browser speech recognition is optional;
- device TTS makes replies audible;
- a pure deterministic agent performs slot filling and confirmation;
- staff can switch between human and automatic modes without losing state.

Do not deploy or claim LiveKit in this release. Preserve a documented LiveKit pilot seam using server-only token generation, room transport and a named Singapore agent worker after credentials are supplied.

## Consequences

- Production demo is reliable, cheap, secret-free and fully testable on Vercel.
- It is a call simulation, not remote two-device media or telephony; UI labels this explicitly.
- Booking logic remains reusable when LiveKit, VALSEA or phone transport is added.
- Real inventory, payment and delivery integrations remain separate pilot work.

## Evidence

- https://docs.livekit.io/transport/self-hosting/
- https://docs.livekit.io/deploy/custom/deployments/
- https://docs.livekit.io/frontends/build/authentication/endpoint/
- `project-4-reference/docs/live-interview-agent-hosting.md`
- `project-4-reference/src/components/interview/livekit-room.tsx`

