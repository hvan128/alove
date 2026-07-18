# Alove Judges Documentation Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete Vietnamese judge dossier that explains Alove’s product value, VALSEA-centered AI architecture, implementation evidence, risks, demo path, and pilot viability with full requirement traceability.

**Architecture:** Use a two-layer Markdown package under `docs/judges/`: concise entry documents for fast judging, then focused audit documents for product, technical, operational, and commercial depth. Treat the problem brief, latest ADRs, current code, and fresh verification output as ordered sources of truth; attach `VERIFIED`, `IMPLEMENTED`, `DEMO`, or `TARGET` status to important claims.

**Tech Stack:** Markdown, Mermaid, GitHub relative links, repository TypeScript/Python source, Vitest, Playwright, Next.js build verification, `rg`, `rtk`, Git.

## Global Constraints

- Write all narrative content in Vietnamese; preserve exact English identifiers for APIs, code symbols, protocol messages, metrics, and provider names.
- Use current product identity `Alove`, customer promise `Alo là có vé`, and demo operator `Nhà xe Mai Anh`.
- Current brief requires VALSEA ASR. ADR 0009 overrides ADR 0008 section 2: pilot STT is VALSEA; preferred TTS is Google Chirp3-HD; Cartesia remains fallback.
- Never imply VALSEA supplies TTS.
- Separate same-browser zero-key fallback from credentialed LiveKit/VALSEA runtime.
- Separate static deterministic `@ordervoice/core` demo catalog from Neon/Drizzle-backed inventory tools.
- Keep prices, trips, seats, totals, and booking codes server-authoritative and deterministic; describe LLM as language understanding and tool orchestration only.
- Persist final transcript/audit events; describe partial transcript as ephemeral.
- Use claim labels exactly: `VERIFIED`, `IMPLEMENTED`, `DEMO`, `TARGET`.
- Never invent market size, customers, interviews, revenue, accuracy, latency, cost, or production evidence. Use sourced facts, measured results, explicit formulas, or labeled hypotheses.
- Use official/primary technical sources. For current laws, platform behavior, market statistics, and provider documentation, verify online during execution and cite direct links near claims.
- Every Mermaid diagram needs prose interpretation and must match current code boundaries.
- Do not modify application code, configuration, deployment state, credentials, existing ADRs, existing product docs, or database data.
- Preserve unrelated worktree state, including `apps/web/next-env.d.ts`, deleted `docs/architecture.md`, deleted `docs/pilot-roadmap.md`, untracked `Problem_Brief_VALSEA.docx.md`, and untracked `portfolio/` unless state changes independently during execution.
- Stage and commit only exact files created by each task.
- Do not publish, push, open a pull request, or mutate external systems.

## File Structure

| File | Responsibility |
|---|---|
| `docs/judges/README.md` | Entry point, reading paths, document map, status legend |
| `docs/judges/JUDGES_DOSSIER.md` | Complete judge-level narrative and evidence summary |
| `docs/judges/01-product-vision.md` | Product thesis, personas, JTBD, value, metrics, differentiation |
| `docs/judges/02-solution-and-workflows.md` | Service blueprints, user journeys, states, requirements, edge cases |
| `docs/judges/03-system-architecture.md` | Context, containers, components, runtime paths, qualities, debt |
| `docs/judges/04-ai-speech-architecture.md` | VALSEA pipeline, LLM/tool boundary, TTS, latency, AI evaluation |
| `docs/judges/05-data-api-and-integrations.md` | Domain/data model, endpoint catalog, concurrency, integrations |
| `docs/judges/06-security-privacy-safety.md` | Trust boundaries, threats, PII, secrets, safety, incident posture |
| `docs/judges/07-quality-and-evaluation.md` | Test evidence, ASR benchmark design, metrics, reproducibility |
| `docs/judges/08-deployment-and-operations.md` | Topologies, environment ownership, observability, SLO, recovery |
| `docs/judges/09-business-and-pilot-roadmap.md` | Beachhead, model, market formula, pilot, milestones, scaling |
| `docs/judges/10-demo-runbook.md` | Primary/fallback demo scripts, preflight, recovery, judge Q&A |
| `docs/judges/11-judging-rubric-mapping.md` | General/custom rubric and minimum-deliverable evidence mapping |
| `docs/judges/12-risk-register.md` | Risk and assumption registers with controls and validation |
| `docs/judges/13-traceability-and-glossary.md` | Brief IDs, code/test/demo traceability, ADR map, glossary |

---

### Task 1: Establish entry layer and canonical project narrative

**Files:**

- Create: `docs/judges/README.md`
- Create: `docs/judges/JUDGES_DOSSIER.md`
- Reference: `Problem_Brief_VALSEA.docx.md`
- Reference: `README.md`
- Reference: `adrs/0007-bus-ticket-web-call-demo.md`
- Reference: `adrs/0009-valsea-stt-google-chirp3-tts.md`
- Reference: `docs/vedi-release-manifest.md`
- Reference: `docs/livekit-bus-pilot.md`
- Reference: `docs/livekit-deployment.md`

**Interfaces:**

- Consumes: approved design spec, problem-brief requirements, current product naming, latest provider decisions, repository status.
- Produces: canonical one-line product definition, claim-status vocabulary, reading order, summary truth table, and cross-document navigation used by every later task.

- [ ] **Step 1: Capture immutable execution context**

Run:

```bash
rtk git status --short
rtk git rev-parse --short HEAD
rtk git branch --show-current
```

Expected: record branch/SHA for later evidence; confirm unrelated dirty paths remain unstaged.

- [ ] **Step 2: Create `README.md` entry point**

Write these exact sections:

```markdown
# Hồ sơ dự án Alove dành cho ban giám khảo
## Alove trong một câu
## Chọn lối đọc
### 3 phút: hiểu giá trị và bằng chứng
### 10 phút: hiểu sản phẩm, AI và pilot
### 30+ phút: audit kỹ thuật và kinh doanh
## Bản đồ tài liệu theo câu hỏi giám khảo
## Chú giải mức độ bằng chứng
## Liên kết nhanh
## Phạm vi và thời điểm chốt tài liệu
```

Populate document map with all 14 companion documents and the judge question each answers. Define all four status labels with evidence thresholds. Link `JUDGES_DOSSIER.md`, rubric mapping, demo runbook, architecture, AI pipeline, and traceability using relative links.

- [ ] **Step 3: Write executive half of `JUDGES_DOSSIER.md`**

Include:

- Executive summary.
- Problem: Vietnamese voice becomes manual typing or flat transcript; bus booking chosen as concrete workflow.
- User/buyer: passenger, call-center operator, bus operator manager.
- Solution: voice request becomes searched trip, held seat, confirmed ticket, and auditable record.
- Why VALSEA: Vietnamese regional speech, code-switching, noisy/telephony conditions from brief.
- Why workflow-ready: output is ticket/booking state, not transcript.
- Current scope: Mai Anh, bus ticketing, current demo route and inventory-pilot distinction.
- Differentiator: VALSEA speech layer + constrained tool use + deterministic operational core + reliable fallback.

- [ ] **Step 4: Write evidence half of `JUDGES_DOSSIER.md`**

Include:

- Truth map with `VERIFIED` / `IMPLEMENTED` / `DEMO` / `TARGET` rows.
- Two-runtime comparison: zero-key same-browser demo versus LiveKit/VALSEA pilot.
- High-level architecture Mermaid diagram.
- Voice-to-action sequence Mermaid diagram.
- Current evidence summary.
- Product, pilot, feasibility, startup, and scale summary.
- Eight judging criteria summary with links.
- Limitations and next proof required.
- “What judges should remember” closing section with three precise points.

- [ ] **Step 5: Validate entry-layer navigation and language**

Run:

```bash
rtk rg -n '^#|\]\(' docs/judges/README.md docs/judges/JUDGES_DOSSIER.md
rtk rg -n 'OrderVoice|VéĐi|Speechmatics làm STT mặc định|VALSEA TTS' docs/judges/README.md docs/judges/JUDGES_DOSSIER.md
rtk git diff --check -- docs/judges/README.md docs/judges/JUDGES_DOSSIER.md
```

Expected: heading/link inventory is complete; legacy names appear only in explicitly labeled historical context; no whitespace errors.

- [ ] **Step 6: Commit entry layer**

```bash
rtk git add docs/judges/README.md docs/judges/JUDGES_DOSSIER.md
rtk git commit -m "docs: add Alove judges dossier entry layer"
```

---

### Task 2: Document product vision and end-to-end workflows

**Files:**

- Create: `docs/judges/01-product-vision.md`
- Create: `docs/judges/02-solution-and-workflows.md`
- Reference: `Problem_Brief_VALSEA.docx.md`
- Reference: `docs/superpowers/specs/2026-07-18-vedi-bus-ticket-voice-demo-design.md`
- Reference: `apps/web/src/app/page.tsx`
- Reference: `apps/web/src/components/bus-call/bus-call-workspace.tsx`
- Reference: `apps/web/src/components/bus-call/call-stage.tsx`
- Reference: `packages/core/src/bus-booking.ts`
- Reference: `agent/agent.py`

**Interfaces:**

- Consumes: canonical product statement and status conventions from Task 1.
- Produces: personas, JTBD, value model, workflow definitions, state semantics, acceptance criteria, and product metrics used by business, risk, rubric, and traceability documents.

- [ ] **Step 1: Write product thesis and stakeholder model**

In `01-product-vision.md`, define:

- Product thesis and positioning.
- Passenger, call-center staff, operations manager, operator owner, and technical administrator personas.
- User/buyer/beneficiary distinction.
- Stakeholder goals, pains, current workarounds, adoption barriers, and evidence status.
- Jobs-to-be-Done for booking, lookup, correction, cancellation, and operator oversight.

- [ ] **Step 2: Write product value and strategy**

Add:

- Problem tree and value tree.
- Value proposition canvas.
- Product principles: Vietnamese-first, keyboard-minimizing, confirm-before-commit, operational truth over fluent speech, graceful fallback.
- Scope and non-goals.
- Alternatives and differentiation categories without unsupported superiority claims.
- Defensibility: workflow data, operator integrations, evaluation corpus, deterministic booking semantics, local-language UX.
- North-star metric: completed valid voice-assisted bookings per active operator per week.
- Funnel, quality, safety, operator, and business metrics with formulas.
- Hypothesis table with signal, test, pass criterion, and decision.

- [ ] **Step 3: Write current and future service blueprints**

In `02-solution-and-workflows.md`, create Mermaid or table blueprints for:

- Current manual hotline process.
- Alove zero-key demo.
- Alove credentialed pilot.
- Frontstage customer/staff actions.
- Backstage speech, agent, booking, inventory, and audit actions.
- Failure points and recovery ownership.

- [ ] **Step 4: Specify six core journeys**

For each journey, include trigger, preconditions, happy path, alternate path, failure behavior, state changes, data written, safety gates, and acceptance criteria:

1. New booking.
2. Unsupported route or unavailable date.
3. Seat shortfall during hold.
4. Passenger correction before confirmation.
5. Lookup by code or phone.
6. Cancellation and seat release.

- [ ] **Step 5: Specify state machines and edge cases**

Add Mermaid state diagrams for call status and booking status. Add a transition table for search, offer, hold, read-back, explicit confirmation, ticket issue, lookup, cancellation, timeout, and handoff. Cover Vietnamese date phrases, names, numbers, phone formats, regional accents, VN/EN code-switching, silence, background noise, duplicate final events, agent interruption, expired hold, database absence, and provider outage.

- [ ] **Step 6: Verify product/workflow consistency**

Run:

```bash
rtk rg -n 'confirmed|trip_proposed|awaiting_confirmation|collecting|pending_payment|cancelled' docs/judges/01-product-vision.md docs/judges/02-solution-and-workflows.md packages/contracts/src/index.ts apps/web/src/lib/db/schema.ts
rtk rg -n '[0-9]+%|triệu|tỷ|khách hàng đã|doanh thu' docs/judges/01-product-vision.md docs/judges/02-solution-and-workflows.md
rtk git diff --check -- docs/judges/01-product-vision.md docs/judges/02-solution-and-workflows.md
```

Expected: state terms match source schemas; every numeric business claim is sourced, calculated, or labeled hypothesis; no whitespace errors.

- [ ] **Step 7: Commit product and workflows**

```bash
rtk git add docs/judges/01-product-vision.md docs/judges/02-solution-and-workflows.md
rtk git commit -m "docs: document Alove product and workflows"
```

---

### Task 3: Document system and AI/speech architecture

**Files:**

- Create: `docs/judges/03-system-architecture.md`
- Create: `docs/judges/04-ai-speech-architecture.md`
- Reference: `adrs/0001-architecture-style.md`
- Reference: `adrs/0002-tech-stack.md`
- Reference: `adrs/0003-contract-first.md`
- Reference: `adrs/0006-realtime-voice-providers.md`
- Reference: `adrs/0007-bus-ticket-web-call-demo.md`
- Reference: `adrs/0008-pstn-via-livekit-sip-and-stt-provider-change.md`
- Reference: `adrs/0009-valsea-stt-google-chirp3-tts.md`
- Reference: `packages/contracts/src/index.ts`
- Reference: `packages/core/src/bus-booking.ts`
- Reference: `packages/providers/src/valsea.ts`
- Reference: `apps/api/src/server.ts`
- Reference: `agent/agent.py`
- Reference: `agent/valsea_stt.py`
- Reference: `agent/turn_rules.py`

**Interfaces:**

- Consumes: workflow/state definitions from Task 2 and canonical claims from Task 1.
- Produces: technical component names, data flows, quality attributes, AI authority boundaries, and latency stages consumed by data, security, quality, operations, risk, and rubric documents.

- [ ] **Step 1: Write architecture principles and context view**

In `03-system-architecture.md`, document:

- Modular monolith plus dedicated realtime/media processes.
- Contract-first boundaries.
- Deterministic operational core.
- Final-only persistence.
- Provider adapters and graceful degradation.
- Truthful evidence labeling.
- System context Mermaid diagram covering passenger, staff, operator, Alove, VALSEA, LiveKit, Google TTS, Neon, Vercel, and SIP provider.

- [ ] **Step 2: Write container and component views**

Add:

- Container Mermaid diagram for Next.js web/API, Python agent, LiveKit Cloud, Fastify gateway, shared packages, and Neon.
- Component diagram showing UI, token endpoint, booking endpoints, booking store, call store, provider adapters, agent tools, and data-channel events.
- Repository tree with responsibility, runtime, dependency direction, and test ownership.
- Interface table for HTTP, WebSocket, LiveKit media, LiveKit data channel, and database boundaries.

- [ ] **Step 3: Document both runtime paths**

Add separate sequence diagrams and truth tables for:

- `DEMO`: same-browser preset/text/browser speech → `advanceBookingAgent` → device speech.
- `IMPLEMENTED`: browser/PSTN → LiveKit → VALSEA STT → LLM tool calls → Next.js booking APIs → Neon → Google TTS → room audio.
- `/engine`: audio file/mic → PCM16 gateway → VALSEA → final transcript → deterministic booking draft, plus same-file OpenAI baseline.
- Legacy Fastify/Twilio/OrderVoice seams, clearly outside current primary product path.

- [ ] **Step 4: Analyze architecture qualities and debt**

Cover availability, latency, consistency, idempotency, concurrency, security, observability, testability, portability, cost, and scalability. Record real debts: split static/database booking paths, source-default environment drift, duplicated schema eras, best-effort audit writes, partially verified LiveKit/VALSEA glue, no complete PSTN evidence, and configuration/documentation inconsistency.

- [ ] **Step 5: Write speech-to-meaning pipeline**

In `04-ai-speech-architecture.md`, document:

- Audio sources and normalization to PCM signed little-endian, mono, 16 kHz.
- VALSEA WebSocket authentication, `session.start`, `session.ready`, raw PCM frames, partial/final events, provider endpointing, and stop behavior.
- Partial transcript UI versus final transcript workflow boundary.
- VAD, Vietnamese rule-based end-of-turn detector, explicit “Tôi nói xong”, interruption settings, and telephony noise cancellation.
- LLM conversation responsibilities and prohibited fact generation.
- Tool schemas and server-authoritative results.
- Google Chirp3-HD TTS path and Cartesia/gateway fallback.

- [ ] **Step 6: Specify AI safety and latency model**

Add:

- Authority matrix: model may interpret/ask/orchestrate; database/core alone may price/allocate/confirm/cancel.
- Hallucination, prompt injection, stale context, duplicate turn, number misrecognition, and provider-failure controls.
- Latency equation: capture + endpointing + final transcript + model TTFT + tool RTT + TTS TTFB + playout.
- Proposed measurement points matching `agent.py` metric logging.
- AI error taxonomy and human handoff criteria.
- Same-audio generic-ASR benchmark design with WER/CER plus entity, slot, and task metrics.

- [ ] **Step 7: Verify provider and boundary accuracy**

Run:

```bash
rtk rg -n 'STT_PROVIDER|VALSEA|GOOGLE_TTS|CARTESIA|session\.ready|transcript\.final|advance_booking|search_trips|hold_seats|confirm_booking' agent packages/providers apps/api docs/judges/03-system-architecture.md docs/judges/04-ai-speech-architecture.md
rtk rg -n 'VALSEA.*TTS|TTS.*VALSEA|Speechmatics.*mặc định' docs/judges/03-system-architecture.md docs/judges/04-ai-speech-architecture.md
rtk git diff --check -- docs/judges/03-system-architecture.md docs/judges/04-ai-speech-architecture.md
```

Expected: source references support provider claims; prohibited provider wording is absent except explicit correction/history; no whitespace errors.

- [ ] **Step 8: Commit architecture documents**

```bash
rtk git add docs/judges/03-system-architecture.md docs/judges/04-ai-speech-architecture.md
rtk git commit -m "docs: explain Alove system and speech architecture"
```

---

### Task 4: Document data, APIs, integrations, security, privacy, and safety

**Files:**

- Create: `docs/judges/05-data-api-and-integrations.md`
- Create: `docs/judges/06-security-privacy-safety.md`
- Reference: `apps/web/src/lib/db/schema.ts`
- Reference: `apps/web/src/lib/db/booking-store.ts`
- Reference: `apps/web/src/lib/db/call-store.ts`
- Reference: `apps/web/src/lib/db/dashboard-store.ts`
- Reference: `apps/web/src/lib/agent-auth.ts`
- Reference: `apps/web/src/lib/dashboard-auth.ts`
- Reference: `apps/web/src/lib/livekit/token.ts`
- Reference: `apps/web/src/app/api/booking/**/route.ts`
- Reference: `apps/web/src/app/api/livekit/**/route.ts`
- Reference: `apps/web/src/app/api/call/events/route.ts`
- Reference: `apps/web/src/app/api/dashboard/calls/**/route.ts`
- Reference: `apps/web/src/app/api/engine/baseline/route.ts`
- Reference: `db/schema.ts`
- Reference: `docs/operator-data-format.md`
- Reference: `.env.example`
- Reference: `agent/.env.example`

**Interfaces:**

- Consumes: component boundaries and authority model from Task 3.
- Produces: canonical entities, API inventory, data lifecycle, integration readiness, threat controls, privacy requirements, and security gaps used by operations, risk, rubric, and traceability.

- [ ] **Step 1: Write canonical data model**

In `05-data-api-and-integrations.md`, define entities, keys, relationships, lifecycle, and ownership for operator, route, trip, seat, hold, booking, payment, call, call turn, booking snapshot, transcript segment, and historical OrderVoice entities. Include an ER Mermaid diagram. Explicitly distinguish current Alove tables under `apps/web/src/lib/db/schema.ts` from historical shared `db/schema.ts` tables.

- [ ] **Step 2: Document inventory concurrency and idempotency**

Explain:

- Route/city normalization and aliases.
- Date-window search and seat availability aggregation.
- Atomic hold using `FOR UPDATE SKIP LOCKED`.
- Hold expiry and same-call re-hold behavior.
- Confirmation idempotency key `callId:tripId`.
- Ticket-code derivation.
- Cancellation and seat release.
- Current transaction gap: confirmation insert, code update, and seat update are separate operations rather than one explicit database transaction.
- Race, retry, and recovery recommendations labeled `TARGET`.

- [ ] **Step 3: Build complete API catalog**

For every current endpoint, list method/path, caller, auth, validation, input, output, side effect, idempotency, errors, evidence status, and source file. Cover:

- `/api/booking/search`
- `/api/booking/hold`
- `/api/booking/confirm`
- `/api/booking/lookup`
- `/api/booking/cancel`
- `/api/booking/advance`
- `/api/livekit/token`
- `/api/livekit/redispatch`
- `/api/call/events`
- `/api/dashboard/calls`
- `/api/dashboard/calls/[callId]`
- `/api/engine/baseline`
- `/api/health`
- Fastify `/ws/media/:conversationId` and `/ws/telephony/:conversationId`
- Relevant historical `/v1/*` endpoints, labeled legacy.

- [ ] **Step 4: Build integration readiness matrix**

For VALSEA, LiveKit, Google TTS, Neon, Vercel, SIP trunk, OpenAI baseline, Twilio direct-media seam, and browser Web Speech, state role, code evidence, credentials, live evidence, known gap, fallback, owner action, and claim label.

- [ ] **Step 5: Write trust model and security posture**

In `06-security-privacy-safety.md`, add:

- Asset/actor inventory.
- Trust-boundary Mermaid diagram.
- STRIDE table covering browser, token endpoint, LiveKit room, agent worker, booking endpoints, dashboard, database, VALSEA, TTS, SIP, and uploaded baseline audio.
- Secret inventory and server-only ownership.
- LiveKit participant grants and observer-token protection.
- Agent bearer-secret boundary.
- Dashboard key boundary.
- Webhook signature validation.
- Missing or weak controls: rate limiting, upload-size limits, replay protection, role-based authorization, audit integrity, transactional confirmation, and retention automation.

- [ ] **Step 6: Specify privacy and AI safety policies**

Cover:

- PII fields and sensitivity.
- Consent notice before audio processing.
- Hackathon synthetic/anonymized data constraints from brief.
- Final transcript and booking retention proposal.
- Raw audio default non-retention.
- Log masking, deletion/export requests, access logging, key rotation, and incident containment.
- Prompt/tool injection controls.
- Explicit confirmation, no payment capture, no invented inventory, and human handoff invariants.
- Hackathon, pilot, and production-control maturity matrix.

- [ ] **Step 7: Verify API/security coverage**

Run:

```bash
rtk rg -n "export async function (GET|POST)|app\.(get|post)\(" apps/web/src/app/api apps/api/src/server.ts
rtk rg -n 'process\.env\.[A-Z0-9_]+' apps/web/src agent packages apps/api | sort -u
rtk rg -n 'rate limit|kích thước|transaction|retention|consent|đồng ý|idempot' docs/judges/05-data-api-and-integrations.md docs/judges/06-security-privacy-safety.md
rtk git diff --check -- docs/judges/05-data-api-and-integrations.md docs/judges/06-security-privacy-safety.md
```

Expected: all active endpoints and secrets have documented ownership; security gaps are stated, not hidden; no whitespace errors.

- [ ] **Step 8: Commit data and security documents**

```bash
rtk git add docs/judges/05-data-api-and-integrations.md docs/judges/06-security-privacy-safety.md
rtk git commit -m "docs: document Alove data APIs and security"
```

---

### Task 5: Capture fresh quality evidence and operational architecture

**Files:**

- Create: `docs/judges/07-quality-and-evaluation.md`
- Create: `docs/judges/08-deployment-and-operations.md`
- Reference: `package.json`
- Reference: `apps/web/e2e/*.spec.ts`
- Reference: `apps/web/src/**/*.test.ts*`
- Reference: `apps/api/test/*.test.ts`
- Reference: `packages/*/test/*.test.ts`
- Reference: `db/test/*.test.ts`
- Reference: `agent/README.md`
- Reference: `agent/Dockerfile`
- Reference: `docs/livekit-deployment.md`
- Reference: `docs/pstn-sip-runbook.md`
- Reference: `docs/vedi-release-manifest.md`

**Interfaces:**

- Consumes: workflow acceptance criteria, architecture qualities, AI metrics, API/security gaps.
- Produces: timestamped verification results, evaluation protocol, deployment topologies, SLO/SLI model, observability plan, recovery procedures, and operational readiness gaps.

- [ ] **Step 1: Inventory current tests before running them**

Run:

```bash
rtk rg --files -g '*test.ts' -g '*test.tsx' -g '*.spec.ts' apps packages db | sort
rtk rg -n 'describe\(|it\(|test\(' apps packages db
```

Expected: produce test-by-layer inventory and map tests to booking, audio, VALSEA, API, UI, dashboard, design, and E2E behaviors.

- [ ] **Step 2: Run static and unit/integration gates**

Run sequentially:

```bash
rtk pnpm lint
rtk pnpm -r --if-present typecheck
rtk pnpm test
```

Expected: each command exits zero. If any command fails, record exact failing workspace/test and timestamp in quality document; do not change application code within this documentation task.

- [ ] **Step 3: Run browser and production-build gates**

Run sequentially:

```bash
rtk pnpm test:e2e
rtk pnpm build
```

Expected: commands exit zero when environment supports Chromium and build dependencies. Record exact result, duration if available, skipped prerequisites, and failure output when nonzero.

- [ ] **Step 4: Write verification and evaluation document**

In `07-quality-and-evaluation.md`, include:

- Verification metadata: date/timezone, branch, SHA, dirty-scope caveat, runtime versions.
- Literal PASS/FAIL/SKIPPED summary from Steps 2–3.
- Behavioral test pyramid and test-to-invariant table.
- Current proof versus historical release-manifest proof.
- VALSEA hard-case evaluation dataset design: Northern/Central/Southern accent, VN/EN code-switch, bus-domain entities, background noise, and 8 kHz telephony.
- Ground-truth annotation protocol.
- Metrics and formulas: WER, CER, entity F1, slot exact match, workflow completion, correction rate, false-confirm rate, end-to-end latency, availability.
- Same-audio VALSEA versus generic-ASR experiment.
- Manual baseline time study matching brief.
- Sample-size and statistical-reporting rules.
- Target thresholds labeled `TARGET`; current measurements only when observed.

- [ ] **Step 5: Write deployment topology by maturity stage**

In `08-deployment-and-operations.md`, document four topologies with Mermaid diagrams or one layered diagram:

1. Local zero-key demo.
2. Public Vercel browser demo.
3. LiveKit/VALSEA web-call pilot.
4. LiveKit SIP/PSTN pilot.

For each, state deployed components, credentials, network flows, state stores, external dependencies, health signal, failure behavior, and claim label.

- [ ] **Step 6: Specify observability, SLOs, capacity, and recovery**

Add:

- Structured log keys already present and missing.
- Metrics for EOU, transcription delay, TTFT, TTS TTFB, tool RTT, database latency, seat-hold conflicts, booking completion, and provider errors.
- Proposed SLIs/SLOs with explicit target status.
- Alert thresholds as pilot hypotheses.
- Capacity model per concurrent call.
- Cost equation by media minute, STT minute, LLM tokens, TTS characters/audio, LiveKit usage, compute, and database.
- Backup, restore, worker restart, provider failover, deployment rollback, and incident workflow.
- RTO/RPO proposals.
- Readiness checklist and ownership matrix.

- [ ] **Step 7: Verify evidence wording**

Run:

```bash
rtk rg -n 'PASS|FAIL|SKIPPED|VERIFIED|IMPLEMENTED|DEMO|TARGET' docs/judges/07-quality-and-evaluation.md docs/judges/08-deployment-and-operations.md
rtk rg -n '100%|99\.9|< ?[0-9]|> ?[0-9]|ms|giây|phút' docs/judges/07-quality-and-evaluation.md docs/judges/08-deployment-and-operations.md
rtk git diff --check -- docs/judges/07-quality-and-evaluation.md docs/judges/08-deployment-and-operations.md
```

Expected: every threshold is measured/sourced or labeled target; command outcomes match current run; no whitespace errors.

- [ ] **Step 8: Commit quality and operations documents**

```bash
rtk git add docs/judges/07-quality-and-evaluation.md docs/judges/08-deployment-and-operations.md
rtk git commit -m "docs: add Alove quality and operations evidence"
```

---

### Task 6: Document business case, pilot roadmap, and stage demo

**Files:**

- Create: `docs/judges/09-business-and-pilot-roadmap.md`
- Create: `docs/judges/10-demo-runbook.md`
- Reference: `Problem_Brief_VALSEA.docx.md`
- Reference: `docs/vedi-demo-script.md`
- Reference: `docs/pstn-sip-runbook.md`
- Reference: `docs/operator-data-format.md`
- Reference: `apps/web/src/app/page.tsx`
- Reference: `apps/web/src/components/engine/engine-workspace.tsx`
- Reference: current official Vietnamese transport statistics and legal sources discovered during execution
- Reference: current official VALSEA, LiveKit, Vercel, Neon, Google Cloud, and SIP provider documentation discovered during execution

**Interfaces:**

- Consumes: product metrics, workflows, architecture truth map, evaluation protocol, operational gaps.
- Produces: commercial hypotheses, pilot contract, roadmap, demonstration script, fallback tree, and judge-response material used by rubric and risk documents.

- [ ] **Step 1: Verify current external facts with primary sources**

Research only facts used in documents:

- Vietnam passenger-transport/operator context from government/statistical sources.
- Current Vietnamese personal-data/privacy obligations relevant to a pilot.
- VALSEA documented capabilities and endpoint behavior.
- LiveKit agent/SIP/deployment responsibilities.
- Vercel runtime placement relevant to Next.js versus long-lived worker.
- Neon/Google TTS operational facts used in pilot plan.

Record direct source links, publication/update dates when available, access date `2026-07-18`, and exact claim supported. Do not use search-result pages as citations.

- [ ] **Step 2: Write business model and beachhead logic**

In `09-business-and-pilot-roadmap.md`, define:

- Beachhead: Vietnamese intercity bus operators with high phone/Zalo booking volume and structured trip inventory.
- Buyer, user, economic beneficiary, and implementation partner.
- Problem-cost equation.
- Value levers: handling time, missed-call recovery, conversion, booking error reduction, after-hours coverage, and auditability.
- Competitive categories: human hotline, web/app booking, generic ASR/chatbot, call-center software, and vertical voice agent.
- Differentiation and limitations.
- SaaS/platform pricing hypotheses with unit basis; no asserted willingness-to-pay.
- Bottom-up TAM/SAM/SOM formulas with named input sources or blank-free symbolic variables.
- Unit economics equation and sensitivity variables.

- [ ] **Step 3: Write pilot design and roadmap**

Add:

- Pilot objective, scope, users, route/operator data, channels, sample size logic, instrumentation, privacy prerequisites, responsibilities, go/no-go criteria, and exit report.
- 48-hour proof scope.
- 30-day single-operator pilot.
- 90-day paid validation.
- 12-month multi-operator platform roadmap.
- Entry/exit criteria per phase.
- Build/buy/partner decisions.
- Regional expansion logic tied to VALSEA Southeast Asian language coverage, labeled target.

- [ ] **Step 4: Write primary and fallback demo scripts**

In `10-demo-runbook.md`, create:

- Demo objective and three messages judges must retain.
- Equipment, credentials, browser, audio, network, and data preflight.
- Primary credentialed path: `/engine` or LiveKit/VALSEA path only after successful preflight.
- Same-audio generic-ASR comparison.
- Workflow output proof: transcript updates booking/ticket, not text-only.
- Reliable zero-key fallback: preset/text → deterministic booking → ticket result.
- 90-second core script and five-minute deep script.
- Exact expected visible states and facts.
- Presenter narration separated from customer utterance.
- Recovery action per failure signal.
- Forbidden wording for unverified integrations.

- [ ] **Step 5: Add judge Q&A bank and demo evidence checklist**

Cover at least:

- Why bus ticketing?
- Why VALSEA instead of generic ASR?
- Where AI is used?
- How hallucination is prevented?
- What is live versus demo?
- What happens when provider/database fails?
- How seats avoid double booking?
- What data is stored?
- How pilot success is measured?
- Who pays and why?
- How system scales across operators/languages?
- Biggest current risk?

Each answer links to detailed document and states evidence status.

- [ ] **Step 6: Verify citations and unsupported commercial claims**

Run:

```bash
rtk rg -n 'https?://|Nguồn|Truy cập' docs/judges/09-business-and-pilot-roadmap.md docs/judges/10-demo-runbook.md
rtk rg -n '[0-9]+%|triệu|tỷ|USD|VND|₫|thị phần|doanh thu|tiết kiệm' docs/judges/09-business-and-pilot-roadmap.md docs/judges/10-demo-runbook.md
rtk git diff --check -- docs/judges/09-business-and-pilot-roadmap.md docs/judges/10-demo-runbook.md
```

Expected: external factual and numeric claims have direct support or explicit hypothesis/formula labels; no whitespace errors.

- [ ] **Step 7: Commit business and demo documents**

```bash
rtk git add docs/judges/09-business-and-pilot-roadmap.md docs/judges/10-demo-runbook.md
rtk git commit -m "docs: add Alove pilot business case and demo runbook"
```

---

### Task 7: Build judging, risk, and traceability audit layer

**Files:**

- Create: `docs/judges/11-judging-rubric-mapping.md`
- Create: `docs/judges/12-risk-register.md`
- Create: `docs/judges/13-traceability-and-glossary.md`
- Reference: all files created in Tasks 1–6
- Reference: `Problem_Brief_VALSEA.docx.md`
- Reference: `adrs/*.md`
- Reference: current implementation and test files cited by prior tasks

**Interfaces:**

- Consumes: all canonical claims, requirements, components, evidence, metrics, gaps, and roadmap steps.
- Produces: final score-oriented evidence matrix, risk/assumption controls, requirement traceability, ADR supersession map, repository map, and shared glossary.

- [ ] **Step 1: Assign requirement IDs from brief**

Create stable IDs in `13-traceability-and-glossary.md`:

- `BR-CQ-*` for core challenge.
- `BR-SC-*` for success criteria.
- `BR-MD-*` for minimum deliverables.
- `BR-API-*` for VALSEA/API requirements.
- `BR-LANG-*` for language/local context.
- `BR-PERF-*` for performance/infrastructure.
- `BR-JUDGE-*` for general and custom judging criteria.
- `BR-ANTI-*` for anti-pattern exclusions.

Quote only short requirement phrases; paraphrase full source text and link to source brief path.

- [ ] **Step 2: Build full traceability matrix**

Every requirement row must include: ID, paraphrased requirement, priority, product response, architecture response, exact code path, exact test/evidence path, demo step, claim status, gap, and next verification. No requirement may have an empty response; when unsupported, use explicit `GAP` and planned proof.

- [ ] **Step 3: Build ADR and repository audit maps**

Add:

- ADR 0001–0009 purpose/status/consequence table.
- Supersession chain showing ADR 0009 overriding ADR 0008 section 2, and ADR 0008 partially overriding ADR 0006 telephony/provider choices.
- Repository tree with current, pilot, and legacy labels.
- Canonical glossary for ASR, STT, TTS, VAD, EOU, WER, CER, TTFT, TTFB, PSTN, SIP, SFU, PII, idempotency, hold, booking, and claim labels.
- Metric formula appendix.

- [ ] **Step 4: Build general and custom judging matrix**

In `11-judging-rubric-mapping.md`, create rows for:

- Problem Relevance 20%.
- AI-Native Architecture 20%.
- Technical Execution 15%.
- Deployment 15%.
- Feasibility 15%.
- Startup Potential 15%.
- Best Use of VALSEA API 15% custom.
- Workflow-Readiness 15% custom.

Each row includes judge question, concise answer, implementation, evidence, metric, demo moment, limitation, next proof, and linked deep document. Explain that custom 30% is additional track scoring as stated by brief, without silently normalizing weights.

- [ ] **Step 5: Map minimum deliverables and quality tiers**

Add:

- Demoable prototype.
- Public repository requirement status.
- Explainable AI architecture.
- Pilot/deployment roadmap.
- Basic/good/outstanding brief tiers for language, accuracy, deployment, local context, and scalability.
- Current status and evidence needed to reach next tier.

- [ ] **Step 6: Build risk register**

In `12-risk-register.md`, create at least 30 concrete risks across product, speech/AI, booking/data, integrations, security/privacy, operations, legal/compliance, business, and demo. Each row includes ID, description, cause, probability, impact, detectability, leading signal, prevention, response, owner role, residual risk, claim status, and validation date/trigger.

Mandatory risks:

- VALSEA/LiveKit glue not fully credential-tested.
- `agent.py` provider default drift.
- Static and database booking paths diverge.
- Partial/final transcript confusion.
- Vietnamese number/name/date misrecognition.
- LLM tool misuse or invented fact.
- Seat hold expiry and confirmation transaction gap.
- Duplicate confirmation/cancellation race.
- Missing rate limiting and upload-size limits.
- PII/audio consent and retention gap.
- Worker outage and silent-room dispatch.
- STT quota/concurrency exhaustion.
- 8 kHz PSTN accuracy unknown.
- Demo network/credential failure.
- Market willingness-to-pay unvalidated.
- Operator inventory quality and onboarding burden.

- [ ] **Step 7: Build assumption register and validation sequencing**

For each product, technical, operational, and commercial assumption, state evidence today, falsification test, minimum sample, decision threshold, owner role, deadline phase, and consequence if false. Order validation by risk × uncertainty × cost of being wrong.

- [ ] **Step 8: Verify complete traceability**

Run:

```bash
rtk rg -n '^\| BR-' docs/judges/13-traceability-and-glossary.md
rtk rg -n 'Problem Relevance|AI-Native Architecture|Technical Execution|Deployment|Feasibility|Startup Potential|Best Use of VALSEA API|Workflow-Readiness' docs/judges/11-judging-rubric-mapping.md
rtk rg -n '^\| R-[0-9]+' docs/judges/12-risk-register.md
rtk git diff --check -- docs/judges/11-judging-rubric-mapping.md docs/judges/12-risk-register.md docs/judges/13-traceability-and-glossary.md
```

Expected: all eight judging criteria appear; traceability contains every brief group; risk register contains at least 30 identified rows; no whitespace errors.

- [ ] **Step 9: Commit audit layer**

```bash
rtk git add docs/judges/11-judging-rubric-mapping.md docs/judges/12-risk-register.md docs/judges/13-traceability-and-glossary.md
rtk git commit -m "docs: add Alove judging risk and traceability audit"
```

---

### Task 8: Perform cross-document verification and final consolidation

**Files:**

- Modify: `docs/judges/README.md`
- Modify: `docs/judges/JUDGES_DOSSIER.md`
- Modify: `docs/judges/01-product-vision.md`
- Modify: `docs/judges/02-solution-and-workflows.md`
- Modify: `docs/judges/03-system-architecture.md`
- Modify: `docs/judges/04-ai-speech-architecture.md`
- Modify: `docs/judges/05-data-api-and-integrations.md`
- Modify: `docs/judges/06-security-privacy-safety.md`
- Modify: `docs/judges/07-quality-and-evaluation.md`
- Modify: `docs/judges/08-deployment-and-operations.md`
- Modify: `docs/judges/09-business-and-pilot-roadmap.md`
- Modify: `docs/judges/10-demo-runbook.md`
- Modify: `docs/judges/11-judging-rubric-mapping.md`
- Modify: `docs/judges/12-risk-register.md`
- Modify: `docs/judges/13-traceability-and-glossary.md`

**Interfaces:**

- Consumes: complete package from Tasks 1–7.
- Produces: internally consistent, navigable, verified final package with accurate evidence timestamp and clean Git scope.

- [ ] **Step 1: Verify exact file set and minimum structural depth**

Run:

```bash
rtk rg --files docs/judges | sort
rtk wc -l docs/judges/*.md
rtk rg -n '^# ' docs/judges/*.md
```

Expected: exactly 15 Markdown files; every file has one H1; all planned documents contain substantive content.

- [ ] **Step 2: Scan placeholders, stale decisions, and unsupported claims**

Run:

```bash
rtk rg -n 'FIXME|PLACEHOLDER|lorem ipsum|điền sau|bổ sung sau|chưa viết' docs/judges
rtk rg -n 'VALSEA.*TTS|TTS.*VALSEA|Speechmatics.*STT chính|OpenAI.*STT chính' docs/judges
rtk rg -n '\b(live|production|thật|đã xác minh|đã triển khai)\b' docs/judges
```

Expected: placeholder scan returns no matches; stale provider scan returns only explicit historical/correction context; every strong runtime claim has nearby evidence status.

- [ ] **Step 3: Verify internal local links**

Run a read-only link audit that extracts Markdown targets beginning with `./`, `../`, or repository-relative paths, resolves them from each source file, and reports missing targets. Expected: zero missing local targets. Fix links with `apply_patch` only.

- [ ] **Step 4: Verify Mermaid blocks**

Extract every fenced `mermaid` block to a temporary directory created with `mktemp -d`. If local Mermaid CLI exists, render every block. Otherwise use a temporary `pnpm dlx @mermaid-js/mermaid-cli` run without adding repository dependencies. Expected: all blocks render; if environment prevents rendering, structurally inspect graph type, balanced delimiters, node IDs, and arrows, then record skipped automated render in verification notes.

- [ ] **Step 5: Cross-check status labels and terminology**

Run:

```bash
rtk rg -o '`(VERIFIED|IMPLEMENTED|DEMO|TARGET)`' docs/judges | sort | uniq -c
rtk rg -n 'Alove|Alo là có vé|Nhà xe Mai Anh|VALSEA|Google Chirp3-HD|LiveKit|Neon' docs/judges/README.md docs/judges/JUDGES_DOSSIER.md
```

Expected: four labels are used consistently; canonical identity/provider terms appear in entry documents.

- [ ] **Step 6: Re-run repository quality gates after documentation changes**

Run sequentially:

```bash
rtk pnpm lint
rtk pnpm -r --if-present typecheck
rtk pnpm test
rtk pnpm test:e2e
rtk pnpm build
```

Expected: results match or improve Task 5 evidence. Update `07-quality-and-evaluation.md` only when final results differ.

- [ ] **Step 7: Self-review against approved design spec**

Check each design-spec responsibility and diagram requirement against an exact document/section. Check all 15 delivery acceptance conditions. Fix contradictions, duplicate definitions, ambiguous status wording, missing source links, and orphan sections inline.

- [ ] **Step 8: Inspect final Git scope**

Run:

```bash
rtk git diff --check
rtk git status --short
rtk git diff --stat HEAD~7..HEAD
```

Expected: generated documentation changes are confined to `docs/judges/`; pre-existing unrelated changes remain unstaged and unmodified.

- [ ] **Step 9: Commit final QA corrections**

```bash
rtk git add docs/judges
rtk git commit -m "docs: verify Alove judges documentation package"
```

- [ ] **Step 10: Final handoff**

Report:

- Entry document path.
- Full dossier path.
- Architecture, rubric, demo, and traceability quick links.
- Fresh verification summary.
- Explicit unverified integrations and highest residual risks.
- Commit range created by execution.
- Preserved unrelated worktree changes.

## Self-Review Result

- Spec coverage: all 15 output files, 12 required diagram categories, four claim labels, product/technical/business/security/operations depth, traceability, and verification gates have owning tasks.
- Placeholder scan: plan contains concrete file paths, section requirements, commands, expected outcomes, and commit boundaries.
- Type/name consistency: product, provider, runtime, endpoint, state, metric, and status names match approved design and current repository symbols.
- Scope: documentation-only; application code, external deployments, credentials, and user worktree changes remain out of scope.
