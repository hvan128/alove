# ADR 0005: Definition of Done includes safety and release evidence

## Status

Accepted — 2026-07-18

## Context

A feature that looks complete can still issue an unsafe booking, fail when device speech is unavailable, or overstate an unverified provider connection. SpeechToInvoice needs a release bar that distinguishes public-demo evidence from credentialed-pilot evidence.

## Decision

A change is done only when its acceptance criteria, contracts, implementation and documentation agree; applicable lint, typecheck, unit, contract, integration, E2E and build checks pass; and review evidence is recorded. The release bar additionally requires:

- confirmation safety: final passenger-message provenance, explicit confirmation, atomic idempotency and one reusable booking code;
- degraded fallback: text/preset remains usable when microphone, STT, TTS, provider or media services fail;
- current docs, ADRs and data ownership consistent with the shipped runtime profile;
- release evidence that identifies source SHA, checks, runtime profile and any unavailable credentials.

## Consequences

- The public demo must never be labelled as a credentialed pilot.
- A provider failure, missing credential or unavailable deployment is disclosed as a blocker rather than converted into a success claim.
- No secret, raw audio, or unredacted phone number may enter source, test fixtures or release evidence.

## Migration impact

Map existing release artifacts to these safety and runtime-profile gates. Add missing confirmation, degraded-mode and evidence checks before promoting any optional adapter beyond a pilot seam.
