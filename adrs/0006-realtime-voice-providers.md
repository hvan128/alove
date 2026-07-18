# ADR 0006: SpeechToInvoice VALSEA-first pilot with adapter isolation

## Status

Accepted — 2026-07-18

## Context

The challenge calls for Vietnamese ASR, but the public Web Call must work with no third-party credentials. Provider behavior, cost, availability and consent obligations vary, and neither a browser nor an Agent may hold service secrets.

## Decision

Choose VALSEA as the first ASR candidate for the credentialed pilot. Access ASR, LiveKit, LLM, TTS, telephony and inventory only through provider adapters running in server/worker environments. Keep all provider secrets server-only. Retain browser/device recognition and device speech as optional public-demo fallbacks.

The Agent worker normalizes provider events and may request structured booking actions. Booking core validates those actions, current field evidence and explicit confirmation.

## Consequences

- The public demo has text/preset as guaranteed input; STT/TTS are progressive enhancements.
- Provider timeouts, malformed responses, quota limits and disconnects preserve the mutable draft and expose a safe fallback or staff takeover.
- Raw audio is not retained by default; pilot recording requires prior consent, retention, access and deletion controls.
- `NEXT_PUBLIC_*` values never contain provider secrets.

## Migration impact

Keep current VALSEA, OpenAI, Twilio and replay code only behind adapters. Validate protocol fixtures first, then add a credentialed smoke test and operational evidence before any adapter is described as live.
