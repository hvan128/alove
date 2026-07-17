# Architecture

## Repository layout

```text
apps/
  web/                  Next.js 16 operator UI and deployable demo
  api/                  Fastify REST/websocket media gateway
packages/
  contracts/            Zod schemas and public TypeScript types
  core/                 audio conversion, order reducer, resolver and rules
  providers/            VALSEA, OpenAI, Twilio, ERPNext and demo adapters
db/                     Drizzle schema and migrations
```

## Runtime ownership

| Runtime | Owns | Does not own |
|---|---|---|
| Next.js web | UI, public HTTP demo endpoints, design system, client mic/replay | provider secrets, persistent media sockets, business rule decisions |
| Fastify gateway | WebSocket ingress, ASR session lifecycle, Twilio hooks, server TTS and domain orchestration | visual state or browser credential storage |
| Neon/Postgres | conversations, final segments, evidence, drafts, replies, approvals, export keys | partial ASR UI noise, raw audio blob storage |

## Trust boundaries

1. Browser can send audio and selected source metadata; it cannot select an ASR provider credential or mark a transcript final.
2. Gateway authenticates/validates webhooks before trusting telephone events.
3. Provider output is untrusted until Zod validation and final-event filtering.
4. LLM output is untrusted until evidence, resolver and rules validation.
5. ERP draft creation is untrusted until approved state and idempotency check.

## State machines

```text
source: ready -> connecting -> live -> ended
                       \-> error

order: capturing -> review_required -> ready_for_approval -> approved -> exported
                 ^             |                  |
                 |-------------+------------------+  (human correction / new final segment)
```

New final customer speech can demote an unexported approved draft to `review_required`; it can never change an exported draft.
