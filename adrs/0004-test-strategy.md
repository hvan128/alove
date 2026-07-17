# ADR 0004: Behavioural test pyramid

**Status:** Accepted

## Decision

Use test-first implementation. Vitest unit tests cover pure audio, transcript, resolver, order reducer and adapter parsing. Fastify injection tests cover HTTP/webhook state transitions. Playwright smoke tests cover the deployed-like operator demo, design system and audible speech control presence.

## Required behaviours

- mu-law decode/resample returns correctly sized PCM16 frames;
- partial segments never create an order change;
- final segments do create evidence-backed patches;
- ambiguous aliases block approval;
- a human correction/approval is required before export;
- export is idempotent;
- agent speech never changes an order;
- desktop/mobile console and `/design-system` render without console errors.

## Provider testing policy

Provider credentials are not mocked as successful live calls. Pure request/event encoding is tested with fixtures. A live smoke test is performed only if an owner-provisioned sandbox credential and reachable public endpoint exist, with outcome documented.
