# ADR 0001: Modular monolith with a dedicated media gateway

**Status:** Accepted

## Decision

Use a pnpm workspace with a Next.js web application, a Fastify media gateway and shared packages for contracts, domain core and providers. Deploy the Next.js application to Vercel. Run the media gateway on a Node host suitable for long-lived WebSockets.

## Context

The product needs both product UI and continuous bidirectional audio. A single unbounded backend would couple UI deploys, provider sockets and rules. A full microservice estate is unjustified for an MVP.

## Consequences

- Contracts package is the only boundary shared by web and gateway.
- Domain core has no HTTP/WebSocket/provider imports and is unit-testable.
- Vercel remains a valid web deployment even if the realtime gateway is hosted separately.
- Deployment requires two environment configurations in production; the public demo remains usable in no-key client demo mode.
