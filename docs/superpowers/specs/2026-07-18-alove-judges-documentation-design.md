# Alove Judges Documentation Package — Design

**Date:** 2026-07-18  
**Status:** Approved  
**Primary input:** `Problem_Brief_VALSEA.docx.md`  
**Product:** Alove — “Alo là có vé”  
**Demo operator:** Nhà xe Mai Anh  
**Target readers:** Hackathon judges, VALSEA reviewers, technical reviewers, product/business reviewers  
**Document language:** Vietnamese; preserve exact English technical identifiers, API names, metrics, and protocol terms

## 1. Goal

Create a judge-ready documentation package that explains Alove as both a product and a technical system. The package must let a judge understand the project in three minutes, evaluate it in ten minutes, and audit its architecture, code, evidence, risks, and pilot path in thirty minutes or more.

The package must be unusually detailed without hiding important facts in prose. It must distinguish verified behavior from implemented-but-unverified integrations, deterministic demo fallbacks, and future target architecture.

## 2. Success criteria

The documentation is successful when:

1. Every mandatory and scored requirement in the VALSEA brief maps to a product decision, architecture element, implementation file, test or runtime evidence, and demo step.
2. A judge can identify the problem, user, workflow, value, differentiator, current proof, and pilot path from the entry document without reading source code.
3. A technical reviewer can reconstruct system context, runtime topology, component boundaries, main data flows, trust boundaries, persistence model, API contracts, failure behavior, and deployment model.
4. VALSEA usage is technically accurate: VALSEA provides STT; Google Chirp3-HD provides preferred TTS; no document implies VALSEA provides TTS.
5. The zero-key browser demo and credentialed LiveKit/VALSEA pilot are described as separate runtime paths.
6. Static deterministic demo catalog behavior and database-backed real-inventory behavior are described as separate booking paths.
7. No integration is called live, production-proven, or benchmarked without matching evidence.
8. Product and business claims use sourced facts, explicit hypotheses, or transparent calculation formulas. Unsupported market-size numbers are excluded.
9. All Mermaid diagrams parse, internal links resolve, headings remain navigable, and no placeholder or contradictory claim remains.
10. Existing user changes remain untouched, including deleted `docs/architecture.md`, deleted `docs/pilot-roadmap.md`, and untracked source brief state.

## 3. Selected approach

Use a two-layer documentation package.

### Layer 1 — Judge entry layer

`README.md` gives reading paths for three, ten, and thirty minutes. `JUDGES_DOSSIER.md` gives a coherent end-to-end project narrative, scorecard, core architecture, evidence summary, and links into deeper documents.

### Layer 2 — Audit layer

Focused documents cover product, workflows, architecture, AI/speech, data/APIs, security, quality, operations, business/pilot, demo, judging traceability, risks, and glossary. Each document owns one subject and links to canonical definitions instead of redefining them inconsistently.

### Rejected alternatives

- One monolithic report: convenient to export, but hard to navigate, review, maintain, and diff.
- Independent documents without entry layer: detailed, but judges lack a clear reading order and must infer the project story.

## 4. Output structure

```text
docs/judges/
├── README.md
├── JUDGES_DOSSIER.md
├── 01-product-vision.md
├── 02-solution-and-workflows.md
├── 03-system-architecture.md
├── 04-ai-speech-architecture.md
├── 05-data-api-and-integrations.md
├── 06-security-privacy-safety.md
├── 07-quality-and-evaluation.md
├── 08-deployment-and-operations.md
├── 09-business-and-pilot-roadmap.md
├── 10-demo-runbook.md
├── 11-judging-rubric-mapping.md
├── 12-risk-register.md
└── 13-traceability-and-glossary.md
```

Markdown is canonical because it is reviewable in GitHub, close to code, easy to link, and renders Mermaid. A DOCX or PDF compilation may be added later as a derived artifact, but it must not become a competing source of truth.

## 5. Reading experience

### Three-minute path

Reader opens `README.md`, then reads executive summary, problem, one-line solution, current proof, differentiator, and judging scorecard in `JUDGES_DOSSIER.md`.

### Ten-minute path

Reader continues through product workflow, architecture overview, AI safety boundary, VALSEA usage, demo sequence, pilot plan, and evidence table.

### Thirty-minute audit path

Reader follows domain-specific links into architecture, AI/speech, data/API, security, evaluation, operations, business, risk, and traceability documents.

Every long document starts with purpose, status scope, key conclusions, and links to related documents. Tables carry compact comparisons and mappings; prose explains reasoning and consequences.

## 6. Claim-status model

Every important claim receives one status label:

| Label | Meaning | Minimum evidence |
|---|---|---|
| `VERIFIED` | Behavior executed or test passed in current repository/runtime | Command output, automated test, deployment evidence, or timestamped live observation |
| `IMPLEMENTED` | Code/config exists, but required external credential or end-to-end environment was unavailable | Exact file/API/config reference plus named missing verification |
| `DEMO` | Deterministic fallback designed for reliable judging | Exact demo path, limitation, and non-production boundary |
| `TARGET` | Proposed pilot or scale architecture | Entry criteria, dependencies, exit criteria, and migration path |

Status labels appear near claims, not in a detached disclaimer. A status summary table in `JUDGES_DOSSIER.md` gives judges a fast truth map.

## 7. Source-of-truth and conflict policy

Use this precedence order:

1. Current problem brief for challenge requirements and judging intent.
2. Latest accepted ADR for explicit architecture decisions.
3. Current implementation for actual behavior and boundaries.
4. Automated tests and current verification commands for evidence.
5. Release manifests for historical runtime observations.
6. Older design documents for rationale and background only.

Known conflicts must be resolved explicitly:

- ADR 0009 supersedes ADR 0008 section 2: VALSEA is primary STT.
- VALSEA is mandatory under current brief even where older integration documentation says otherwise.
- VALSEA does not provide TTS in this repository; Google Chirp3-HD is preferred TTS, Cartesia is fallback.
- `agent.py` code default and `.env.example` configured default differ; documentation must state effective production/pilot configuration, source default, and risk of environment drift.
- Same-browser browser/preset fallback does not prove VALSEA transcription.
- `/engine` and VALSEA adapters prove a separate speech evaluation path; results must be described at their actual verification level.
- Static `@ordervoice/core` demo catalog is not the same as Neon-backed inventory tools.
- Historical OrderVoice ERP files remain in repository but are not current Alove bus-ticket product scope.

When sources still disagree after applying precedence, the package records the discrepancy in risk and traceability documents instead of silently choosing a favorable claim.

## 8. Document responsibilities

### `README.md`

- Project identity and one-line value proposition.
- Three-, ten-, and thirty-minute reading routes.
- Document map by judge question.
- Claim-status legend.
- Quick links to demo, repository entry points, and rubric mapping.

### `JUDGES_DOSSIER.md`

- Executive summary.
- Problem and why-now.
- Product solution and target workflow.
- Current implementation truth map.
- VALSEA role and speech-to-action differentiation.
- Architecture overview.
- Demo evidence and success metrics.
- Product viability, pilot, business model, and scale path.
- Judging scorecard with links to detailed evidence.
- Explicit limitations and next milestones.

### `01-product-vision.md`

- Product thesis and “Alo là có vé” positioning.
- Primary and secondary personas.
- Jobs-to-be-Done, pains, gains, and alternatives.
- User, buyer, operator, and beneficiary distinction.
- Value proposition and product principles.
- Scope, non-goals, differentiation, and defensibility.
- North-star metric, funnel, guardrail metrics, and experiment hypotheses.

### `02-solution-and-workflows.md`

- Existing manual service blueprint.
- Future Alove service blueprint.
- Booking, lookup, cancellation, correction, handoff, and failure journeys.
- State machines for call, trip search, seat hold, and booking.
- Functional and non-functional requirements.
- Edge cases for Vietnamese names, phone numbers, dates, regional accents, code-switching, background noise, and telephony audio.
- Acceptance criteria per workflow.

### `03-system-architecture.md`

- Architecture principles and decisions.
- System context, container, component, and deployment views.
- Repository map and ownership boundaries.
- Zero-key demo runtime versus credentialed pilot runtime.
- Browser fallback, LiveKit agent, Fastify media gateway, Next.js API, domain core, and Neon responsibilities.
- Synchronous and asynchronous flows.
- Scalability, availability, consistency, idempotency, and failure isolation.
- Architectural debt and migration stages.

### `04-ai-speech-architecture.md`

- Speech-to-meaning pipeline from audio to workflow action.
- VALSEA realtime session protocol and normalized audio contract.
- Partial/final transcript handling.
- Voice activity, endpointing, turn detection, interruption, and latency budget.
- LLM role, prompt constraints, tool permissions, deterministic facts, and hallucination controls.
- Google Chirp3-HD TTS and fallback chain.
- Benchmark design against generic ASR using same audio.
- AI failure taxonomy, confidence handling, human handoff, and evaluation plan.

### `05-data-api-and-integrations.md`

- Canonical domain model and entity relationships.
- Static demo data versus operator-provided database inventory.
- API catalog with caller, authentication, request, response, side effects, idempotency, and errors.
- Seat search, atomic hold, confirmation, lookup, cancellation, call audit, dashboard, LiveKit token, and VALSEA gateway flows.
- Data lifecycle, retention, indexing, concurrency, and migration ownership.
- Integration status matrix for VALSEA, LiveKit, Neon, Google TTS, Vercel, SIP trunk providers, OpenAI baseline, and legacy seams.

### `06-security-privacy-safety.md`

- Assets, actors, trust boundaries, and abuse cases.
- STRIDE-style threat model.
- Server-only secrets, token scopes, webhook authentication, dashboard access, and rate-limit requirements.
- PII inventory and data minimization.
- Audio/transcript consent, retention, deletion, masking, and audit policy.
- Prompt injection and tool-abuse defenses.
- Booking safety invariants and incident response.
- Hackathon posture versus pilot hardening gap.

### `07-quality-and-evaluation.md`

- Quality strategy and behavioral test pyramid.
- Test inventory by layer and critical invariant.
- ASR evaluation dataset design and hard-case taxonomy.
- WER/CER, entity accuracy, slot accuracy, task completion, human correction rate, latency, and reliability metrics.
- Manual baseline methodology required by brief.
- Generic-ASR side-by-side methodology.
- Golden scenarios, regression gates, release evidence, and reproducibility.
- Current measured evidence separated from target thresholds.

### `08-deployment-and-operations.md`

- Environment topology for local demo, public web demo, LiveKit pilot, and PSTN pilot.
- Build/deploy responsibilities for Vercel, persistent agent host, LiveKit Cloud, Neon, and media gateway.
- Environment variable ownership and secret rotation.
- Health checks, structured logging, metrics, traces, dashboards, and alerts.
- SLO/SLI proposal and latency budget.
- Capacity model, cost drivers, scaling policy, backup, recovery, rollback, and runbooks.
- Known deployment gaps and production-readiness checklist.

### `09-business-and-pilot-roadmap.md`

- Initial beachhead and customer-selection logic.
- Buyer/user/value-chain analysis.
- Current alternative and competitive categories.
- Business model and pricing hypotheses.
- Bottom-up market-sizing formula without invented inputs.
- Pilot design, success metrics, instrumentation, responsibilities, and exit criteria.
- 48-hour proof, 30-day pilot, 90-day validation, and 12-month scale roadmap.
- Multi-operator and regional expansion path.

### `10-demo-runbook.md`

- Demo objective and required setup.
- Primary credentialed VALSEA path, enabled only after preflight verification.
- Reliable zero-key fallback path.
- Same-audio generic-ASR comparison.
- Stage script with timing, expected UI changes, evidence to point out, and exact recovery actions.
- Failure decision tree, prerecorded fallback policy, preflight, teardown, and judge Q&A bank.
- Forbidden claims and wording.

### `11-judging-rubric-mapping.md`

- General rubric mapping: Problem Relevance, AI-Native Architecture, Technical Execution, Deployment, Feasibility, Startup Potential.
- VALSEA custom mapping: Best Use of VALSEA API and Workflow-Readiness.
- Each row includes claim, implementation, evidence, demo moment, metric, limitation, and next proof.
- Brief minimum-deliverable checklist.

### `12-risk-register.md`

- Product, speech/AI, data, integration, security, legal, operational, commercial, and demo risks.
- Probability, impact, detectability, owner, trigger, prevention, response, residual risk, and status.
- Assumption register and validation plan.
- Explicit architecture inconsistencies and documentation debt.

### `13-traceability-and-glossary.md`

- Requirement IDs derived from brief.
- Requirement-to-design-to-code-to-test-to-demo traceability matrix.
- ADR index and supersession map.
- Repository map.
- Terms, acronyms, state definitions, metric formulas, and status labels.

## 9. Required diagrams

All diagrams use Mermaid and include a short prose interpretation.

1. Stakeholder/system context.
2. C4-style container topology.
3. Component boundaries inside web, agent, core, provider, and persistence layers.
4. Zero-key browser demo sequence.
5. Credentialed LiveKit → VALSEA → LLM tools → booking → Google TTS sequence.
6. Trip search → atomic seat hold → idempotent confirmation sequence.
7. Booking and call state machines.
8. Entity-relationship model.
9. Trust-boundary/data-flow diagram.
10. Deployment topology.
11. Failure/fallback decision tree.
12. Pilot evolution roadmap.

Diagrams must not imply a runtime connection absent from code. Visual style stays monochrome/indigo and information-first; Mermaid source remains accessible in GitHub.

## 10. Product-analysis rules

- Treat travelers as users and bus operators as buyers/operators unless evidence shows a different commercial model.
- Separate customer convenience, operator productivity, conversion, and operational-risk outcomes.
- Use Jobs-to-be-Done language for behavior; use metrics for business value.
- Treat market size, price, and willingness-to-pay as hypotheses unless sourced or measured.
- Prefer bottom-up formulas such as active operators × calls per operator × automation value per call.
- Avoid claiming nationwide scalability solely from one route and one scripted scenario.
- Explain expansion as reusable speech and workflow infrastructure plus operator-specific inventory adapters.

## 11. Technical-analysis rules

- Describe actual repository boundaries and both current booking engines.
- Preserve deterministic authority for prices, departures, seats, totals, and booking codes.
- Describe LLM as language understanding and tool orchestration, not source of operational facts.
- Persist final transcripts and booking events; treat partial transcript as ephemeral.
- Explain idempotency and concurrency separately.
- Call out transaction gaps, configuration drift, missing rate limits, missing full pilot evidence, and other real risks.
- Separate browser Web Speech fallback from VALSEA evidence.
- State exact runtime placement: Vercel for Next.js, long-lived host for agent/media processes, LiveKit for media, Neon for persistence.

## 12. Error and fallback design

Documentation covers errors at four levels:

1. User input: unsupported route, invalid phone, ambiguous date, insufficient seats, correction, cancellation.
2. Speech/AI: mic denied, no final transcript, low accuracy, endpoint delay, tool misuse, TTS failure.
3. Integration: VALSEA unavailable, LiveKit dispatch failure, booking API timeout, database unavailable, SIP failure.
4. Demo/deployment: missing credentials, protected deployment URL, worker unavailable, network loss.

For each major error, documents state detection signal, user-visible behavior, safe fallback, retry/idempotency rule, observability evidence, and escalation owner.

## 13. Verification design

Before delivery:

1. Run repository status and preserve unrelated changes.
2. Run current lint, typecheck, unit/integration tests, E2E tests where environment permits, and production build.
3. Capture command result, date, branch/SHA, and limitations in `07-quality-and-evaluation.md`.
4. Search generated documents for `TODO`, `TBD`, placeholder language, unsupported “live/production/real-time” claims, and outdated provider decisions.
5. Check all internal Markdown links and referenced local paths.
6. Extract Mermaid blocks and validate syntax with available local tooling; if unavailable, perform structural inspection and disclose that automated Mermaid rendering was skipped.
7. Check terminology consistency: Alove, nhà xe Mai Anh, VALSEA, LiveKit, Google Chirp3-HD, browser fallback, booking core, inventory store.
8. Check every brief requirement has a row in traceability and judging matrices.
9. Check every important architecture claim cites an exact repository file, ADR, test, or documented external dependency.
10. Run `git diff --check` and inspect final diff scope.

## 14. Out of scope

- Changing application code, deployment configuration, provider credentials, database data, or production infrastructure.
- Restoring deleted legacy documentation paths.
- Claiming a real phone call, two-device LiveKit call, live Neon persistence, or benchmark result that was not observed during this task.
- Inventing customer interviews, revenue, market size, accuracy, latency, or cost results.
- Replacing current product brand or redesigning application UI.
- Publishing externally, pushing branches, or opening pull requests.

## 15. Delivery acceptance checklist

- All 15 planned Markdown files exist under `docs/judges/`.
- Entry documents provide complete short reading paths.
- Detailed documents cover every responsibility above.
- Status labels and source precedence stay consistent.
- Required Mermaid diagrams exist and match described runtime paths.
- Brief rubric and minimum deliverables have full traceability.
- No placeholders, fabricated metrics, broken local links, or silent contradictions remain.
- Verification results reflect commands run during delivery, not historical manifest claims alone.
- Final Git diff contains only new documentation artifacts and any separately approved documentation metadata.
