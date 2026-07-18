# LiveKit Agent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge current `dev` documentation and safety contracts into LiveKit/VALSEA TASK-003, document current-versus-target capability evidence, then merge verified result into local `main`.

**Architecture:** Preserve TASK-003 realtime implementation and merge `dev` into it. Resolve booking authority, evidence, confirmation and idempotency toward stricter `dev` invariants while keeping LiveKit, VALSEA, mobile caller and staff-console code. Publish one evidence-backed status document without restoring duplicate `docs/main-features.md`.

**Tech Stack:** Git worktrees, pnpm monorepo, Next.js 16, React 19, TypeScript, Vitest, Playwright, Python 3.11+, uv/pytest, LiveKit, VALSEA, Drizzle.

## Global Constraints

- Work only in existing TASK-003 worktree until feature verification passes.
- Preserve final passenger-message evidence; partial, Agent and staff messages cannot become booking facts.
- Preserve explicit confirmation and scoped idempotency before booking-code issuance.
- Staff receives the session first; Agent reply authority requires explicit delegation and remains revocable.
- Never claim LiveKit, VALSEA, OpenAI or Neon production success without credentialed smoke evidence.
- Do not restore `docs/main-features.md`; use `docs/current-vs-target-architecture.md` as comparison document.
- Do not push remote branches; requested outcome is local `main` merge.

---

### Task 1: Verify pulled feature baseline

**Files:**
- Verify: `package.json`
- Verify: `agent/pyproject.toml`
- Verify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `feature/TASK-003-staff-live-call-console` tracking `origin/feature/TASK-003-staff-live-call-console`
- Produces: clean, reproducible baseline before `dev` merge

- [ ] **Step 1: Confirm clean branch and upstream**

Run: `git status --short --branch && git branch -vv`

Expected: clean feature branch; upstream points to `origin/feature/TASK-003-staff-live-call-console`.

- [ ] **Step 2: Install exact Node dependencies**

Run: `pnpm install --frozen-lockfile`

Expected: exit 0; lockfile unchanged.

- [ ] **Step 3: Run TypeScript baseline tests**

Run: `pnpm test`

Expected: exit 0; no failed test files.

- [ ] **Step 4: Run Python Agent baseline tests**

Run from `agent/`: `uv run pytest`

Expected: exit 0; all Agent tests pass.

### Task 2: Merge current dev into TASK-003

**Files:**
- Potentially modify: `README.md`
- Potentially modify: `docs/architecture.md`
- Potentially modify: `docs/demo-script.md`
- Potentially modify: `docs/integration-feasibility.md`
- Potentially modify: `docs/livekit-bus-pilot.md`
- Potentially modify: `docs/release-manifest.md`
- Potentially modify: `docs/vedi-demo-script.md`
- Potentially modify: `docs/vedi-release-manifest.md`
- Potentially modify: `packages/contracts/src/index.ts`
- Potentially modify: `packages/core/src/bus-booking.ts`
- Potentially modify: `packages/providers/src/valsea.ts`
- Potentially modify: `db/schema.ts`
- Potentially modify: `package.json`
- Potentially modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: local `dev` at inspected HEAD and verified TASK-003 baseline
- Produces: one resolved merge commit retaining both histories

- [ ] **Step 1: Merge dev without auto-commit**

Run: `git merge --no-commit dev`

Expected: merge stages non-conflicting files and either stops with named conflicts or leaves a merge ready to commit.

- [ ] **Step 2: Enumerate every unresolved path**

Run: `git diff --name-only --diff-filter=U`

Expected: exact conflict list; no path is resolved implicitly.

- [ ] **Step 3: Resolve runtime and contract conflicts**

For LiveKit `/call`, `/staff`, token/session boundaries, Python Agent and VALSEA adapters, preserve TASK-003 behavior. For evidence, confirmation, idempotency and security constraints, preserve stricter `dev` invariants and adapt TASK-003 call sites/types. Use `git diff --cc <path>` before each edit and stage only reviewed paths.

- [ ] **Step 4: Resolve documentation conflicts**

Keep truthful current/target labels from `dev`, then add TASK-003 capabilities only where source/tests exist. Remove obsolete claims that same-browser demo is only current architecture, but retain zero-key fallback disclosure.

- [ ] **Step 5: Resolve dependency lockfile mechanically if needed**

After merging both `package.json` manifests, run `pnpm install --lockfile-only`; inspect `git diff -- pnpm-lock.yaml` and retain LiveKit dependencies plus existing workspace packages.

- [ ] **Step 6: Check merge integrity**

Run: `git diff --name-only --diff-filter=U`

Expected: empty output.

Run: `rg -n '^(<<<<<<<|=======|>>>>>>>)' . --glob '!node_modules/**' --glob '!agent/.venv/**'`

Expected: empty output.

- [ ] **Step 7: Commit merge**

Run: `git commit -m "merge: integrate current dev with LiveKit Agent"`

Expected: merge commit with TASK-003 and `dev` parents.

### Task 3: Write current-versus-target architecture document

**Files:**
- Create: `docs/current-vs-target-architecture.md`
- Reference: `specs/features.md`
- Reference: `docs/architecture.md`
- Reference: `tasks/TASK-003-staff-live-call-console.md`
- Reference: `docs/integration-test-status.md`
- Reference: `docs/livekit-valsea-deployment.md`

**Interfaces:**
- Consumes: resolved code, tests and release evidence
- Produces: evidence-backed capability matrix for product/hackathon review

- [ ] **Step 1: Inventory merged runtime**

Inspect routes, LiveKit server boundary, session state, staff workspace, booking core, Agent worker, VALSEA adapter, database repository and migrations. Record exact source/test paths.

- [ ] **Step 2: Write architecture snapshot**

Describe inbound/mobile caller, staff console, session/transport, Agent worker, VALSEA ASR/TTS, booking core, persistence and fallback. Separate local demo, code seam, credentialed pilot and production-live evidence.

- [ ] **Step 3: Write main-feature matrix**

Use columns: `Main feature`, `Status`, `Current implementation`, `Evidence`, `Missing/next proof`. Cover incoming-call notification, staff accept, Agent delegation, live transcript, VN/EN/accents/noise, automatic field filling, reply suggestions, takeover/re-delegation, validation/confirmation, dashboard, bus-operator daily data, multilingual handling, persistence/audit and deliverables.

- [ ] **Step 4: Write challenge compliance verdict**

State which mandatory requirements are implemented in code and which remain unproven without VALSEA sandbox credentials and difficult Vietnamese audio evidence. Do not convert code presence into live-success claims.

- [ ] **Step 5: Self-review document**

Run: `rg -n 'TBD|TODO|FIXME|placeholder' docs/current-vs-target-architecture.md`

Expected: empty output.

Verify every `Đã có` row has source or test evidence. Downgrade unsupported claims to `Một phần` or `Chưa có`.

- [ ] **Step 6: Commit document**

Run: `git add docs/current-vs-target-architecture.md && git commit -m "docs: map current architecture to target features"`

Expected: one documentation commit.

### Task 4: Verify integrated feature branch

**Files:**
- Verify: entire repository

**Interfaces:**
- Consumes: resolved merge plus status document
- Produces: fresh evidence required before `main` merge

- [ ] **Step 1: Run formatting/conflict checks**

Run: `git diff --check HEAD~2..HEAD`

Run: `rg -n '^(<<<<<<<|=======|>>>>>>>)' . --glob '!node_modules/**' --glob '!agent/.venv/**'`

Expected: both commands clean.

- [ ] **Step 2: Run lint and typecheck**

Run: `pnpm lint && pnpm typecheck`

Expected: exit 0.

- [ ] **Step 3: Run TypeScript and Python tests**

Run: `pnpm test`

Run from `agent/`: `uv run pytest`

Expected: all tests pass.

- [ ] **Step 4: Run browser E2E**

Run: `pnpm test:e2e`

Expected: all configured Chromium flows pass.

- [ ] **Step 5: Run production builds**

Run: `pnpm build`

Run from `agent/`: `uv build`

Expected: both exit 0.

- [ ] **Step 6: Scan tracked files for secret patterns**

Run: `git grep -nE '(sk-[A-Za-z0-9_-]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|VALSEA_API_KEY=.+|LIVEKIT_API_SECRET=.+|OPENAI_API_KEY=.+)' -- ':!pnpm-lock.yaml' ':!agent/uv.lock'`

Expected: no private key or populated provider-secret assignment. Inspect any documentation/example match before proceeding.

### Task 5: Merge verified branch into local main

**Files:**
- Modify through Git merge: local `main` branch history

**Interfaces:**
- Consumes: verified `feature/TASK-003-staff-live-call-console`
- Produces: verified local `main`

- [ ] **Step 1: Confirm root checkout clean**

Run in repository root: `git status --short --branch`

Expected: clean `dev` checkout.

- [ ] **Step 2: Create or update local main from origin/main**

If local `main` is absent, run: `git switch -c main --track origin/main`.

If present, run: `git switch main && git pull --ff-only origin main`.

Expected: clean local `main` aligned with `origin/main` before merge.

- [ ] **Step 3: Merge feature branch**

Run: `git merge --no-ff feature/TASK-003-staff-live-call-console -m "merge: add staff-first LiveKit Agent architecture"`

Expected: merge succeeds with no unresolved paths.

- [ ] **Step 4: Re-run full verification on main**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`

Run from `agent/`: `uv run pytest && uv build`

Expected: all commands exit 0.

- [ ] **Step 5: Record final state**

Run: `git status --short --branch && git log --graph --decorate --oneline -8`

Expected: clean local `main`, merge commit visible, no push performed.
