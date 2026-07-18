# Judge and Customer Documentation Pack Design

**Status:** Approved  
**Date:** 2026-07-18  
**Decision owner:** Product team  
**Product:** SpeechToInvoice / VéĐi  
**Primary language:** Vietnamese, with established technical terms retained in English  

## 1. Objective

Create a focused enterprise-quality documentation pack that supports two evaluation modes:

1. a five-minute live hackathon demonstration;
2. a deeper technical and commercial review by judges and prospective bus-operator customers.

The pack must explain product value, features, current evidence, architecture, adoption, security, operations, cost, return assumptions and implementation roadmap without overstating unverified integrations.

## 2. Audiences

| Audience | Main questions | Reading time |
|---|---|---|
| Hackathon judge | What problem is solved, what is different, what can be demonstrated now? | 5 minutes |
| Technical judge | How do voice, Agent, booking safety, data and fallbacks work? | 15–30 minutes |
| Bus operator/customer | How would this improve operations, what does adoption require, what will it cost? | 10–20 minutes |
| Engineering reviewer | Which capabilities are implemented, where is evidence, what remains? | 30+ minutes |
| Security/operations reviewer | What data is processed, what controls exist, how is failure handled? | 15–30 minutes |

## 3. Scope

### 3.1 Included

- repository landing page and navigation;
- executive product brief;
- five-minute demo playbook;
- capability and evidence matrix;
- customer adoption guide;
- business case, cost model and implementation roadmap;
- technical architecture;
- trust, security and operations summary;
- compatibility links from older documentation paths;
- official pricing research and citations;
- documentation verification.

### 3.2 Excluded

- changing application runtime behavior;
- implementing missing product features;
- deploying LiveKit, VALSEA, Neon or telephony;
- purchasing provider plans;
- producing a slide deck or PDF in this scope;
- deleting ADRs, specs, task documents or technical runbooks;
- claiming payment, real inventory, seat hold, PSTN, SMS/Zalo delivery or autonomous confirmation.

## 4. Considered approaches

### 4.1 One combined dossier

One long file would contain pitch, demo, product, architecture, cost and roadmap.

Advantages:

- easy to send or export;
- one entry point.

Rejected because:

- too long for a five-minute review;
- mixes executive and technical detail;
- repeated edits create merge and consistency risk;
- difficult for customers to reuse operational sections.

### 4.2 Layered canonical documentation pack — selected

Use a small set of audience-oriented canonical files. README routes readers to the correct depth. Existing specialized documents remain appendices or compatibility pointers.

Advantages:

- fast judge path and deep-review path coexist;
- each fact has one owner;
- customers can reuse adoption, cost and trust documents;
- technical evidence remains traceable;
- easier maintenance.

Trade-off:

- requires strict ownership rules and link verification.

### 4.3 Audience-specific folders

Separate judges, customers and engineering folders.

Rejected because:

- product facts, feature status and cost assumptions would be duplicated;
- maintenance burden is too high for current team size;
- file paths would become less stable.

## 5. Canonical document set

| File | Purpose | Primary audience |
|---|---|---|
| README.md | Repository gateway and 60-second orientation | Everyone |
| docs/product-brief.md | Executive product narrative and value proposition | Judges, customers |
| docs/demo-playbook.md | Five-minute demonstration and fallback procedure | Presenters, judges |
| docs/capabilities-and-evidence.md | Feature status and proof map | Judges, engineering |
| docs/adoption-guide.md | Customer onboarding and operating workflow | Customers |
| docs/business-case-and-roadmap.md | Cost, ROI assumptions and phased delivery | Customers, judges |
| docs/architecture.md | Deep system design and technical boundaries | Technical reviewers |
| docs/trust-and-operations.md | Security, privacy, deployment and incident summary | Customers, reviewers |

## 6. Reading paths

### 6.1 Five-minute judge path

~~~text
README
  -> product brief
  -> demo playbook
~~~

Expected outcome: judge understands problem, differentiator, live flow, proof and limitations before or during demo.

### 6.2 Deep judge path

~~~text
README
  -> product brief
  -> capabilities and evidence
  -> architecture
  -> business case and roadmap
  -> trust and operations
~~~

Expected outcome: judge can trace claims to code/tests and evaluate feasibility.

### 6.3 Customer path

~~~text
product brief
  -> adoption guide
  -> business case and roadmap
  -> trust and operations
~~~

Expected outcome: customer understands operational change, pilot requirements, cost range and risk.

### 6.4 Engineering path

~~~text
architecture
  -> capabilities and evidence
  -> trust and operations
  -> existing ADR/spec/runbook appendices
~~~

## 7. Content contract

### 7.1 README.md

Must contain:

- one-sentence product definition;
- problem and outcome;
- current demo status;
- live URL and safe-use warning;
- main routes;
- quick start;
- short architecture summary;
- canonical documentation map;
- verified versus target label.

Must not contain:

- detailed provider prices;
- full feature matrix;
- long architecture diagrams;
- unsupported production claims.

### 7.2 docs/product-brief.md

Must contain:

- executive summary;
- 60-second pitch;
- customer problem;
- target users and jobs;
- end-to-end workflow;
- value proposition;
- differentiators;
- current delivery profiles;
- measurable pilot outcomes;
- honest scope boundary;
- next reading links.

The brief must work outside a hackathon context. It must not use judge-only language as its main framing.

### 7.3 docs/demo-playbook.md

Must contain:

- five-minute timeline by minute;
- preparation checklist;
- exact routes/session;
- presenter actions and suggested narration;
- expected UI result for each step;
- Human and Auto authority explanation;
- field evidence and confirmation moment;
- fallback for microphone, LiveKit, VALSEA, LLM/TTS and persistence;
- truthful status phrases;
- likely judge questions and concise answers;
- post-demo verification checklist.

The existing docs/demo-script.md remains a compatibility pointer or short summary to this canonical playbook.

### 7.4 docs/capabilities-and-evidence.md

Must contain:

- status legend: Verified, Code-ready, Roadmap, Out of scope;
- full target feature list;
- current implementation status;
- business value;
- code path;
- test/evidence path;
- deployment/runtime evidence;
- missing work and next proof;
- challenge requirement mapping;
- release truth and source SHA policy.

No feature receives Verified status from adapter code alone.

### 7.5 docs/adoption-guide.md

Must contain:

- intended customer profile;
- passenger, staff, dispatcher/admin and support roles;
- before/after operating workflow;
- pilot onboarding prerequisites;
- environment and credential ownership;
- sample-data and consent rules;
- daily staff workflow;
- escalation and takeover procedure;
- catalog/data preparation;
- training plan;
- pilot KPIs;
- support and responsibility model;
- go-live checklist;
- customer-facing limitations.

### 7.6 docs/business-case-and-roadmap.md

Must contain:

- executive commercial summary;
- three usage scenarios;
- pricing assumptions and access date;
- fixed, variable and one-time costs;
- provider-by-provider calculation;
- USD and VND values;
- exchange-rate source/date;
- quote-required markers;
- sensitivity and contingency;
- implementation staffing assumptions;
- ROI formula and non-guaranteed range;
- roadmap P0 through P3;
- dependencies, risks, exit criteria and rollback per phase;
- feature availability by phase.

### 7.7 docs/architecture.md

The existing enterprise architecture remains the technical canonical source. Changes in this documentation project are limited to:

- adding top-level navigation to executive, evidence, cost and trust documents;
- correcting any contradiction found during cross-review;
- retaining C4, runtime, protocol, state, data, security, scaling and governance depth.

Architecture must not become a pitch or duplicate the demo playbook.

### 7.8 docs/trust-and-operations.md

Must contain:

- trust summary;
- data inventory and PII classification;
- audio consent and no-default-recording policy;
- participant/session/token boundary;
- secret ownership;
- current controls versus pilot-required controls;
- retention and deletion expectations;
- deployment topology;
- observability and audit;
- degraded modes;
- incident categories;
- rollback triggers;
- customer/shared responsibility matrix;
- links to detailed security, deployment and operations appendices.

## 8. Source ownership and compatibility

### 8.1 Canonical ownership

| Fact type | Canonical owner |
|---|---|
| Product narrative | product-brief.md |
| Demonstration procedure | demo-playbook.md |
| Feature status and proof | capabilities-and-evidence.md |
| Customer onboarding | adoption-guide.md |
| Pricing, ROI and roadmap | business-case-and-roadmap.md |
| Technical design | architecture.md |
| Security/operations summary | trust-and-operations.md |
| Detailed API/domain contract | specs and ADRs |
| Detailed deployment/runbook procedure | existing deployment/security/operations documents |

### 8.2 Existing document treatment

- docs/demo-script.md: compatibility pointer plus short current-demo summary.
- docs/vedi-demo-script.md: pointer to docs/demo-playbook.md.
- docs/current-vs-target-architecture.md: technical appendix linked by capabilities-and-evidence.md.
- docs/integration-test-status.md: runtime evidence appendix.
- docs/vedi-release-manifest.md: release evidence appendix.
- docs/pilot-roadmap.md: compatibility pointer to business-case-and-roadmap.md while retaining gate details if still useful.
- docs/security-and-privacy.md, docs/deployment.md and docs/operations-runbook.md: detailed appendices linked by trust-and-operations.md.
- ADRs/specs/tasks/superpowers plans: preserved.

No maintained path is deleted in this project.

## 9. Cost model

### 9.1 Usage scenarios

| Scenario | Calls | Average duration | Monthly minutes |
|---|---:|---:|---:|
| Demo | 100 calls/month | 5 minutes | 500 |
| Pilot | 100 calls/day × 30 days | 5 minutes | 15,000 |
| Production | 1,000 calls/day × 30 days | 5 minutes | 150,000 |

### 9.2 Cost categories

- Vercel web/BFF;
- LiveKit rooms and media;
- VALSEA STT and TTS;
- OpenAI Auto replies and transcript translation;
- Neon Postgres;
- monitoring, domain and backup;
- separately deployed worker compute when not covered by provider;
- one-time engineering, QA, security and operations effort;
- 15–20 percent contingency.

### 9.3 Pricing rules

- Browse official provider pricing or official documentation at implementation time.
- Record access date and direct source link.
- Prefer public list price; identify plan and included allowance.
- Mark non-public pricing as Quote required.
- Do not infer a VALSEA rate from unrelated providers.
- Separate fixed monthly, usage-based and one-time costs.
- Show formulas so readers can replace traffic assumptions.
- Convert USD to VND using a dated authoritative exchange-rate source.
- Keep provider taxes, discounts and negotiated enterprise rates outside base estimates unless documented.
- Do not expose credentials, account invoices or private commercial terms.

### 9.4 ROI rules

ROI is an estimate, not a guarantee. Model:

- current staff handling time;
- calls per month;
- loaded staff cost;
- percentage of turns handled by Agent;
- percentage of calls requiring takeover;
- infrastructure and support costs;
- implementation amortization.

Show low/base/high sensitivity and break-even formula. Do not claim headcount reduction without customer-owned operating data.

## 10. Roadmap

### 10.1 P0 — Demonstration readiness

Scope:

- canonical documentation pack;
- local no-key demo;
- deterministic booking/evidence/confirmation flow;
- fallback and release evidence.

Exit:

- five-minute playbook passes;
- links and claims verified;
- public demo warning visible;
- no unsupported live-provider claim.

### 10.2 P1 — Credentialed pilot

Scope:

- LiveKit two-device transport;
- VALSEA STT/TTS;
- Neon persistence;
- staff authentication and signed caller invite;
- consent;
- server-authoritative booking command;
- atomic confirmation/idempotency.

Exit:

- credentialed smoke with consented Vietnamese audio;
- authorization negative tests;
- reconnect and provider-failure fallback;
- one booking for exact retry;
- redacted logs and retention policy.

### 10.3 P2 — Operator operations

Scope:

- incoming queue;
- staff assignment;
- dashboard;
- catalog management;
- observability;
- retention automation;
- operational support process.

Exit:

- multi-session operational pilot;
- role/access audit;
- catalog publish workflow;
- measurable pilot KPIs;
- incident drill.

### 10.4 P3 — Production expansion

Scope:

- real inventory/seat hold;
- telephony where justified;
- delivery/payment as separate integrations;
- SLO, disaster recovery and security hardening.

Exit:

- provider contracts;
- reconciliation tests;
- load/resilience evidence;
- customer go-live approval;
- rollback and disaster-recovery evidence.

Every phase documents duration and team assumptions during implementation. Dates are estimates, not commitments.

## 11. Failure and uncertainty handling

| Situation | Documentation behavior |
|---|---|
| Public price unavailable | Quote required; no invented number |
| Price changes | Keep access date, formula and plan name |
| Provider adapter exists but no credentialed smoke | Code-ready |
| Target design exists without implementation | Roadmap |
| Claim lacks source/test/deployment evidence | Downgrade or remove |
| Runtime documents disagree | Source/test/newest ADR wins |
| Integration fails | Describe safe fallback and current limitation |
| Cost depends on customer data | Show formula and sensitivity |
| Existing path conflicts with new canonical file | Preserve path and add compatibility link |

## 12. Verification strategy

### 12.1 Content verification

- every canonical document has executive summary and next-reading links;
- current, code-ready and target capabilities remain distinct;
- feature claims link to source/test/deployment evidence;
- cost figures link to official sources and show calculation;
- roadmap phases contain scope, dependencies, risks and exit criteria;
- no unresolved marker or unsupported success claim;
- product naming is consistent.

### 12.2 Repository verification

- resolve every relative Markdown link;
- scan legacy and contradictory terms;
- scan secrets and realistic PII samples;
- run git diff --check;
- run TypeScript test suite;
- run Python tests when uv/dev dependencies are available;
- record any environment limitation rather than masking it;
- inspect git diff and stage only intended documentation.

### 12.3 Acceptance criteria

- README routes each audience in two clicks or fewer.
- A judge can follow one five-minute playbook without reading technical appendices.
- Product brief explains problem, value, workflow and differentiation without implementation jargon.
- Every main feature has status, evidence and missing work.
- Customer guide covers onboarding, roles, daily use, training, support and go-live.
- Business case includes Demo, Pilot and Production calculations with official citations or Quote required labels.
- Roadmap covers P0–P3 with dependencies, risks, exit criteria and rollback.
- Architecture remains current and linked.
- Trust document states current controls and pilot blockers without implying compliance certification.
- Existing documentation paths continue to resolve.
- No credentialed capability is promoted without runtime evidence.

## 13. Implementation sequence

1. Research official pricing, exchange rate and current repository evidence.
2. Rewrite README and create product brief.
3. Create demo playbook and compatibility pointers.
4. Create capabilities and evidence map.
5. Create adoption guide.
6. Create business case and roadmap.
7. Create trust and operations summary.
8. Add architecture navigation and fix contradictions only.
9. Update legacy pointers and documentation map.
10. Verify links, claims, calculations, secrets, tests and diff.

## 14. Risks

| Risk | Mitigation |
|---|---|
| Documentation becomes marketing-heavy | Require evidence status and source link |
| Pricing becomes stale | Access date, formulas, plan names, Quote required |
| Same fact diverges across files | Canonical ownership table |
| Customer mistakes demo code for real ticket | Repeat explicit scope boundary |
| Existing links break | Preserve paths and automated link check |
| Architecture rewrite is overwritten | Treat existing uncommitted architecture as protected input |
| Unrelated portfolio work is staged | Stage exact documentation paths only |

## 15. Completion definition

Work is complete when all eight canonical files satisfy their content contracts, legacy links resolve, pricing and cost math are sourced, claims match code/runtime evidence, verification passes or limitations are explicitly recorded, and only intended documentation changes remain staged or committed.
