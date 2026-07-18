# SpeechToInvoice Documentation Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite project Markdown around SpeechToInvoice, an AI voice agent for Vietnamese bus-ticket booking, with one accurate architecture and operational story.

**Architecture:** Document a modular monolith with a separate realtime worker. Next.js App Router owns UI/BFF; pure packages own contracts and booking rules; Neon owns persistence; a separately deployed worker owns LiveKit/VALSEA media. Fastify remains an optional direct-media/PSTN gateway; public demo remains a credential-free same-browser profile.

**Tech Stack:** Markdown, Next.js App Router, Node.js, TypeScript, Zod, Neon, Drizzle, Vitest, Playwright, browser Web Speech APIs, Vercel; optional LiveKit, VALSEA, Twilio and LLM/TTS adapters.

## Global Constraints

- Product name: `SpeechToInvoice`; description: `AI Voice Agent đặt vé xe`.
- Use Vietnamese for product and demo copy; technical identifiers may remain English.
- Shared example: `Sài Gòn → Đà Lạt`, two passengers, evening departure.
- The public demo uses aggregate final-message IDs and keyword/manual confirmation; field-level evidence and explicit confirmation are target-pilot controls only.
- Browser STT/TTS is optional; typed and preset input remains fallback.
- LiveKit, VALSEA, Twilio, LLM/TTS, Neon and payment remain pilot seams unless verified.
- Do not claim payment, live-seat guarantees, SMS/Zalo, PSTN or production realtime media.
- Keep booking rules in `packages/core`; UI, database, WebSocket, React and provider SDKs cannot enter core.
- Use Zod contracts at every HTTP, WebSocket, worker, provider and repository boundary.
- Use Node.js runtime for database/provider routes; do not select Edge runtime for those paths.
- Long-lived media and agent lifecycle run outside Next.js/Vercel BFF.
- Raw audio is not stored by default; phone numbers are PII and must be redacted from logs.
- Preserve existing Markdown paths; rewrite content, do not delete or archive existing files.

---

## File map

| Group | Files | Responsibility |
|---|---|---|
| Entry | `README.md`, `workflow.md`, `ORDERVOICE_IMPLEMENTATION_GUIDE.md` | Product entry, local workflow, quality gates |
| Product | `specs/*.md` | Users, features, domains, API/events and invariants |
| Decisions | `adrs/*.md` | Architecture, stack, contracts, test, DoD and provider decisions |
| Architecture | `docs/architecture.md`, `docs/data-model.md` | Context, containers, components, flows, state and data ownership |
| Operations | `docs/security-and-privacy.md`, `docs/deployment.md`, `docs/operations-runbook.md` | Security, environments, rollout and incident operation |
| Experience | design system, demo and release docs | UI rules, repeatable demo and verified release truth |
| Pilot | integration, LiveKit and roadmap docs | Provider readiness, fallback and exit gates |
| Work artifacts | `tasks/*.md`, existing superpowers specs/plans | Deliverables and acceptance checks |

## Task 1: Rewrite entry points and product contracts

**Files:**
- Modify: `README.md`
- Modify: `workflow.md`
- Modify: `ORDERVOICE_IMPLEMENTATION_GUIDE.md`
- Modify: `specs/product-vision.md`
- Modify: `specs/features.md`
- Modify: `specs/domains.md`
- Modify: `specs/api-contracts.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-07-18-speechtoinvoice-documentation-rewrite-design.md` and `docs/superpowers/specs/2026-07-18-speechtoinvoice-architecture-design.md`.
- Produces: Canonical product language and booking contract used by later tasks.

- [ ] **Step 1: Rewrite product identity and workflow**

Define customer, customer-care employee and bus operator. Document the two-sided browser Web Call, `auto`/`human` modes, route discovery, trip proposal, passenger collection, deterministic summary, keyword/manual demo confirmation and staff takeover. Separately name explicit confirmation, authorization and scoped idempotency as target-pilot controls. Remove prior product capability language.

- [ ] **Step 2: Rewrite contracts and scope**

Define source-compatible public-demo `customer` messages, `travelDateLabel`, `phone`, aggregate `evidenceMessageIds`, booking state and in-memory code reuse. Separately version the pilot `passenger`, `travelDate`, `vietnamesePhone`, `fieldEvidenceMessageIds`, persisted confirmation and scoped idempotency contract. Both use the same seven readiness concepts—origin, destination, travel date, passenger count, selected trip, passenger name, Vietnamese phone—while fare, time window and seats are derived summary data. Exclude payment, real seat lock, delivery messaging, PSTN/SIP and autonomous confirmation.

- [ ] **Step 3: Preserve runnable commands**

Keep `pnpm install`, `pnpm dev:web`, lint, typecheck, test, E2E and build commands. Direct public demo to `/console`; label browser speech as progressive enhancement and text/preset as guaranteed input.

- [ ] **Step 4: Verify Task 1**

Run: `rtk rg -n -i 'ordervoice|đặt món|restaurant|food|menu|cart|dish' README.md workflow.md ORDERVOICE_IMPLEMENTATION_GUIDE.md specs`

Expected: no output.

- [ ] **Step 5: Commit**

```bash
rtk git add README.md workflow.md ORDERVOICE_IMPLEMENTATION_GUIDE.md specs
rtk git commit -m "docs: define SpeechToInvoice product contracts"
```

## Task 2: Rewrite architecture, decisions and data model

**Files:**
- Modify: `adrs/0001-architecture-style.md`
- Modify: `adrs/0002-tech-stack.md`
- Modify: `adrs/0003-contract-first.md`
- Modify: `adrs/0004-test-strategy.md`
- Modify: `adrs/0005-definition-of-done.md`
- Modify: `adrs/0006-realtime-voice-providers.md`
- Modify: `adrs/0007-bus-ticket-web-call-demo.md`
- Modify: `docs/architecture.md`
- Create: `docs/data-model.md`

**Interfaces:**
- Consumes: Task 1 product contract and architecture design spec.
- Produces: Canonical runtime profiles, boundaries, state model and data ownership.

- [ ] **Step 1: Rewrite seven ADRs**

Every ADR contains `Status`, `Context`, `Decision`, `Consequences` and migration impact. Decisions must state:

- ADR 0001: modular monolith plus separate realtime worker/direct-media gateway;
- ADR 0002: Next.js App Router, Node.js runtime, TypeScript, Neon/Drizzle, Vitest and Playwright;
- ADR 0003: Zod owns cross-boundary messages and final-message provenance;
- ADR 0004: unit, contract, integration, E2E and credentialed-smoke test pyramid;
- ADR 0005: DoD includes confirmation safety, degraded fallback, docs and release evidence;
- ADR 0006: VALSEA-first pilot ASR, provider adapters, server-only secrets and browser/device fallback;
- ADR 0007: same-browser Web Call is public profile; LiveKit plus separate agent worker is pilot profile.

- [ ] **Step 2: Rewrite `docs/architecture.md`**

Add system context, repository modules, public-demo containers, pilot containers, component ownership, customer-message flow, confirmation sequence, staff takeover, state transitions, trust boundaries, failure table and current-vs-target inventory. Include diagrams:

```text
Browsers -> Next.js BFF -> booking application/core -> Neon
Browsers <-> LiveKit room <-> Agent worker -> VALSEA/LLM/TTS
PSTN/replay -> optional Fastify gateway -> contracts/core
```

State long-lived media does not run inside Next.js BFF and only final passenger messages may mutate booking state.

- [ ] **Step 3: Create `docs/data-model.md`**

Define ownership and invariants for `call_session`, `call_message`/`transcript_segment`, `booking_draft`, `booking_evidence`, `booking` and `audit_event`. Include logical field tables, lifecycle, relations, idempotency-key uniqueness, immutable confirmed snapshot, evidence references, retention behavior and mapping to current `db/schema.ts`. Mark missing tables as target pilot schema.

- [ ] **Step 4: Verify Task 2**

Run: `rtk rg -n -i 'ordervoice|đặt món|restaurant|food|menu|cart|dish' adrs docs/architecture.md docs/data-model.md`

Expected: no output.

Run: `rtk rg -n 'public demo|credentialed pilot|Next.js|Agent worker|confirmation|idempot' docs/architecture.md docs/data-model.md adrs`

Expected: output maps each architecture concept to canonical doc or owning ADR.

- [ ] **Step 5: Commit**

```bash
rtk git add adrs docs/architecture.md docs/data-model.md
rtk git commit -m "docs: align SpeechToInvoice architecture"
```

## Task 3: Add security, deployment and operations docs

**Files:**
- Create: `docs/security-and-privacy.md`
- Create: `docs/deployment.md`
- Create: `docs/operations-runbook.md`
- Modify: `docs/integration-feasibility.md`
- Modify: `docs/livekit-bus-pilot.md`
- Modify: `docs/pilot-roadmap.md`

**Interfaces:**
- Consumes: Task 2 runtime profiles, trust boundaries and data ownership.
- Produces: Environment matrix, secret/PII policy, pilot rollout and incident procedures.

- [ ] **Step 1: Create security and privacy policy**

Document passenger/staff/agent/service roles, server-controlled short-lived room tokens, secret classification, webhook verification, audio consent, no-default-recording policy, phone-number redaction, retention/deletion, audit evidence and threat cases. Include asset/threat/control/evidence table.

- [ ] **Step 2: Create deployment guide**

Define local/public demo, Vercel web/BFF and credentialed pilot profiles. List environment variables by runtime owner; no secret may use `NEXT_PUBLIC_*`. Include build gates, migration order, health/smoke checks, rollback decision and Fastify separate-deploy rule.

- [ ] **Step 3: Create operations runbook**

Add pre-demo checklist and response for mic denial, ASR/LLM/TTS failure, LiveKit disconnect, database failure, duplicate confirmation and leaked credentials. Each response states detection, safe state, fallback, recovery signal and escalation owner. Define correlation ID and log-redaction policy.

- [ ] **Step 4: Rewrite provider and pilot docs**

For LiveKit, VALSEA, telephony, LLM/TTS and Neon, state role, credential owner, runtime, readiness, fallback and verification evidence. Require server-only token endpoint, separate agent worker and browser fallback. Roadmap gates progress public demo -> two-device pilot -> telephony/real inventory only when prior exit criteria pass.

- [ ] **Step 5: Verify Task 3**

Run: `rtk rg -n -i 'ordervoice|đặt món|restaurant|food|menu|cart|dish' docs/security-and-privacy.md docs/deployment.md docs/operations-runbook.md docs/integration-feasibility.md docs/livekit-bus-pilot.md docs/pilot-roadmap.md`

Expected: no output.

Run: `rtk rg -n 'consent|retention|redact|rollback|correlation|fallback|worker' docs/security-and-privacy.md docs/deployment.md docs/operations-runbook.md docs/integration-feasibility.md docs/livekit-bus-pilot.md`

Expected: output proves operational controls and pilot boundaries exist.

- [ ] **Step 6: Commit**

```bash
rtk git add docs/security-and-privacy.md docs/deployment.md docs/operations-runbook.md docs/integration-feasibility.md docs/livekit-bus-pilot.md docs/pilot-roadmap.md
rtk git commit -m "docs: add SpeechToInvoice operations guidance"
```

## Task 4: Rewrite experience, release, task and planning artifacts

**Files:**
- Modify: `docs/design-system.md`
- Modify: `docs/demo-script.md`
- Modify: `docs/vedi-demo-script.md`
- Modify: `docs/release-manifest.md`
- Modify: `docs/vedi-release-manifest.md`
- Modify: `tasks/TASK-001-ordervoice-mvp.md`
- Modify: `tasks/TASK-002-bus-ticket-agent-demo.md`
- Modify: `docs/superpowers/specs/2026-07-18-ordervoice-design.md`
- Modify: `docs/superpowers/specs/2026-07-18-vedi-bus-ticket-voice-demo-design.md`
- Modify: `docs/superpowers/plans/2026-07-18-ordervoice-mvp.md`
- Modify: `docs/superpowers/plans/2026-07-18-vedi-bus-ticket-agent-demo.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: UI rules, repeatable demo, release truth and current work artifacts.

- [ ] **Step 1: Rewrite design and demo docs**

Document dual passenger/staff surfaces, transcript, booking facts, text/preset fallback, replay/stop, responsive layout, accessibility and reduced motion. Demo sequence: `Sài Gòn đi Đà Lạt, 2 người`; select evening trip; provide name/phone; review summary; say `Tôi xác nhận`; show one booking code; retry confirmation; switch to human mode.

- [ ] **Step 2: Rewrite release manifests**

Map each acceptance criterion to source path and verification command. Separate local evidence, browser evidence, credentialed-pilot evidence and unavailable integrations. State public release supports text/preset plus optional device speech only.

- [ ] **Step 3: Rewrite delivery artifacts**

State deliverables and acceptance criteria for dual workspace, deterministic booking draft, evidence, confirmation, idempotency, human takeover, browser fallback and tests. Rewrite titles/examples/interfaces while retaining tracked paths.

- [ ] **Step 4: Verify Task 4**

Run: `rtk rg -n -i 'ordervoice|đặt món|restaurant|food|menu|cart|dish' docs/design-system.md docs/demo-script.md docs/vedi-demo-script.md docs/release-manifest.md docs/vedi-release-manifest.md tasks docs/superpowers/specs docs/superpowers/plans`

Expected: no output except prohibited-term rules inside documentation rewrite spec/plan.

- [ ] **Step 5: Commit**

```bash
rtk git add docs/design-system.md docs/demo-script.md docs/vedi-demo-script.md docs/release-manifest.md docs/vedi-release-manifest.md tasks docs/superpowers/specs docs/superpowers/plans
rtk git commit -m "docs: update SpeechToInvoice experience artifacts"
```

## Task 5: Verify repository documentation consistency

**Files:**
- Modify: Any Task 1–4 file only when verification finds contradiction, stale term or broken link.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: Coherent, link-valid Markdown documentation.

- [ ] **Step 1: Scan legacy terms**

Run: `rtk rg -n -i 'ordervoice|đặt món|restaurant|food|menu|cart|dish' -g '*.md' -g '!docs/superpowers/specs/2026-07-18-speechtoinvoice-documentation-rewrite-design.md' -g '!docs/superpowers/plans/2026-07-18-speechtoinvoice-documentation-rewrite.md'`

Expected: no output.

- [ ] **Step 2: Scan canonical product and safety terms**

Run: `rtk rg -l 'SpeechToInvoice' -g '*.md'`

Expected: every maintained product document appears.

Run: `rtk rg -l 'xác nhận' README.md specs adrs docs tasks`

Expected: README, product contracts, owning ADRs, demo docs and task docs appear.

- [ ] **Step 3: Check links and whitespace**

Run: `rtk git diff --check`

Expected: no output.

Resolve every repository-relative Markdown link to an existing path; ignore `http://`, `https://`, `mailto:`, fragments and code examples.

- [ ] **Step 4: Review truthfulness**

Compare README, architecture, deployment and release manifests against `apps/web`, `apps/api`, `packages`, `db`, package scripts and deployed-runtime evidence. Downgrade every unsupported claim to `pilot seam`, `target`, or `not verified`.

- [ ] **Step 5: Commit verification fixes**

```bash
rtk git add README.md ORDERVOICE_IMPLEMENTATION_GUIDE.md workflow.md adrs docs specs tasks
rtk git commit -m "docs: verify SpeechToInvoice documentation consistency"
```
