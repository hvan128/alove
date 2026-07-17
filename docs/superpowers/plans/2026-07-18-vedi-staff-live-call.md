# VéĐi Staff Live Call Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: use `superpowers:executing-plans` to implement this plan task by task. Apply `superpowers:test-driven-development` to every behavior change and `superpowers:verification-before-completion` before claiming completion.

**Goal:** Rebuild VéĐi as a staff-first bus-booking call console with realtime transcript, incremental evidence-backed field filling, reply suggestions, a Human/Auto voice-agent mode, and a simple mobile caller route that works both through LiveKit and through an explicitly labeled local demo fallback.

**Architecture:** Next.js 16 serves `/staff`, `/call`, narrow route handlers, and a Neon-backed session repository. LiveKit carries remote audio/data. A separately deployed Python LiveKit Agents worker listens only to the caller, streams audio to mandatory VALSEA RTT STT, emits shared events, and optionally uses VALSEA-compatible LLM/TTS in Auto mode. The deterministic TypeScript reducer remains the guaranteed demo path and the source of truth for booking patches, evidence, suggestions, and the human confirmation gate.

**Tech stack:** TypeScript, React 19, Next.js 16 App Router, Zod, Vitest/Testing Library, Playwright, LiveKit JS/server SDKs, Python 3.11, LiveKit Agents, VALSEA realtime WebSocket, Neon Postgres/Drizzle, Vercel.

---

## Task 1: Realtime and booking contracts

**Files:**

- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/test/contracts.test.ts`

**Step 1: Write failing contract tests**

Add tests for:

- the complete bus booking draft and its required/optional fields;
- per-field evidence and review state;
- transcript partial/final events;
- booking snapshot, reply suggestion, status, and agent error events;
- staff preferences, speak, and end-call commands;
- rejection of invalid confidence, role, mode, and event payloads.

**Step 2: Run the focused test and observe failure**

Run: `pnpm --filter @ordervoice/contracts test`

Expected: FAIL because the new schemas and discriminated unions do not exist.

**Step 3: Implement the minimum schemas**

Export a versioned `vedi.events` protocol with Zod discriminated unions. Preserve compatibility exports needed by the existing app until the replacement routes compile.

**Step 4: Run focused test and typecheck**

Run: `pnpm --filter @ordervoice/contracts test && pnpm --filter @ordervoice/contracts typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/contracts
git commit -m "feat: define live booking event contracts"
```

## Task 2: Evidence-backed incremental booking engine

**Files:**

- Modify: `packages/core/src/bus-booking.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/test/bus-booking.test.ts`

**Step 1: Write failing reducer tests**

Cover:

- partial transcript never mutates the booking;
- caller final transcript extracts route, date, time, count, name, phone, pickup, drop-off, trip, seat, vehicle, payment, and note when explicitly spoken;
- every extracted value includes exact message evidence and confidence;
- staff/agent utterances do not mutate caller facts;
- correction language replaces machine values and appends evidence;
- confirmed staff edits are protected from ordinary machine patches;
- missing-field list and a one-sentence reply suggestion ask for at most two facts;
- confirmation gate reports concrete reasons and opens only when required values are valid;
- deterministic catalog match and total fare calculation.

**Step 2: Run focused test and observe failure**

Run: `pnpm --filter @ordervoice/core test -- bus-booking.test.ts`

Expected: FAIL on the richer fields and reducer semantics.

**Step 3: Implement pure functions**

Implement small pure helpers for normalization, field patch extraction, evidence application, human edits, completeness, suggestion, catalog matching, and confirmation. No provider calls belong in this package.

**Step 4: Run focused and package checks**

Run: `pnpm --filter @ordervoice/core test && pnpm --filter @ordervoice/core typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: add incremental bus booking engine"
```

## Task 3: Correct VALSEA realtime protocol adapter

**Files:**

- Modify: `packages/providers/src/valsea.ts`
- Modify: `packages/providers/test/valsea.test.ts`
- Modify: `packages/providers/src/index.ts`

**Step 1: Write failing provider tests**

Assert official current protocol shapes:

- Bearer-authenticated `wss://api.valsea.ai/v1/realtime` connection;
- `session.start` with `model: valsea-rtt`, `language: vietnamese`, booking hints, and correction enabled;
- PCM binary/audio append support;
- `audio.commit` and `session.stop` names;
- safe mapping of `transcript.partial`, `transcript.final`, and error messages;
- no fabricated final transcript when parsing fails.

**Step 2: Run and observe failure**

Run: `pnpm --filter @ordervoice/providers test -- valsea.test.ts`

Expected: FAIL because the existing adapter sends legacy message names.

**Step 3: Implement protocol correction**

Keep credentials server-side, make serialization/parsing independently testable, and retain compatibility with the existing Fastify gateway.

**Step 4: Verify**

Run: `pnpm --filter @ordervoice/providers test && pnpm --filter @ordervoice/providers typecheck && pnpm --filter @ordervoice/api test`

Expected: PASS.

**Step 5: Commit**

```bash
git add packages/providers
git commit -m "fix: align VALSEA realtime protocol"
```

## Task 4: LiveKit token and configuration boundary

**Files:**

- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/livekit/server.ts`
- Create: `apps/web/src/app/api/livekit/token/route.ts`
- Create: `apps/web/src/app/api/config/route.ts`
- Create: `apps/web/src/lib/livekit/server.test.ts`
- Modify: `.env.example`

**Step 1: Add dependencies**

Install `livekit-client`, `@livekit/components-react`, and `livekit-server-sdk` in `@ordervoice/web`.

**Step 2: Write failing server-boundary tests**

Cover session-code sanitization, unique caller/staff identities, room-scoped grants, short TTL, caller-only named agent dispatch, public configuration status with no secret values, and helpful errors for missing credentials.

**Step 3: Run and observe failure**

Run: `pnpm --filter @ordervoice/web test -- src/lib/livekit/server.test.ts`

Expected: FAIL because the module and handlers do not exist.

**Step 4: Implement server-only helpers and route handlers**

Use Node runtime. Parse and validate JSON request bodies. Never expose API secrets. Dispatch `vedi-booking-agent` only when the caller joins.

**Step 5: Verify**

Run: `pnpm --filter @ordervoice/web test && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

**Step 6: Commit**

```bash
git add .env.example apps/web/package.json pnpm-lock.yaml apps/web/src/app/api apps/web/src/lib/livekit
git commit -m "feat: add secure LiveKit session boundary"
```

## Task 5: Shared call state and local demo transport

**Files:**

- Create: `apps/web/src/lib/call/session-state.ts`
- Create: `apps/web/src/lib/call/demo-channel.ts`
- Create: `apps/web/src/hooks/use-call-session.ts`
- Create: `apps/web/src/lib/call/session-state.test.ts`
- Create: `apps/web/src/hooks/use-call-session.test.tsx`

**Step 1: Write failing state and transport tests**

Cover event decoding, idempotency, partial replacement, final append, caller-final-only extraction, human field edits, reply suggestions, mode/language preferences, same-origin channel delivery, storage snapshot recovery, and cleanup.

**Step 2: Run and observe failure**

Run: `pnpm --filter @ordervoice/web test -- session-state use-call-session`

Expected: FAIL because the reducer and hook do not exist.

**Step 3: Implement reducer and transport adapter**

Use the same event envelope for BroadcastChannel and LiveKit. Label demo transport as local simulation. Keep browser APIs behind effects and provide an in-memory fallback for tests.

**Step 4: Verify**

Run: `pnpm --filter @ordervoice/web test && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/lib/call apps/web/src/hooks
git commit -m "feat: add shared realtime call session state"
```

## Task 6: Staff-first route and Apple-like operational UI

**Files:**

- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/staff/page.tsx`
- Create: `apps/web/src/components/staff/staff-workspace.tsx`
- Create: `apps/web/src/components/staff/call-toolbar.tsx`
- Create: `apps/web/src/components/staff/live-transcript.tsx`
- Create: `apps/web/src/components/staff/booking-form.tsx`
- Create: `apps/web/src/components/staff/assistant-rail.tsx`
- Create: `apps/web/src/components/staff/staff-workspace.test.tsx`
- Modify reusable controls in `apps/web/src/components/ui/` only where required.

**Step 1: Write failing staff acceptance tests**

Verify that `/staff` workspace:

- shows session link and honest connection/VALSEA/agent states;
- renders mutable partial and immutable final transcript lanes;
- switches original/Vietnamese/English display without changing source evidence;
- auto-fills form fields after caller final events;
- exposes field confidence/evidence and review states;
- allows staff edits and protects them;
- suggests the next safe reply;
- switches Human/Auto mode and never auto-speaks in Human mode;
- blocks confirmation until required values are complete.

**Step 2: Run and observe failure**

Run: `pnpm --filter @ordervoice/web test -- staff-workspace.test.tsx`

Expected: FAIL because the workspace does not exist.

**Step 3: Implement the staff cockpit**

Use the approved cold-white, system-font, Action Blue token system. Build a dense three-column desktop layout with a clear single-column mobile fallback. Use Phosphor icons, real labels/tooltips, reduced-motion support, visible keyboard focus, and no decorative gradients/glows.

**Step 4: Verify component, accessibility basics, and type safety**

Run: `pnpm --filter @ordervoice/web test && pnpm --filter @ordervoice/web lint && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app apps/web/src/components
git commit -m "feat: build staff live booking cockpit"
```

## Task 7: Mobile caller route and LiveKit client transport

**Files:**

- Create: `apps/web/src/app/call/page.tsx`
- Create: `apps/web/src/components/call/caller-workspace.tsx`
- Create: `apps/web/src/components/livekit/live-call-room.tsx`
- Create: `apps/web/src/lib/call/livekit-adapter.ts`
- Create: `apps/web/src/components/call/caller-workspace.test.tsx`
- Create: `apps/web/src/lib/call/livekit-adapter.test.ts`

**Step 1: Write failing caller tests**

Cover explicit join/microphone consent, mute/hang-up, status, latest transcript, remote audio renderer, session-code validation, text/sample fallback, local-simulation labels, device speech after user interaction, and no staff-only booking data.

**Step 2: Run and observe failure**

Run: `pnpm --filter @ordervoice/web test -- caller-workspace livekit-adapter`

Expected: FAIL because the route and transport do not exist.

**Step 3: Implement caller experience and LiveKit adapter**

Fetch a signed token only after explicit join. Publish microphone audio, subscribe to room audio, and send/receive `vedi.events` data. Fall back to BroadcastChannel/sample text when public configuration says LiveKit is unavailable.

**Step 4: Verify**

Run: `pnpm --filter @ordervoice/web test && pnpm --filter @ordervoice/web lint && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/src/app/call apps/web/src/components/call apps/web/src/components/livekit apps/web/src/lib/call
git commit -m "feat: add mobile caller and LiveKit transport"
```

## Task 8: VALSEA LiveKit voice agent

**Files:**

- Create: `agent/pyproject.toml`
- Create: `agent/agent.py`
- Create: `agent/valsea_stt.py`
- Create: `agent/booking_policy.py`
- Create: `agent/test_valsea_stt.py`
- Create: `agent/test_booking_policy.py`
- Create: `agent/Dockerfile`
- Create: `agent/livekit.toml`
- Create: `agent/.env.example`
- Create: `agent/README.md`

**Step 1: Write failing pure Python tests**

Test VALSEA session-start/commit/stop messages, partial/final/error mapping, PCM validation, room session-code parsing, linked caller identity, Human mode response suppression, Auto mode response eligibility, and staff-approved `speak` commands.

**Step 2: Run and observe failure**

Run: `cd agent && uv run pytest`

Expected: FAIL because the worker modules do not exist.

**Step 3: Implement custom streaming STT and policy**

Adapt the proven project-4 LiveKit `AgentSession` lifecycle. Explicitly link to `caller-<session>`. Implement a custom VALSEA streaming STT adapter, publish normalized event envelopes, use VALSEA-compatible LLM/TTS by default, and keep OpenAI only as an optional downstream fallback. Human mode must transcribe/suggest without spontaneous speech.

**Step 4: Add deploy artifacts and validation command**

Pin compatible packages, run import checks, and make Docker health/start behavior deterministic. Document LiveKit Cloud Agents and a Singapore container deployment path.

**Step 5: Verify**

Run: `cd agent && uv run pytest && uv run ruff check . && uv run python -m compileall .`

Expected: PASS without external credentials.

**Step 6: Commit**

```bash
git add agent
git commit -m "feat: add VALSEA LiveKit booking agent"
```

## Task 9: Neon session persistence and audit trail

**Files:**

- Modify: `db/schema.ts`
- Create: `db/migrations/0002_staff_live_call.sql`
- Modify: `db/test/db.test.ts`
- Create: `apps/web/src/lib/db/session-repository.ts`
- Create: `apps/web/src/app/api/sessions/[sessionCode]/route.ts`
- Create: `apps/web/src/lib/db/session-repository.test.ts`

**Step 1: Write failing schema/repository tests**

Cover call mode/language/state, event deduplication, original transcript preservation, field evidence revisions, staff edits, snapshots, confirmation audit, and graceful memory-only operation when `DATABASE_URL` is absent.

**Step 2: Run and observe failure**

Run: `pnpm --filter @ordervoice/db test && pnpm --filter @ordervoice/web test -- session-repository`

Expected: FAIL on missing columns/migration/repository.

**Step 3: Implement additive schema and route handler**

Use parameterized Drizzle/Neon access, server-only environment reads, idempotent event IDs, and no audio retention. The UI must remain usable if persistence is not configured.

**Step 4: Verify**

Run: `pnpm --filter @ordervoice/db test && pnpm --filter @ordervoice/db typecheck && pnpm --filter @ordervoice/web test && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

**Step 5: Commit**

```bash
git add db apps/web/src/lib/db apps/web/src/app/api/sessions
git commit -m "feat: persist live booking sessions and evidence"
```

## Task 10: Route migration, docs, and key handoff

**Files:**

- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/console/page.tsx`
- Modify: `apps/web/src/app/design-system/page.tsx`
- Modify: `README.md`
- Modify: `docs/architecture.md`
- Modify: `docs/demo-script.md`
- Create: `docs/livekit-valsea-deployment.md`
- Create: `docs/integration-test-status.md`

**Step 1: Write route smoke assertions**

Update component/E2E assertions so `/console` redirects to `/staff`, the landing page links to both roles, and the design-system route reflects the implemented tokens/states.

**Step 2: Implement migration and documentation**

Document exact local commands, honest fallback limitations, required keys, VALSEA verification status, LiveKit worker deploy instructions, Neon migration, and a two-person demo script. Explicitly state that no pasted key was stored and that the exposed key must be rotated.

**Step 3: Search visual/content constraints**

Run searches for em/en dashes in visible UI, secret-like strings, obsolete invoice/order language, and misleading “connected” claims. Fix every result in shipped UI.

**Step 4: Verify**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web README.md docs
git commit -m "docs: complete staff call demo handoff"
```

## Task 11: Full two-role browser verification

**Files:**

- Create: `apps/web/e2e/staff-call.spec.ts`
- Modify: `playwright.config.ts` only if required.

**Step 1: Write the failing E2E story**

Open `/staff?session=DEMO42` and `/call?session=DEMO42` in two pages. In local fallback, send realistic utterances, verify incremental field filling/evidence/suggestion, apply a staff edit, complete all required fields, confirm the booking, switch Auto mode, and verify audible-reply intent. Add mobile caller and responsive staff smoke checks.

**Step 2: Run and observe failure**

Run: `pnpm test:e2e -- apps/web/e2e/staff-call.spec.ts`

Expected: FAIL until selectors and cross-page behavior are complete.

**Step 3: Fix only E2E-discovered product gaps**

Use `superpowers:systematic-debugging` before changing code for unexpected failures. Keep stable role/name selectors and never add production sleeps.

**Step 4: Run complete deterministic gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
cd agent && uv run pytest && uv run ruff check . && uv run python -m compileall .
```

Expected: all PASS.

**Step 5: Commit**

```bash
git add apps/web/e2e playwright.config.ts
git commit -m "test: verify two-role booking call flow"
```

## Task 12: Deploy, smoke test, and integrate

**Files:**

- Modify: `docs/integration-test-status.md`
- Modify: `tasks/TASK-003-staff-live-call-console.md`

**Step 1: Inspect current Vercel linkage and environment**

Run read-only Vercel commands. Reuse the existing project. Never print secret values.

**Step 2: Deploy the web app**

Deploy production with Vercel CLI. If LiveKit/VALSEA/Neon credentials are absent, deploy the fully functional local-simulation route and record the live-integration blocker precisely.

**Step 3: Browser-verify production**

Use the agent-browser verification skill on `/`, `/staff`, `/call`, `/design-system`, and `/api/health`. Exercise the two-tab local demo on production and capture console/network failures.

**Step 4: Conditionally deploy/verify the worker**

If LiveKit and VALSEA credentials are present, deploy the agent and run a real two-device voice smoke. If they are not, validate the Docker image locally and document the exact keys/commands required. Do not claim a real voice test.

**Step 5: Run verification-before-completion**

Re-run fresh deterministic gates, inspect git diff/status, and update the task and integration status with observed evidence.

**Step 6: Integrate according to delegated recommendation**

Use `superpowers:finishing-a-development-branch`. Because the user delegated the choice, prefer a local merge into `dev` after all gates pass and preserve the feature commit history. Do not push when no remote exists.

