# ADR 0002: Next.js 16, Fastify, Neon and Drizzle

**Status:** Accepted

## Decision

Use Next.js App Router with React 19.2+, TypeScript, Tailwind CSS and native accessible HTML primitives for the web application. Use Fastify with WebSocket support for media. Use Neon Postgres and Drizzle ORM/migrations for persistent data. Use Vitest, Playwright and ESLint for quality gates.

## Rationale

Next.js/Vercel is explicitly required for the frontend and supplies a deployable App Router UI. Fastify has a small Node runtime and a clear WebSocket lifecycle. Neon provides serverless Postgres; Drizzle supplies typed schema/migration ownership. Keeping core logic package-local makes rules testable without credentials.

## Guardrails

- Initialize Neon, Drizzle and provider SDKs lazily inside getters, never at module scope.
- Use a safe current Next.js 16 patch and React 19.2.4+.
- Production persistence requires `DATABASE_URL`; development may use explicitly labelled in-memory fixture data only.
- Provider keys remain server-only environment variables and are absent from `NEXT_PUBLIC_*` values.
