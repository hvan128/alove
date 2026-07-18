# ADR 0002: TypeScript stack for web, core and pilot persistence

## Status

Accepted — 2026-07-18

## Context

SpeechToInvoice needs a browser-first public demo and a credible path to a Node-based, credentialed pilot. The stack must support server-only credentials, typed persistence and both deterministic and provider-backed flows without making credentials a public-demo requirement.

## Decision

Use Next.js App Router on the Node.js runtime with TypeScript for the web/BFF. Use Neon Postgres with Drizzle for pilot persistence. Use Vitest for unit, contract and integration coverage, and Playwright for browser E2E coverage.

Fastify remains available only as an optional Node direct-media gateway. LiveKit, VALSEA, LLM and TTS libraries are pilot adapters, not baseline runtime dependencies.

## Consequences

- Node.js, rather than Edge, is the default for database, token-signing and provider-SDK paths.
- Drizzle schema and migrations own persistent storage shape; the public demo may retain explicitly labelled local state.
- Provider and database clients are initialized lazily and only in server/worker code.
- A missing `DATABASE_URL` or provider credential prevents credentialed-pilot evidence, not the public demo.

## Migration impact

Retain current Next.js, Fastify and Drizzle seams while replacing legacy business naming in future schemas and modules. Add pilot tables through reviewed Drizzle migrations; do not imply that a local schema seam is a connected Neon deployment.
