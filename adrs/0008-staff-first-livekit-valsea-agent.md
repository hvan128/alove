# ADR 0008: Staff-first LiveKit room with VALSEA cascade agent

**Status:** Accepted  
**Date:** 2026-07-18

## Context

The previous demo displayed caller and staff in one browser. The product now needs a dedicated staff route, a separate phone-friendly caller route, realtime transcript and translation, incremental booking fields, safe reply suggestions, and an optional speaking agent. VALSEA ASR is mandatory in the real speech path.

Browser speech recognition cannot satisfy the VALSEA requirement. A durable audio WebSocket bridge is not a good fit for Vercel request lifecycles. Project-4 already proves LiveKit room transport and a persistent agent worker pattern, including explicit agent dispatch, participant linking, transcript forwarding, and deployment pitfalls.

## Decision

Use:

- Next.js on Vercel for `/staff`, `/call`, tokens, state APIs, and Neon persistence.
- LiveKit Cloud for two-sided WebRTC audio and room data.
- A named Python LiveKit agent worker linked explicitly to the caller participant.
- A custom streaming VALSEA RTT adapter for STT.
- A cascade voice path for optional replies, using OpenAI as the guarded downstream LLM and VALSEA TTS for spoken audio.
- Deterministic incremental booking extraction and validation as the guaranteed workflow layer.
- Same-origin BroadcastChannel, text presets, and device speech only as a clearly labeled no-key fallback.

Default the worker to Human mode. Only an explicit `staff.preferences` command can enable Auto speech. Booking confirmation remains a staff action in both modes.

## Consequences

- Remote laptop/phone audio works once LiveKit and worker credentials are configured.
- VALSEA remains the only ASR in the real pipeline and partial/final semantics stay correct.
- The agent worker must be deployed separately from Vercel and kept warm enough for demo latency.
- The deterministic fallback validates the complete staff workflow without pretending external speech APIs ran.
- LiveKit, VALSEA, Neon, and worker credentials are required for a full production smoke test.

## Operational guardrails

- Unique room per session.
- Short token TTL and room-scoped publish/subscribe/data grants.
- Agent dispatch only on caller token.
- Explicit caller participant identity in `RoomOptions`.
- Separate dev and production agent names.
- Graceful worker shutdown and at least one warm instance for stage demos.
- No audio retention by default.

## Evidence

- https://valsea.ai/docs/realtime
- https://valsea.ai/docs/api/voicebot-realtime
- https://docs.livekit.io/agents/logic/sessions/
- https://docs.livekit.io/agents/server/agent-dispatch/
- https://docs.livekit.io/deploy/custom/deployments/
- `project-4/agent/agent.py`
- `project-4/src/lib/livekit/token.ts`
- `project-4/src/components/interview/livekit-room.tsx`
