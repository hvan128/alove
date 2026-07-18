# ADR 0004: SpeechToInvoice booking-safety test pyramid

## Status

Accepted — 2026-07-18

## Context

The product must demonstrate a reliable no-key Web Call while allowing a provider-backed pilot later. A green browser screen alone cannot prove evidence provenance, explicit confirmation, retries or safe degradation.

## Decision

Use a test pyramid with five default layers and a separately credentialed smoke layer:

1. Vitest unit tests for pure parsing, state transitions, evidence validation, confirmation and idempotency.
2. Contract tests for Zod message, event and provider-normalization schemas.
3. Integration tests for BFF routes, repositories, transactions and failure mapping.
4. Playwright E2E tests for text/preset Web Call, automatic/human modes, takeover, confirmation and repeated confirmation.
5. Credentialed-smoke tests for LiveKit and VALSEA only when owner-provisioned credentials and consented test media are available.

## Consequences

- Default CI stays deterministic and does not claim a live provider succeeded.
- Fixture tests cover provider encoders, decoders and event mappings.
- Credentialed-smoke outcomes are release evidence and may be skipped only with an explicit unavailable-credential record.
- Tests must prove partial messages and Agent output cannot confirm or mutate passenger facts.

## Migration impact

Convert legacy transport and export tests to booking state/evidence fixtures. Add test coverage at each adapter boundary before enabling it in a pilot; retain protocol fixtures only while their adapter remains supported.
