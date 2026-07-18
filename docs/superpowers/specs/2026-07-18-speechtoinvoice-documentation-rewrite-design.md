# SpeechToInvoice Documentation Rewrite Design

## Goal

Rewrite every project Markdown document so it describes one coherent product: **SpeechToInvoice**, an AI voice-agent system that helps passengers book bus tickets in Vietnamese.

## Product definition

SpeechToInvoice provides a two-sided booking workspace. The shipped public demo has a `customer` speak/type/preset request path, an `auto` or `human` mode, a deterministic static trip proposal, aggregate `evidenceMessageIds`, and keyword/manual confirmation that creates an in-memory demo code. A customer-care employee can observe the conversation, reply manually, and take over from the agent. Persisted explicit confirmation, staff authorization, and scoped idempotency are target credentialed-pilot controls, not public-demo capabilities.

The product name remains `SpeechToInvoice` for repository, deployment, and product references. The product does not perform food ordering, restaurant ordering, invoice generation, or autonomous payment.

## Documentation model

All Markdown files under repository root, `adrs/`, `docs/`, `specs/`, and `tasks/` remain in place so existing links keep working. Their content is rewritten around SpeechToInvoice. Legacy names in filenames may be retained only where changing a filename would break a tracked reference; their titles, copy, examples, and links must use SpeechToInvoice and bus-ticket booking.

The canonical story is:

1. Passenger starts a browser-based voice or text booking conversation.
2. The current demo extracts origin, destination, `travelDateLabel`, passenger count, selected trip, passenger name, and `phone`; `timeWindow`, fare, and seats are derived summary/output data.
3. Agent proposes a static or provider-sourced trip and requests missing information.
4. Agent reads a deterministic summary and appends IDs of changed final customer messages to aggregate evidence.
5. A supported keyword or manual staff button confirms the in-memory demo draft.
6. The target pilot (not this demo) uses `agent`/`passenger`, `travelDate`, `vietnamesePhone`, field-level evidence, explicit confirmation events, staff authorization, and server-scoped idempotency. No payment, seat-inventory guarantee, PSTN call, or production media connection is claimed unless enabled.

## Required coverage

| Area | Documentation responsibility |
|---|---|
| Root README and workflow | Product introduction, local run, quality gates, deployment and repository workflow |
| Product specs | Vision, users, features, domains, API contracts, confirmation and provenance rules |
| ADRs | Architecture, stack, contract-first boundary, test strategy, definition of done, voice-provider seams, Web Call decision |
| Technical docs | Runtime architecture, UI system, demo scripts, release manifest, provider feasibility, LiveKit pilot and rollout roadmap |
| Tasks and implementation guide | Deliverables, acceptance criteria, commands and handoff for SpeechToInvoice work |
| Existing specs and plans | Historical planning paths rewritten as current SpeechToInvoice planning artifacts; no OrderVoice product narrative remains |

## Content rules

- Use Vietnamese for operator-, passenger-, and demo-facing content. Technical terms and code identifiers may remain English.
- Use `SpeechToInvoice` as product name. Use `AI Voice Agent đặt vé xe` as descriptive phrase.
- Use a consistent example: `Sài Gòn → Đà Lạt`, two passengers, evening departure.
- State browser speech recognition and device TTS as optional enhancements; text and preset input remain reliable fallbacks.
- State LiveKit, VALSEA, Twilio, OpenAI, Neon, and payment integrations only as seams or pilots unless verified credentials and runtime support exist.
- Distinguish the source-compatible public-demo aggregate evidence and keyword/manual confirmation from the target pilot's field-level provenance and explicit confirmation event.
- Never claim real payment, confirmed live seat inventory, SMS/Zalo delivery, phone calls, or deployed realtime media when not implemented.
- Remove all references to OrderVoice, food ordering, restaurants, menus, cart, dishes, and invoices as a product capability.

## Verification

After rewrite, repository search finds no case-insensitive references to `OrderVoice`, food ordering, restaurants, menus, carts, dishes, or the prior product narrative. Internal Markdown links resolve to existing paths. `git diff --check` returns no whitespace errors.

## Non-goals

- Rename repository, GitHub URL, package names, source code, branches, or deployment.
- Build new booking capabilities or change runtime behaviour.
- Delete documentation files or archive historical documentation.
