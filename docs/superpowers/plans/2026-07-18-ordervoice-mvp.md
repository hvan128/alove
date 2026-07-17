# OrderVoice MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a Vietnamese, evidence-backed voice-to-order operator demo with browser, phone and Zalo replay entry points, VALSEA-first ASR seams and human approval before ERP draft export.

**Architecture:** A pnpm workspace separates the Next.js/Vercel operator UI from a Fastify media gateway. Zod contracts and pure domain packages make all audio sources converge on normalized PCM16 frames and make final transcripts the only order-mutation input. Neon/Drizzle is the production repository; a visibly labelled fixture store preserves a usable public demo without credentials.

**Tech Stack:** Next.js 16.1.6+, React 19.2.4+, TypeScript, Tailwind CSS v4, Fastify, `@fastify/websocket`, Zod, Drizzle/Neon, OpenAI SDK, Twilio SDK, Vitest, Playwright, pnpm.

## Execution status — 2026-07-18

All implementation tasks below are complete. The delivered web demo keeps its deterministic fixture state client-side so it remains usable on public Vercel without credentials; the same production correction, approval and idempotency rules are enforced by the Fastify repository/API and tested there. The planned Next `/api/demo` placeholder was intentionally not created: `/v1/demo` belongs to the gateway, while the Next deployment exposes only `/api/health` and the no-key operator demo. Final release verification records exact sources and test evidence in `docs/release-manifest.md`.

## Global Constraints

- VALSEA is the production/challenge ASR path; OpenAI is explicit server-only development fallback only.
- Audio boundary is PCM signed 16-bit little-endian, 16 kHz, mono; 20–100 ms frames.
- Persist/order-reduce only `transcript.final`; partial text is UI-only.
- Every generated order field must have final transcript evidence; deterministic resolver/rules control catalog, price, stock and export state.
- A human must correct/approve before an idempotent ERPNext draft export; TTS requires a human click and says it is AI/device generated.
- Do not place API keys in source, tests, logs, commits or `NEXT_PUBLIC_*` values.
- Use `pnpm`, current patched Next/React versions, lazy Neon/provider initialization and `noUncheckedIndexedAccess` TypeScript.
- Keep the console Apple-like but operational: system/Geist typography, action blue, semantic status exceptions, hairlines, no decorative gradients/card shadows, 44px targets.
- Production web deploy target is Vercel; long-lived Fastify media WebSockets require separately provisioned compatible Node hosting.

## File Structure

```text
package.json                         workspace scripts
pnpm-workspace.yaml                  workspace membership
tsconfig.base.json                   strict shared compiler options
packages/contracts/src/index.ts      Zod contracts and inferred types
packages/core/src/audio.ts           PCM, resampling and mu-law functions
packages/core/src/order.ts           reducer, resolver, rules and fixtures
packages/providers/src/index.ts      VALSEA/OpenAI/Twilio/ERP adapters
apps/api/src/server.ts               Fastify routes, WebSocket and orchestration
apps/api/test/server.test.ts         injection/webhook integration tests
db/schema.ts                         Drizzle production schema
apps/web/src/app/*                   routes, metadata, CSS and APIs
apps/web/src/components/*            tokens-composed shared and console UI
apps/web/src/lib/demo.ts             safe deterministic client demo state
apps/web/e2e/console.spec.ts         Playwright full-story smoke
```

### Task 1: Scaffold workspace and contract boundary

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, package-local Vitest configs, `.env.example`
- Create: `packages/contracts/src/index.ts`, `packages/contracts/test/contracts.test.ts`

**Interfaces:**
- Produces `normalizedAudioFrameSchema`, `transcriptSegmentSchema`, `orderPatchSchema`, `orderDraftSchema`, `demoWorkspaceSchema`.
- Consumers import only from `@ordervoice/contracts`.

- [ ] **Step 1: Write the failing contract test**

```ts
import { expect, it } from 'vitest'
import { normalizedAudioFrameSchema, transcriptSegmentSchema } from '../src'

it('rejects non-16kHz and persistent partial transcript input', () => {
  expect(() => normalizedAudioFrameSchema.parse({ sampleRate: 8000 })).toThrow()
  expect(transcriptSegmentSchema.safeParse({ kind: 'final' }).success).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ordervoice/contracts test`

Expected: FAIL because workspace/package/schema does not exist.

- [ ] **Step 3: Implement minimal contracts and workspace scripts**

```ts
export const normalizedAudioFrameSchema = z.object({
  sessionId: z.string().min(1), source: z.enum(['browser', 'telephony', 'replay']),
  trackId: z.string().min(1), speaker: z.enum(['caller', 'agent', 'unknown']),
  sequence: z.number().int().nonnegative(), capturedAtMs: z.number().nonnegative(),
  sampleRate: z.literal(16000), channels: z.literal(1), encoding: z.literal('pcm_s16le'),
  pcm: z.instanceof(Int16Array), endOfUtterance: z.boolean().optional(),
})
```

Implement full transcript/order/demo schemas from `specs/api-contracts.md`; set strict TypeScript and `pnpm` scripts for lint/typecheck/test/build.

- [ ] **Step 4: Run contract test and typecheck**

Run: `pnpm --filter @ordervoice/contracts test && pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add package.json pnpm-workspace.yaml tsconfig.base.json .env.example packages/contracts && git commit -m "feat: add OrderVoice workspace contracts"`

### Task 2: Implement audio, transcript and order core test-first

**Files:**
- Create: `packages/core/src/audio.ts`, `packages/core/src/order.ts`, `packages/core/src/fixtures.ts`, `packages/core/src/index.ts`
- Create: `packages/core/test/audio.test.ts`, `packages/core/test/order.test.ts`

**Interfaces:**
- Consumes: `NormalizedAudioFrame`, `TranscriptSegment`, `OrderPatch`, `OrderDraft` from contracts.
- Produces `decodeMuLaw`, `resamplePcm16`, `reduceFinalSegment`, `resolveCatalog`, `approveOrder`, `exportOrder`.

- [ ] **Step 1: Write failing audio/domain tests**

```ts
it('decodes Twilio mu-law and resamples an 8k frame to 16k', () => {
  const pcm = decodeMuLaw(Uint8Array.of(0xff, 0x7f))
  expect(resamplePcm16(pcm, 8000, 16000)).toHaveLength(pcm.length * 2)
})

it('ignores partial text but holds an ambiguous alias for review', () => {
  expect(reduceFinalSegment(seedDraft, partialSegment)).toEqual(seedDraft)
  expect(reduceFinalSegment(seedDraft, finalAmbiguousSegment).exceptions[0]?.code).toBe('SKU_AMBIGUOUS')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @ordervoice/core test`

Expected: FAIL because functions do not exist.

- [ ] **Step 3: Implement pure audio/rules functions**

```ts
export function resamplePcm16(input: Int16Array, from: number, to: number) {
  const length = Math.round(input.length * to / from)
  return Int16Array.from({ length }, (_, index) => {
    const position = index * from / to
    const left = Math.floor(position); const right = Math.min(left + 1, input.length - 1)
    return Math.round(input[left]! + (input[right]! - input[left]!) * (position - left))
  })
}
```

Create fixture customers/SKUs, deterministic alias resolver, evidence validation, status transitions and stable export idempotency map. Preserve accents and never call providers.

- [ ] **Step 4: Run core tests**

Run: `pnpm --filter @ordervoice/core test && pnpm typecheck`

Expected: PASS, including partial-ignore, ambiguity, correction, approval and duplicate-export assertions.

- [ ] **Step 5: Commit**

Run: `git add packages/core && git commit -m "feat: add audio and order domain core"`

### Task 3: Add provider adapters and Fastify gateway

**Files:**
- Create: `packages/providers/src/valsea.ts`, `packages/providers/src/openai.ts`, `packages/providers/src/twilio.ts`, `packages/providers/src/erpnext.ts`, `packages/providers/src/index.ts`
- Create: `apps/api/src/server.ts`, `apps/api/src/index.ts`, `apps/api/test/server.test.ts`, `apps/api/test/twilio.test.ts`

**Interfaces:**
- Consumes: core audio/domain functions and contracts.
- Produces: `createServer`, `createValseaSession`, `parseTwilioMedia`, `createErpDraft`.

- [ ] **Step 1: Write failing adapter/server tests**

```ts
it('maps a Twilio media event to a normalized caller frame', () => {
  const frame = parseTwilioMedia(mediaFixture, 'conversation-1')
  expect(frame).toMatchObject({ source: 'telephony', sampleRate: 16000, channels: 1 })
})

it('returns the same export reference on retry', async () => {
  const app = await createServer({ repository: memoryRepository })
  const one = await app.inject({ method: 'POST', url: '/v1/orders/order-1/export', payload: { idempotencyKey: 'x' } })
  const two = await app.inject({ method: 'POST', url: '/v1/orders/order-1/export', payload: { idempotencyKey: 'x' } })
  expect(one.json().externalReference).toBe(two.json().externalReference)
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @ordervoice/api test`

Expected: FAIL because server/adapters do not exist.

- [ ] **Step 3: Implement adapter seams and gateway**

```ts
export async function createValseaSession(options: ValseaOptions) {
  const socket = new WebSocket('wss://api.valsea.ai/v1/realtime', { headers: { Authorization: `Bearer ${options.apiKey}` } })
  socket.send(JSON.stringify({ type: 'session.start', audio: { encoding: 'pcm_s16le', sample_rate: 16000, channels: 1 } }))
  return socket
}
```

Add lazy environment getters, VALSEA event mapping, OpenAI development-only fallback guard, Twilio TwiML/webhook verification guard, websocket control/binary messages, final-only reducer orchestration and explicit no-key demo state. Never initialize an SDK at import time.

- [ ] **Step 4: Run integration tests**

Run: `pnpm --filter @ordervoice/api test && pnpm typecheck`

Expected: PASS. Tests do not make unauthenticated network calls.

- [ ] **Step 5: Commit**

Run: `git add packages/providers apps/api && git commit -m "feat: add realtime provider gateway"`

### Task 4: Add Neon/Drizzle persistence boundary

**Files:**
- Create: `db/schema.ts`, `db/index.ts`, `db/migrations/0000_init.sql`, `apps/api/src/repository.ts`, `apps/api/test/repository.test.ts`
- Modify: `apps/api/src/server.ts`

**Interfaces:**
- Produces `getDb()`, `createRepository()`, `memoryRepository` and `ConversationRepository`.
- `ConversationRepository` methods: `getDemo`, `appendFinalSegment`, `updateOrder`, `approveOrder`, `exportOrder`.

- [ ] **Step 1: Write failing repository test**

```ts
it('does not persist a partial transcript segment', async () => {
  await expect(memoryRepository.appendFinalSegment(partialSegment)).rejects.toThrow('final')
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @ordervoice/api test -- repository.test.ts`

Expected: FAIL because repository is absent.

- [ ] **Step 3: Implement lazy Drizzle repository and fixture fallback**

```ts
let database: ReturnType<typeof drizzle> | undefined
export function getDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required for Neon persistence')
  return database ??= drizzle(neon(url), { schema })
}
```

Define normalized tables for conversations, segments, evidence, order lines, approvals, replies and exports. Make `idempotency_key` unique. Use the in-memory repository only if `NODE_ENV !== 'production'` and surface demo mode.

- [ ] **Step 4: Run repository/server tests**

Run: `pnpm --filter @ordervoice/api test && pnpm typecheck`

Expected: PASS without a live database.

- [ ] **Step 5: Commit**

Run: `git add db apps/api/src && git commit -m "feat: add Neon order persistence boundary"`

### Task 5: Build token system and shared UI primitives

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`
- Create: `apps/web/src/components/ui/{button,panel,status,input,field-evidence,transcript-lane,app-shell}.tsx`
- Create: `apps/web/src/app/design-system/page.tsx`, `apps/web/src/app/page.tsx`
- Test: `apps/web/src/components/ui/ui.test.tsx`

**Interfaces:**
- Produces `Button`, `Panel`, `StatusPill`, `TextInput`, `FieldEvidence`, `TranscriptLane`, `AppShell`.

- [ ] **Step 1: Write failing component tests**

```tsx
it('gives a disabled action an accessible reason and preserves an evidence quote', () => {
  render(<><Button disabled disabledReason="Cần duyệt đơn">Xuất ERP</Button><FieldEvidence quote="12 thùng Arabica" confidence={0.94} /></>)
  expect(screen.getByRole('button', { name: 'Xuất ERP' })).toBeDisabled()
  expect(screen.getByText('12 thùng Arabica')).toBeVisible()
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @ordervoice/web test -- ui.test.tsx`

Expected: FAIL because web package/components do not exist.

- [ ] **Step 3: Implement Next foundation and components**

```tsx
export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />
}
```

Place Geist font variables on `<html>`, use literal font stacks in Tailwind v4 `@theme inline`, define semantic CSS variables, visible focus rings, no-gradient/card-shadow discipline and responsive utility classes. The design-system page renders all states.

- [ ] **Step 4: Run UI tests and build**

Run: `pnpm --filter @ordervoice/web test && pnpm --filter @ordervoice/web build`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add apps/web && git commit -m "feat: add Apple-like shared UI system"`

### Task 6: Implement the operator console and speaking demo

**Files:**
- Create: `apps/web/src/lib/demo.ts`, `apps/web/src/hooks/use-demo-workspace.ts`, `apps/web/src/components/console/{source-switcher,conversation-panel,order-panel,reply-panel,console-workspace}.tsx`
- Create: `apps/web/src/app/console/page.tsx`, `apps/web/src/app/api/health/route.ts`, `apps/web/src/app/api/demo/route.ts`
- Test: `apps/web/src/components/console/console.test.tsx`, `apps/web/e2e/console.spec.ts`

**Interfaces:**
- Consumes `DemoWorkspace` contracts and UI primitives.
- Produces browser-only `speakReply(text)` which calls `speechSynthesis` only after user click.

- [ ] **Step 1: Write failing workspace/E2E tests**

```tsx
it('does not enable ERP export until a human approves', async () => {
  render(<ConsoleWorkspace initialWorkspace={demoWorkspace} />)
  expect(screen.getByRole('button', { name: 'Xuất ERP nháp' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Duyệt đơn nháp' }))
  expect(screen.getByRole('button', { name: 'Xuất ERP nháp' })).toBeEnabled()
})
```

```ts
test('demo produces a final order and exposes human-clicked speech', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('button', { name: 'Chạy demo đơn hàng' }).click()
  await expect(page.getByText('Arabica Premium')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nói phản hồi' })).toBeVisible()
})
```

- [ ] **Step 2: Run tests to verify failure**

Run: `pnpm --filter @ordervoice/web test -- console.test.tsx`

Expected: FAIL because console is absent.

- [ ] **Step 3: Implement console state and interaction**

```ts
export function speakReply(text: string) {
  if (!('speechSynthesis' in window)) return { ok: false, reason: 'unsupported' as const }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance)
  return { ok: true as const }
}
```

Render the three channels, replay file control, telephony readiness callout, partial/final transcript separation, field evidence, exceptions, human correction/approval/export and a clear device-voice disclosure. Keep all demo seed data local and deterministic.

- [ ] **Step 4: Run console tests and Playwright smoke**

Run: `pnpm --filter @ordervoice/web test && pnpm test:e2e`

Expected: PASS; Playwright checks no visual/interaction blocking errors.

- [ ] **Step 5: Commit**

Run: `git add apps/web && git commit -m "feat: add human-in-loop operator console"`

### Task 7: Wire build, verification, docs and deployment configuration

**Files:**
- Create: `README.md`, `vercel.json`, `apps/web/public/og-placeholder.svg`
- Modify: `.env.example`, `docs/integration-feasibility.md`, `docs/demo-script.md`, `tasks/TASK-001-ordervoice-mvp.md`
- Test: `apps/web/e2e/design-system.spec.ts`

**Interfaces:**
- Produces verified commands: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm deploy:web`.

- [ ] **Step 1: Write failing smoke test**

```ts
test('design system and health route are available', async ({ page, request }) => {
  await page.goto('/design-system')
  await expect(page.getByRole('heading', { name: 'Design system' })).toBeVisible()
  expect((await request.get('/api/health')).status()).toBe(200)
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm test:e2e -- design-system.spec.ts`

Expected: FAIL until pages/routes are configured.

- [ ] **Step 3: Add runbook and deployment config**

Document exact env names without values, Vercel root directory `apps/web`, gateway deployment requirement, test modes and credentials checklist. Configure no secrets in `vercel.json`. Include a release manifest mapping each AC to test/source/commit.

- [ ] **Step 4: Run complete local quality gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build && git diff --check`

Expected: PASS. If a third-party live test lacks credentials, note it in feasibility docs rather than failing core verification.

- [ ] **Step 5: Commit and deploy web**

Run: `git add README.md vercel.json .env.example docs tasks apps/web && git commit -m "docs: add OrderVoice runbook and release evidence"`

Then, after checking Vercel authentication and release source, run `pnpm deploy:web`. Record the production URL, deployment SHA and smoke result. Do not claim a gateway deployment or live provider test without its own credentials.

## Plan self-review

| Spec/AC | Covered by |
|---|---|
| Three sources / truthful readiness | Tasks 3 and 6 |
| VALSEA, Twilio, OpenAI adapter seams | Task 3 |
| PCM16 normalization and telephony conversion | Tasks 1 and 2 |
| Final-only/evidence/domain rules | Tasks 1, 2 and 4 |
| Approval/idempotent ERP draft | Tasks 2–4 and 6 |
| Audible human-clicked agent reply | Task 6 |
| Next.js/Vercel, Neon, Apple-like tokens/components | Tasks 4, 5 and 7 |
| Documentation/provider caveats/route design | existing docs plus Task 7 |
| Unit/integration/e2e/build/deploy quality gates | Tasks 1–7 |

`rg` placeholder scan is clean; function/type names in later tasks match the contracts and core interfaces stated earlier. The plan intentionally treats live provider credentials and non-Vercel gateway hosting as external configuration, not features to fake.

## Execution decision

The user explicitly delegated implementation decisions and instructed the agent not to stop. Execute inline in this worktree with task-level test/commit checkpoints; do not dispatch parallel agents because repository instruction forbids unrequested subagents.
