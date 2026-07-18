# Judge and Customer Documentation Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build a concise five-minute judge path and a deep customer/technical documentation path covering product value, demonstration, features, evidence, adoption, cost, ROI, roadmap, architecture, trust and operations.

**Architecture:** Use a layered canonical documentation pack. README routes readers to focused files; each fact type has one canonical owner; existing documents remain appendices or compatibility pointers. Pricing uses official current sources and explicit formulas, while implementation status follows code, tests, release evidence and newest ADRs.

**Tech Stack:** Markdown, Mermaid, Git, ripgrep through RTK, Node.js link-check one-liners, official provider pricing/documentation, pnpm/Vitest verification.

## Global Constraints

- Primary language: Vietnamese; retain established English technical terms where clearer.
- Product identity: SpeechToInvoice is technical product name; VéĐi is current UI brand.
- Judge path must work in five minutes.
- Customer path must cover adoption, cost, ROI, roadmap, trust and operations.
- Status vocabulary: Verified, Code-ready, Roadmap, Out of scope.
- No credentialed capability becomes Verified from adapter code or fixtures alone.
- No payment, real inventory/seat hold, PSTN/SIP, SMS/Zalo delivery or autonomous confirmation claim.
- Current public demo remains same-browser local fallback unless credentialed evidence proves otherwise.
- Every price includes plan/unit, access date, direct official source and calculation.
- Non-public provider pricing is written as Cần báo giá.
- Cost scenarios: Demo 100 calls/month, Pilot 100 calls/day, Production 1,000 calls/day; 5 minutes/call.
- Cost output includes USD and VND, dated exchange-rate source, fixed/variable/one-time costs and 15–20 percent contingency.
- Existing Markdown paths are preserved.
- Existing uncommitted changes are user-owned/protected. Re-read each file immediately before editing and patch only intended sections.
- Task 1 baseline is authoritative: any path already dirty before execution is protected and must not be edited or staged by this plan.
- Before every git add, rerun git status --short; skip any path changed concurrently outside the active task and report it in handoff.
- Do not stage portfolio, unrelated specs, architecture work not created by this plan, or other concurrent changes.
- Use apply_patch for all file edits.
- Use RTK prefix for shell commands.
- Do not install global Python or Node tooling merely to verify Markdown.

---

## File map

| Action | File | Responsibility |
|---|---|---|
| Modify | README.md | Repository gateway and 60-second orientation |
| Create | docs/product-brief.md | Executive narrative, value and pilot outcomes |
| Create | docs/demo-playbook.md | Five-minute demonstration procedure |
| Create | docs/capabilities-and-evidence.md | Feature status and proof map |
| Create | docs/adoption-guide.md | Customer onboarding and daily operating model |
| Create | docs/business-case-and-roadmap.md | Costs, ROI assumptions and P0–P3 roadmap |
| Read/protect | docs/architecture.md | Existing enterprise architecture linked by new docs |
| Create | docs/trust-and-operations.md | Security, privacy, deployment and incident summary |
| Modify | docs/demo-script.md | Compatibility pointer and short summary |
| Modify | docs/vedi-demo-script.md | Compatibility pointer |
| Read/protect | docs/current-vs-target-architecture.md | Existing deep feature-status appendix |
| Modify narrowly | docs/pilot-roadmap.md | Link to canonical business case and preserve gate detail |
| Modify narrowly | docs/integration-test-status.md | Link to canonical evidence map; refresh only verified facts |
| Modify narrowly | docs/vedi-release-manifest.md | Refresh source SHA/deployment facts only when verified |

## Source-of-truth map

| Question | Sources |
|---|---|
| Product purpose and target features | specs/product-vision.md, specs/features.md |
| Current architecture | docs/architecture.md, ADR 0001–0008, source code |
| Current feature status | docs/current-vs-target-architecture.md, tests, source code |
| Runtime evidence | docs/integration-test-status.md, docs/vedi-release-manifest.md |
| Security/data controls | docs/security-and-privacy.md, docs/data-model.md |
| Deployment/operations | docs/deployment.md, docs/operations-runbook.md, docs/livekit-valsea-deployment.md |
| Demo flow | docs/demo-script.md, apps/web routes/components, component/E2E tests |
| Pricing | Official Vercel, LiveKit, VALSEA, OpenAI, Neon and exchange-rate sources accessed during Task 6 |

---

### Task 1: Protect current work and establish documentation baseline

**Files:**
- Read: all canonical and source-of-truth files listed above
- Modify: none

**Interfaces:**
- Consumes: approved design spec at docs/superpowers/specs/2026-07-18-judge-customer-documentation-pack-design.md
- Produces: verified baseline notes used by Tasks 2–8

- [ ] **Step 1: Record repository state**

Run:

~~~bash
rtk git branch --show-current
rtk git status --short
rtk git log -5 --oneline --decorate
~~~

Expected:

- current branch and HEAD recorded;
- every modified/untracked path identified;
- no existing user change staged or reverted.

- [ ] **Step 2: Read current canonical inputs**

Run:

~~~bash
rtk sed -n '1,220p' README.md
rtk sed -n '1,240p' specs/product-vision.md
rtk sed -n '1,260p' specs/features.md
rtk sed -n '1,220p' docs/demo-script.md
rtk sed -n '1,240p' docs/integration-test-status.md
rtk sed -n '1,260p' docs/vedi-release-manifest.md
~~~

Expected:

- current product identity, target features, demo flow and evidence boundaries understood;
- no file changed.

- [ ] **Step 3: Verify core claims directly from source**

Run:

~~~bash
rtk rg -n "REQUIRED_FIELDS|applyBookingMessage|confirmBooking|createBusDemoCatalog" packages/core/src/bus-booking.ts
rtk rg -n "roomEventSchema|transcript.partial|transcript.final|staff.preferences|booking.snapshot" packages/contracts/src/index.ts
rtk rg -n "ttl: 1_200|RoomAgentDispatch|caller-|staff-" apps/web/src/lib/livekit/server.ts
rtk rg -n "record=False|VALSEA_API_KEY|StopResponse|store=False" agent
rtk rg -n "DATABASE_URL|transcript.partial|duplicate|bookingAuditEvents" apps/web/src/lib/db/session-repository.ts
~~~

Expected:

- evidence for final-only extraction, Human default, token scope, no recording and persistence boundary found;
- unsupported claims removed from later documents rather than inferred.

- [ ] **Step 4: Capture existing documentation inventory**

Run:

~~~bash
rtk rg --files -g '*.md' -g '!portfolio/**'
rtk wc -l README.md docs/*.md specs/*.md
~~~

Expected:

- maintained paths known;
- duplicate/compatibility files identified;
- no deletion planned.

---

### Task 2: Rewrite repository gateway and create product brief

**Files:**
- Modify: README.md
- Create: docs/product-brief.md

**Interfaces:**
- Consumes: product vision, verified current runtime profile, live URL/release evidence
- Produces: product narrative and navigation used by every later document

- [ ] **Step 1: Rewrite README opening and product truth**

Use this section order:

~~~markdown
# VéĐi — AI Voice Agent đặt vé xe

## Sản phẩm trong 60 giây
## Vấn đề
## Giải pháp
## Demo hiện tại
## Chạy local
## Kiến trúc tóm tắt
## Bộ tài liệu
## Trạng thái và giới hạn
## Verification
~~~

Required content:

- one-sentence definition;
- /staff and /call routes;
- public live URL only if current release evidence supports it;
- local two-tab constraint;
- text/preset guaranteed path;
- Human default and explicit staff confirmation;
- Verified/Code-ready/Roadmap distinction;
- safe-use warning against real passenger data on public session-code demo;
- links to all seven docs files.

- [ ] **Step 2: Create product brief executive sections**

Create docs/product-brief.md with:

~~~markdown
# VéĐi Product Brief

## Tóm tắt điều hành
## Pitch 60 giây
## Bài toán của nhà xe
## Người dùng và công việc cần hoàn thành
## Hành trình từ cuộc gọi đến booking
## Giá trị mang lại
## Điểm khác biệt
## Delivery profiles
## KPI cho pilot
## Phạm vi và giới hạn
## Bước tiếp theo
~~~

Required differentiators:

- staff-first authority;
- VALSEA-first credentialed voice path;
- final-only evidence-backed field filling;
- deterministic catalog and confirmation gate;
- Human takeover and safe fallback;
- provider-neutral boundaries.

- [ ] **Step 3: Add measurable pilot KPI definitions**

Include formulas/definitions, without inventing achieved values:

| KPI | Definition |
|---|---|
| Critical Field Accuracy | Correct critical fields divided by reviewed critical fields |
| Booking Completion Rate | Sessions reaching valid confirmation divided by eligible sessions |
| Average Handle Time | Time from staff acceptance to end/confirmation |
| Agent Assist Rate | Turns handled or suggested by Agent divided by total eligible turns |
| Takeover Rate | Sessions requiring Human takeover divided by Agent-delegated sessions |
| First Final Latency | Audio start to first final VALSEA transcript |
| Cost per Completed Booking | Monthly operating cost divided by completed valid bookings |

State that baseline/target values are customer-approved pilot inputs, not current demo results.

- [ ] **Step 4: Verify README and product brief**

Run:

~~~bash
rtk rg -n "Sản phẩm trong 60 giây|Demo hiện tại|Bộ tài liệu|Trạng thái và giới hạn" README.md
rtk rg -n "Pitch 60 giây|Giá trị mang lại|Delivery profiles|KPI cho pilot|Phạm vi và giới hạn" docs/product-brief.md
rtk rg -n -i "đặt món|restaurant|real inventory live|production-ready" README.md docs/product-brief.md
rtk git diff --check -- README.md docs/product-brief.md
~~~

Expected:

- required headings found;
- prohibited stale/unsupported claims absent;
- whitespace check clean.

- [ ] **Step 5: Commit gateway and product brief**

Run:

~~~bash
rtk git add README.md docs/product-brief.md
rtk git diff --cached --name-only
rtk git commit -m "docs: add product brief and reader gateway"
~~~

Expected staged paths: README.md and docs/product-brief.md only.

---

### Task 3: Create five-minute demo playbook and compatibility links

**Files:**
- Create: docs/demo-playbook.md
- Modify: docs/demo-script.md
- Modify: docs/vedi-demo-script.md

**Interfaces:**
- Consumes: README terminology, current /staff and /call behavior, integration status
- Produces: canonical demonstration sequence linked by judges and presenters

- [ ] **Step 1: Write preparation and truth-status sections**

Create docs/demo-playbook.md with:

~~~markdown
# VéĐi Demo Playbook

## Mục tiêu demo
## Chọn runtime profile
## Chuẩn bị trước giờ trình bày
## Timeline 5 phút
## Expected evidence
## Fallback matrix
## Câu hỏi phản biện
## Checklist sau demo
~~~

Preparation must include:

- /staff?session=DEMO42 and /call?session=DEMO42;
- same-browser requirement for local mode;
- two-device requirement only when LiveKit/worker credentials are verified;
- sample-data-only warning;
- text/preset fallback;
- clean session and browser permissions;
- visible integration status before claims.

- [ ] **Step 2: Write exact five-minute timeline**

Use this timeline:

| Time | Presenter action | Evidence to point out |
|---|---|---|
| 0:00–0:30 | Problem and one-sentence solution | Staff-first value |
| 0:30–1:00 | Open /staff and /call | Two-sided workspace |
| 1:00–2:00 | Send route/date/passenger request | Final transcript and field evidence |
| 2:00–3:00 | Provide name/phone/pickup/dropoff | Incremental filling and validation |
| 3:00–3:40 | Show suggestion, Human/Auto authority and takeover | Agent control |
| 3:40–4:20 | Review summary and confirm | Confirmation gate and one demo code |
| 4:20–4:40 | Repeat confirmation | Stable code/no second demo code |
| 4:40–5:00 | State current limits and roadmap | Trustworthy close |

Use synthetic details:

- Sài Gòn to Đà Lạt;
- 2 passengers;
- 24/07 at 22:00;
- Nguyễn Minh Anh;
- 0909 123 456;
- Ngã tư Hàng Xanh;
- Chợ Đà Lạt.

- [ ] **Step 3: Add fallback matrix and judge Q&A**

Fallback rows:

- microphone denied;
- browser speech unsupported;
- LiveKit not configured;
- worker not ready;
- VALSEA not ready;
- LLM/TTS unavailable;
- Neon unavailable;
- duplicate confirmation.

Each row states visible symptom, safe action, permitted claim and prohibited claim.

Q&A must answer:

- Why not let LLM confirm booking?
- Why separate worker from Vercel?
- What is actually live today?
- Where does VALSEA run?
- What prevents fabricated fares/seats?
- What happens when provider fails?
- How much does deployment cost?
- How does customer reach production?

- [ ] **Step 4: Convert old demo files to compatibility entry points**

docs/demo-script.md retains a short current-demo summary and links to docs/demo-playbook.md.

docs/vedi-demo-script.md states that docs/demo-playbook.md is canonical.

Do not duplicate full timeline in compatibility files.

- [ ] **Step 5: Verify demo documents**

Run:

~~~bash
rtk rg -n "0:00|5:00|Fallback matrix|Câu hỏi phản biện|Stable code" docs/demo-playbook.md
rtk rg -n "demo-playbook.md" docs/demo-script.md docs/vedi-demo-script.md
rtk git diff --check -- docs/demo-playbook.md docs/demo-script.md docs/vedi-demo-script.md
~~~

Expected:

- complete timeline and fallback sections found;
- both old paths link to canonical playbook;
- whitespace check clean.

- [ ] **Step 6: Commit demo documentation**

Run:

~~~bash
rtk git add docs/demo-playbook.md docs/demo-script.md docs/vedi-demo-script.md
rtk git diff --cached --name-only
rtk git commit -m "docs: add five-minute demo playbook"
~~~

Expected staged paths: three demo documents only.

---

### Task 4: Create capability and evidence map

**Files:**
- Create: docs/capabilities-and-evidence.md
- Read/protect: docs/current-vs-target-architecture.md
- Modify narrowly: docs/integration-test-status.md
- Modify narrowly: docs/vedi-release-manifest.md

**Interfaces:**
- Consumes: specs/features.md F-01–F-17, source/tests, current runtime evidence
- Produces: canonical feature status used by product brief, roadmap and judge review

- [ ] **Step 1: Re-read concurrent changes before editing**

Run:

~~~bash
rtk git status --short
rtk sed -n '1,260p' docs/current-vs-target-architecture.md
rtk sed -n '1,220p' docs/integration-test-status.md
rtk sed -n '1,220p' docs/vedi-release-manifest.md
rtk sed -n '1,260p' specs/features.md
~~~

Expected:

- current user edits preserved;
- status/source facts refreshed from latest content;
- no blind replacement.

- [ ] **Step 2: Create status legend and evidence policy**

Create docs/capabilities-and-evidence.md with:

~~~markdown
# Capabilities and Evidence

## Tóm tắt
## Cách đọc trạng thái
## Feature matrix
## Challenge requirement mapping
## Runtime and provider evidence
## Quality evidence
## Known gaps
## Promotion rules
## Evidence appendix links
~~~

Status definitions:

- Verified: current local/runtime behavior has test or deployment evidence;
- Code-ready: implementation/fixture/schema exists but credentialed runtime proof is missing;
- Roadmap: designed or specified but not implemented;
- Out of scope: deliberately excluded.

- [ ] **Step 3: Build F-01–F-17 matrix**

Each row includes:

| Field | Required value |
|---|---|
| ID/name | Exact F-01 through F-17 name |
| Customer value | One sentence |
| Status | One approved status |
| Current behavior | What code does now |
| Source | Exact repository path |
| Test/evidence | Exact test, deployment or document path |
| Missing proof/work | Concrete next gate |
| Roadmap phase | P0, P1, P2 or P3 |

Status anchors:

- local two-tab, transcript UI, deterministic field filling, field evidence, suggestion, confirmation gate and fallback: Verified only for current local scope;
- LiveKit/VALSEA/Neon: Code-ready until credentialed smoke;
- incoming queue, staff assignment, enterprise dashboard and catalog management: Roadmap;
- payment, real inventory/seat hold, PSTN production and delivery: Out of scope until separately approved.

- [ ] **Step 4: Add challenge and quality evidence**

Map:

- Vietnamese voice requirement;
- difficult audio/code-switch requirement;
- staff dashboard;
- auto-fill;
- Agent delegation;
- evidence and safety;
- demo/deployment deliverables.

Quality evidence includes:

- TypeScript lint/typecheck/test/build commands;
- Python pytest/ruff commands;
- E2E commands;
- source SHA/deployment ID policy;
- current environment limitations.

- [ ] **Step 5: Add narrow canonical links to clean existing appendices**

Patch only introductions of files that were clean at baseline:

- integration-test-status.md links to it for capability interpretation;
- vedi-release-manifest.md links to it for feature status.

Do not edit docs/current-vs-target-architecture.md. Link to that protected appendix from docs/capabilities-and-evidence.md.

Update source SHA/deployment ID only if verified by fresh git/deployment evidence. Otherwise preserve existing values and label historical baseline.

- [ ] **Step 6: Verify feature coverage**

Run:

~~~bash
rtk rg -n "F-01|F-02|F-03|F-04|F-05|F-06|F-07|F-08|F-09|F-10|F-11|F-12|F-13|F-14|F-15|F-16|F-17" docs/capabilities-and-evidence.md
rtk rg -n "Verified|Code-ready|Roadmap|Out of scope" docs/capabilities-and-evidence.md
rtk rg -n "current-vs-target-architecture.md" docs/capabilities-and-evidence.md
rtk rg -n "capabilities-and-evidence.md" docs/integration-test-status.md docs/vedi-release-manifest.md
rtk git diff --check -- docs/capabilities-and-evidence.md docs/integration-test-status.md docs/vedi-release-manifest.md
~~~

Expected:

- all 17 feature IDs present;
- all four statuses defined;
- appendix links found;
- whitespace check clean.

- [ ] **Step 7: Commit capability evidence**

Run:

~~~bash
rtk git add docs/capabilities-and-evidence.md docs/integration-test-status.md docs/vedi-release-manifest.md
rtk git diff --cached --name-only
rtk git commit -m "docs: map capabilities to implementation evidence"
~~~

Expected staged paths: three evidence documents only.

---

### Task 5: Create customer adoption guide

**Files:**
- Create: docs/adoption-guide.md

**Interfaces:**
- Consumes: product brief, capability status, security/deployment boundaries
- Produces: customer onboarding and operating assumptions used by business case

- [ ] **Step 1: Create adoption guide structure**

Use:

~~~markdown
# VéĐi Adoption Guide

## Tóm tắt
## Phù hợp với ai
## Trạng thái có thể triển khai
## Vai trò và trách nhiệm
## Quy trình hiện tại và quy trình với VéĐi
## Chuẩn bị pilot
## Onboarding theo tuần
## Quy trình hằng ngày
## Human, Auto và takeover
## Chuẩn bị catalog và dữ liệu
## Đào tạo
## KPI và review pilot
## Support và escalation
## Go-live checklist
## Giới hạn hiện tại
~~~

- [ ] **Step 2: Define role and responsibility matrix**

Include:

- passenger;
- customer-care staff;
- dispatcher/supervisor;
- bus-operator admin;
- product support;
- security/data owner;
- engineering/provider owner.

For each: allowed actions, customer responsibility, product/team responsibility and escalation path.

- [ ] **Step 3: Define pilot prerequisites**

Required:

- use case and route scope;
- synthetic/consented sample calls;
- LiveKit/VALSEA/Neon credentials owned by approved runtime;
- staff identity/authorization design;
- consent copy;
- retention period and deletion owner;
- catalog version;
- staff roster/training;
- success KPI and sample size;
- fallback owner;
- incident contact;
- release and rollback approval.

- [ ] **Step 4: Define onboarding sequence**

Use:

| Week | Outcome |
|---|---|
| Week 0 | Discovery, data/privacy review, KPI agreement |
| Week 1 | Environment, credentials, sample catalog, staff roles |
| Week 2 | Credentialed technical smoke and fallback validation |
| Week 3 | Staff training and shadow-mode calls |
| Week 4 | Limited pilot, daily review, go/no-go |

State that dates depend on P1 gaps and provider/customer readiness.

- [ ] **Step 5: Verify adoption guide**

Run:

~~~bash
rtk rg -n "Vai trò và trách nhiệm|Chuẩn bị pilot|Onboarding theo tuần|Đào tạo|KPI|Go-live checklist|Giới hạn hiện tại" docs/adoption-guide.md
rtk rg -n "consent|retention|fallback|rollback|owner" docs/adoption-guide.md
rtk git diff --check -- docs/adoption-guide.md
~~~

Expected:

- all onboarding/control sections found;
- whitespace check clean.

- [ ] **Step 6: Commit adoption guide**

Run:

~~~bash
rtk git add docs/adoption-guide.md
rtk git diff --cached --name-only
rtk git commit -m "docs: add customer adoption guide"
~~~

Expected staged path: docs/adoption-guide.md only.

---

### Task 6: Research pricing and create business case and roadmap

**Files:**
- Create: docs/business-case-and-roadmap.md
- Modify narrowly: docs/pilot-roadmap.md

**Interfaces:**
- Consumes: official current pricing, approved usage scenarios, capability gaps, adoption assumptions
- Produces: commercial estimate and phased delivery source used by customers/judges

- [ ] **Step 1: Research official pricing sources**

Browse current official pages only:

- Vercel pricing/documentation on vercel.com;
- LiveKit Cloud pricing/documentation on livekit.io;
- VALSEA pricing or official sales/docs on valsea.ai;
- OpenAI API pricing on openai.com;
- Neon pricing/documentation on neon.tech;
- State Bank of Vietnam or another authoritative Vietnamese banking source for USD/VND reference.

For each provider record:

- source title;
- direct URL;
- access date 2026-07-18;
- plan;
- included allowance;
- billable unit;
- public price;
- tax/discount exclusion;
- Quote required when no public rate exists.

Expected:

- no search-result URL used as citation;
- no blog/aggregator used for core pricing;
- no private account or credential accessed.

- [ ] **Step 2: Calculate approved traffic scenarios**

Use:

~~~text
Demo:
100 calls/month × 5 minutes = 500 call-minutes/month

Pilot:
100 calls/day × 30 days × 5 minutes = 15,000 call-minutes/month

Production:
1,000 calls/day × 30 days × 5 minutes = 150,000 call-minutes/month
~~~

For provider-specific billing:

- apply participant-minute or connection-minute multipliers only as official LiveKit billing defines;
- split STT input minutes and TTS output/characters only as VALSEA publishes;
- estimate OpenAI tokens from stated conversation assumptions and show low/base/high sensitivity;
- use fixed monthly tier plus overage where provider pricing requires;
- keep worker hosting separate if LiveKit plan does not include it.

- [ ] **Step 3: Create business case document**

Use:

~~~markdown
# Business Case and Roadmap

## Tóm tắt điều hành
## Giả định
## Kịch bản lưu lượng
## Mô hình chi phí
## Chi phí theo provider
## Tổng chi phí theo kịch bản
## Chi phí triển khai một lần
## Chi phí trên mỗi cuộc gọi/booking
## ROI và điểm hòa vốn
## Phân tích độ nhạy
## Roadmap P0–P3
## Team và timeline
## Risk, dependency và rollback
## Cách cập nhật bảng giá
## Nguồn
~~~

- [ ] **Step 4: Add monthly cost tables**

Every scenario table includes:

| Column |
|---|
| Component |
| Pricing unit |
| Usage assumption |
| Included allowance |
| Estimated subtotal USD |
| Estimated subtotal VND |
| Confidence |
| Source |

Confidence values:

- Published;
- Formula-based;
- Quote required;
- Customer input required.

Add subtotal, 15 percent contingency and 20 percent contingency. Never turn Quote required into zero total; show known-cost subtotal and incomplete-total warning.

- [ ] **Step 5: Add implementation cost and ROI model**

Team assumption:

- 2 full-stack/AI engineers;
- 0.5 QA/automation;
- 0.25 DevOps/security;
- product/customer owner from operator;
- phase duration ranges in Step 6.

Implementation cost formula:

~~~text
phase cost =
sum(role allocation × person-month rate × phase months)
+ external setup
+ contingency
~~~

If public Vietnam role-rate benchmarks are not authoritative enough, label person-month rate as Customer input required and provide sample planning assumptions explicitly as non-market quotes.

ROI formula:

~~~text
monthly gross benefit =
(baseline handle minutes - assisted handle minutes)
× eligible monthly calls
× loaded staff cost per minute

monthly net benefit =
monthly gross benefit - monthly operating cost

break-even months =
one-time implementation cost / monthly net benefit
~~~

Show low/base/high sensitivity. Do not claim guaranteed savings or layoffs.

- [ ] **Step 6: Add P0–P3 roadmap**

Use estimated ranges:

| Phase | Duration assumption | Main output |
|---|---|---|
| P0 | 1–2 weeks | Demo/evidence/documentation readiness |
| P1 | 4–6 weeks | Credentialed pilot and booking safety |
| P2 | 6–10 weeks | Operator queue/dashboard/catalog/observability |
| P3 | 8–16 weeks after P2 | Inventory/telephony/SLO/DR expansion |

For each phase include:

- scope;
- dependencies;
- team;
- cost formula;
- risks;
- exit criteria;
- rollback;
- capability not claimed.

- [ ] **Step 7: Add compatibility link to pilot roadmap**

Patch docs/pilot-roadmap.md introduction to link docs/business-case-and-roadmap.md as canonical commercial roadmap. Preserve technical promotion gates.

- [ ] **Step 8: Verify pricing math and citations**

Run:

~~~bash
rtk rg -n "500|15,000|150,000|15%|20%|Quote required|Customer input required" docs/business-case-and-roadmap.md
rtk rg -n "https://.*vercel|https://.*livekit|https://.*valsea|https://.*openai|https://.*neon" docs/business-case-and-roadmap.md
rtk rg -n "P0|P1|P2|P3|exit criteria|rollback" docs/business-case-and-roadmap.md
rtk rg -n "business-case-and-roadmap.md" docs/pilot-roadmap.md
rtk git diff --check -- docs/business-case-and-roadmap.md docs/pilot-roadmap.md
~~~

Expected:

- all scenarios, confidence markers and phases found;
- official provider URLs present;
- roadmap compatibility link found;
- whitespace check clean.

- [ ] **Step 9: Commit business case and roadmap**

Run:

~~~bash
rtk git add docs/business-case-and-roadmap.md docs/pilot-roadmap.md
rtk git diff --cached --name-only
rtk git commit -m "docs: add cost model and implementation roadmap"
~~~

Expected staged paths: business case and pilot roadmap only.

---

### Task 7: Create trust and operations summary

**Files:**
- Create: docs/trust-and-operations.md
- Read: docs/security-and-privacy.md
- Read: docs/deployment.md
- Read: docs/operations-runbook.md
- Read: docs/data-model.md

**Interfaces:**
- Consumes: current architecture controls, pilot blockers and detailed runbooks
- Produces: customer-facing trust/shared-responsibility summary

- [ ] **Step 1: Re-read security and operations source**

Run:

~~~bash
rtk sed -n '1,260p' docs/security-and-privacy.md
rtk sed -n '1,240p' docs/deployment.md
rtk sed -n '1,240p' docs/operations-runbook.md
rtk sed -n '1,260p' docs/data-model.md
~~~

Expected:

- current controls and target-only controls separated;
- concurrent changes preserved.

- [ ] **Step 2: Create trust summary structure**

Use:

~~~markdown
# Trust and Operations

## Tóm tắt
## Current trust boundary
## Data inventory
## Vai trò và quyền
## Consent và audio
## Secrets và tokens
## Retention và deletion
## Deployment topology
## Monitoring và audit
## Degraded modes
## Incident và escalation
## Rollback
## Shared responsibility
## Pilot blockers
## Detailed appendices
~~~

- [ ] **Step 3: Build current-versus-required control matrix**

Include:

| Control | Current | Required before real passenger pilot | Evidence |
|---|---|---|---|
| Staff authentication | Missing | Required |
| Signed caller invite | Missing | Required |
| Room-scoped short token | Implemented/code-tested | Credentialed negative test |
| Provider secret isolation | Implemented in design/source | Deployment review |
| Raw audio recording | Off by default | Consent before any recording |
| Partial persistence | Disabled | Retain |
| Final transcript retention | Schema exists, automation missing | Approved schedule/job |
| Confirmation transaction | Target only | Required |
| Correlation/monitoring | Partial | Required |
| Incident/rollback procedure | Documented | Exercise evidence |

- [ ] **Step 4: Add shared responsibility and incident matrix**

Shared responsibility rows:

- identity and staff access;
- sample/real passenger consent;
- provider accounts;
- catalog accuracy;
- retention approval;
- application security;
- worker availability;
- monitoring;
- incident notification;
- deletion requests.

Incident matrix rows:

- microphone;
- LiveKit;
- VALSEA;
- LLM/TTS;
- database;
- duplicate confirmation;
- leaked credential;
- PII exposure.

Each states safe state, fallback, recovery signal and owner.

- [ ] **Step 5: Link detailed appendices**

Link:

- security-and-privacy.md;
- deployment.md;
- operations-runbook.md;
- data-model.md;
- architecture.md;
- livekit-valsea-deployment.md.

Do not duplicate full procedures.

- [ ] **Step 6: Verify trust document**

Run:

~~~bash
rtk rg -n "Current trust boundary|Data inventory|Consent|Retention|Shared responsibility|Pilot blockers" docs/trust-and-operations.md
rtk rg -n "staff authentication|signed caller|confirmation transaction|recording|partial" docs/trust-and-operations.md
rtk rg -n "security-and-privacy.md|deployment.md|operations-runbook.md|data-model.md|architecture.md" docs/trust-and-operations.md
rtk git diff --check -- docs/trust-and-operations.md
~~~

Expected:

- trust sections and appendix links found;
- current/pilot-required controls distinguished;
- whitespace check clean.

- [ ] **Step 7: Commit trust summary**

Run:

~~~bash
rtk git add docs/trust-and-operations.md
rtk git diff --cached --name-only
rtk git commit -m "docs: add trust and operations guide"
~~~

Expected staged path: docs/trust-and-operations.md only.

---

### Task 8: Link architecture, verify full pack and resolve consistency issues

**Files:**
- Read/protect: docs/architecture.md
- Modify: any canonical/compatibility documentation from Tasks 2–7 only when verification finds a defect

**Interfaces:**
- Consumes: all seven audience documents and existing architecture
- Produces: complete, link-valid and internally consistent documentation pack

- [ ] **Step 1: Re-read architecture diff before patching**

Run:

~~~bash
rtk git status --short
rtk git diff -- docs/architecture.md
rtk sed -n '1,90p' docs/architecture.md
~~~

Expected:

- existing 990-line architecture rewrite preserved;
- only navigation block or verified contradiction targeted;
- no wholesale replacement.

- [ ] **Step 2: Verify architecture navigation from canonical documents**

Ensure README and relevant new documents link to docs/architecture.md:

~~~markdown
- README.md: Kiến trúc kỹ thuật sâu
- docs/product-brief.md: Đọc tiếp — Kiến trúc
- docs/capabilities-and-evidence.md: Technical architecture appendix
- docs/trust-and-operations.md: Architecture and trust boundaries
~~~

Do not edit or stage docs/architecture.md because it was dirty before this plan. If cross-review finds a contradiction, record the exact section in final handoff instead of overwriting protected work.

- [ ] **Step 3: Verify relative Markdown links**

Run:

~~~bash
rtk node -e 'const fs=require("node:fs");const path=require("node:path");const files=["README.md",...fs.readdirSync("docs").filter(x=>x.endsWith(".md")).map(x=>"docs/"+x)];const missing=[];for(const f of files){const s=fs.readFileSync(f,"utf8");for(const m of s.matchAll(/\[[^\]]+\]\(([^)#]+)(?:#[^)]+)?\)/g)){const link=m[1];if(link.includes("://")||link.startsWith("#"))continue;const target=path.resolve(path.dirname(f),link);if(!fs.existsSync(target))missing.push(f+" -> "+link)}}console.log(missing.length?missing.join("\n"):"All relative Markdown links resolve.");if(missing.length)process.exitCode=1;'
~~~

Expected: All relative Markdown links resolve.

- [ ] **Step 4: Verify canonical headings and reader paths**

Run:

~~~bash
rtk rg -n "product-brief.md|demo-playbook.md|capabilities-and-evidence.md|adoption-guide.md|business-case-and-roadmap.md|architecture.md|trust-and-operations.md" README.md
rtk rg -n "^# " docs/product-brief.md docs/demo-playbook.md docs/capabilities-and-evidence.md docs/adoption-guide.md docs/business-case-and-roadmap.md docs/architecture.md docs/trust-and-operations.md
~~~

Expected:

- README links all seven documents;
- one H1 per canonical file.

- [ ] **Step 5: Scan placeholders, stale product terms and unsupported claims**

Run:

~~~bash
rtk rg -n -i "\b(TO[D]O|T[B]D|FIX[M]E)\b|đặt món|restaurant|food ordering" README.md docs/product-brief.md docs/demo-playbook.md docs/capabilities-and-evidence.md docs/adoption-guide.md docs/business-case-and-roadmap.md docs/architecture.md docs/trust-and-operations.md
rtk rg -n -i "production-ready|live inventory|seat hold live|payment live|PSTN live" README.md docs/product-brief.md docs/demo-playbook.md docs/capabilities-and-evidence.md docs/adoption-guide.md docs/business-case-and-roadmap.md docs/architecture.md docs/trust-and-operations.md
~~~

Expected:

- no unresolved marker or stale food-order narrative;
- unsupported claim scan empty, or every occurrence explicitly negated/Out of scope.

- [ ] **Step 6: Verify status and pricing consistency**

Run:

~~~bash
rtk rg -n "Verified|Code-ready|Roadmap|Out of scope" docs/capabilities-and-evidence.md docs/product-brief.md
rtk rg -n "Demo|Pilot|Production|500|15,000|150,000|Quote required" docs/business-case-and-roadmap.md
rtk rg -n "LiveKit|VALSEA|Neon" docs/integration-test-status.md docs/capabilities-and-evidence.md docs/business-case-and-roadmap.md
~~~

Expected:

- same capability labels across product/evidence files;
- same traffic assumptions across business case;
- provider status does not conflict with integration evidence.

- [ ] **Step 7: Run repository quality gates**

Run:

~~~bash
rtk git diff --check
rtk pnpm test
rtk which uv
~~~

Expected:

- git diff --check: no output;
- TypeScript: all workspace test files pass;
- if uv exists, continue Step 8;
- if uv is unavailable, record Python verification as environment-limited without installing global tools.

- [ ] **Step 8: Run Python verification when available**

When rtk which uv returns a path:

~~~bash
cd agent
rtk uv run pytest
rtk uv run ruff check .
~~~

Expected:

- all Python tests pass;
- Ruff reports no errors.

When uv is unavailable:

- state exactly that full Python suite was not executed because uv/dev dependencies were unavailable;
- do not claim all repository tests passed.

- [ ] **Step 9: Inspect final scope**

Run:

~~~bash
rtk git status --short
rtk git diff --stat
rtk git diff --name-only
~~~

Expected:

- intended documentation paths visible;
- unrelated .gitignore, specs, portfolio or other concurrent changes remain untouched;
- no secret or generated artifact added.

- [ ] **Step 10: Commit final navigation/consistency fixes**

Stage only paths actually changed by this task:

~~~bash
rtk git add README.md docs/product-brief.md docs/demo-playbook.md docs/capabilities-and-evidence.md docs/adoption-guide.md docs/business-case-and-roadmap.md docs/trust-and-operations.md docs/demo-script.md docs/vedi-demo-script.md docs/integration-test-status.md docs/vedi-release-manifest.md docs/pilot-roadmap.md
rtk git diff --cached --name-only
rtk git diff --cached --check
rtk git commit -m "docs: finalize judge and customer documentation pack"
~~~

Before commit, remove from index any path not modified by this plan. Do not stage portfolio, .gitignore, specs or unrelated design files.

## Final handoff

Report:

- canonical document links;
- pricing access date and providers with Quote required;
- traffic/cost assumptions;
- current versus target capability summary;
- verification commands and counts;
- Python environment limitation, if any;
- commits created;
- unrelated dirty paths left untouched.
