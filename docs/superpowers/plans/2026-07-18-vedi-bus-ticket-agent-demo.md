# SpeechToInvoice bus-ticket agent-demo implementation plan

**Status:** Delivered and maintained as the active demo plan.

## Goal

Provide a browser-only Vietnamese booking demo in which a passenger and customer-care employee share one responsive workspace. The AI agent is deterministic, optional browser speech is progressive enhancement, and every result is truthful demo output.

## Workstreams

### 1. Typed booking domain

- Keep contracts for modes, roles, final messages, trip choices, booking facts, evidence, and confirmation state.
- Keep the static `Sài Gòn → Đà Lạt` evening catalog and the state progression from collecting to confirmed.
- Test that a confirmed draft cannot omit its selected trip or booking code.

### 2. Deterministic booking agent

- Parse supported route, passenger count, trip choice, name, phone, and keyword/manual confirmation.
- Ask concise clarification for unsupported or missing information.
- Reuse the same deterministic code through in-memory booking-code reuse, not scoped idempotency.
- Test extraction, clarification, keyword/manual confirmation, and in-memory booking-code reuse, not scoped idempotency.

### 3. Dual workspace

- Render passenger and care-desk surfaces with a shared transcript and booking summary.
- Ensure human mode does not generate an automatic reply.
- Preserve state when switching automatic to human mode.
- Stack the surfaces on mobile; retain accessible native controls, 44px targets, focus visibility, and reduced-motion support.

### 4. Speech enhancement and fallback

- Use browser recognition only when available and after user intent.
- Preserve text and presets under denied permission, unsupported APIs, or speech errors.
- Speak only after an explicit interaction; offer replay and stop.

### 5. Release verification

```bash
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build
git diff --check
```

Browser verification follows the canonical two-passenger journey, retries confirmation, switches to human mode, and checks desktop/mobile rendering plus absence of page errors. Credentialed LiveKit, provider media, phone, persistence, payment, inventory, and delivery capabilities remain outside this public demo until separately verified.

The release checklist is [`../../vedi-release-manifest.md`](../../vedi-release-manifest.md).
