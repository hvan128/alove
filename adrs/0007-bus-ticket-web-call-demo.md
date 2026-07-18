# ADR 0007: Same-browser Web Call public profile; LiveKit worker pilot profile

## Status

Accepted — 2026-07-18

## Context

SpeechToInvoice must show a two-sided Vietnamese bus-ticket booking experience reliably without a phone number, media server or provider credentials. A real multi-device call needs short-lived room tokens, LiveKit infrastructure, consented media, ASR/TTS credentials and a separately running Agent worker.

## Decision

Make the same-browser passenger/staff Web Call the public demo profile. It uses text and preset input, a deterministic booking core, optional browser STT/TTS, automatic/human modes, staff takeover, final-message evidence, explicit confirmation and idempotent booking-code issuance.

Make LiveKit plus a separate Agent worker the credentialed pilot profile for two browsers/devices. Next.js signs short-lived tokens server-side; the worker joins the room and invokes VALSEA/LLM/TTS adapters. Fastify remains optional for direct media or PSTN.

## Consequences

- Public-demo claims are limited to same-browser Web Call and optional device speech; they do not claim remote media, PSTN, inventory, payment or provider success.
- The pilot retains the same contracts and booking core, so media transport cannot bypass confirmation safety.
- Staff takeover keeps the same call session, draft, messages and evidence; it only changes reply authority.

## Migration impact

Keep UI labels explicit about the active profile. Do not enable or market LiveKit until two-device, credentialed-smoke and worker-health evidence exists; preserve browser fallback throughout pilot rollout.
