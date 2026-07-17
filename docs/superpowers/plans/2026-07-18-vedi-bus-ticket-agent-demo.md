# VéĐi Bus Ticket Agent Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the OrderVoice sales demo with a two-sided Vietnamese bus-ticket Web Call demo supporting human and automatic speaking-agent modes.

**Architecture:** Keep the existing Next.js monorepo and add typed bus-booking contracts plus a pure deterministic state machine. The deployed demo runs both roles in one client workspace, uses progressive browser STT/TTS, and requires no provider secret. Existing realtime/provider modules remain isolated for future LiveKit or telephony pilots.

**Tech Stack:** TypeScript 5.9, Zod 4, React 19, Next.js 16 App Router, Tailwind CSS 4, Vitest, Testing Library, Playwright, Vercel.

## Global Constraints

- Branch: `feature/TASK-002-bus-ticket-agent` from `dev@53cd961`.
- Product name and user-facing domain: `VéĐi`, Vietnamese bus-ticket booking.
- Demo must work without phone number, LiveKit credentials, database, or model key.
- Web Speech API is optional; preset/text controls are mandatory fallback.
- Agent never charges money and confirms only after explicit customer confirmation.
- No secret may enter client code, tracked files, logs, or deployment output.
- Use shared Apple-like design tokens and accessible native controls.
- Follow red-green-refactor for every new behavior.

---

### Task 1: Pivot product context and typed contracts

**Files:**

- Modify: `specs/product-vision.md`
- Modify: `specs/domains.md`
- Modify: `specs/features.md`
- Modify: `specs/api-contracts.md`
- Create: `adrs/0007-bus-ticket-web-call-demo.md`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/test/contracts.test.ts`

**Interfaces:**

- Produces: `CallMode`, `CallStatus`, `CallRole`, `BusTrip`, `BookingDraft`, `CallMessage`, `BusDemoWorkspace`.
- Booking status values: `collecting | trip_proposed | awaiting_confirmation | confirmed`.

- [x] **Step 1: Write failing schema tests**

Add tests that parse a valid two-seat booking workspace and reject a confirmed booking without `bookingCode` or selected trip.

```ts
expect(busDemoWorkspaceSchema.parse(validWorkspace).booking.status).toBe('trip_proposed')
expect(() => bookingDraftSchema.parse({ ...draft, status: 'confirmed', bookingCode: null })).toThrow()
```

- [x] **Step 2: Run RED**

Run: `pnpm --filter @ordervoice/contracts test`  
Expected: FAIL because bus schemas do not exist.

- [x] **Step 3: Add schemas and types**

Use Zod refinement for confirmed-booking invariants. Messages carry `id`, `role`, `text`, `createdAt`, `channel`, and `final`.

```ts
export const callModeSchema = z.enum(['human', 'auto'])
export const bookingStatusSchema = z.enum(['collecting', 'trip_proposed', 'awaiting_confirmation', 'confirmed'])
export type BookingDraft = z.infer<typeof bookingDraftSchema>
```

- [x] **Step 4: Run GREEN and typecheck**

Run: `pnpm --filter @ordervoice/contracts test`  
Expected: PASS.

Run: `pnpm --filter @ordervoice/contracts typecheck`  
Expected: PASS.

- [x] **Step 5: Update product specs and ADR**

Record the two roles, human/auto modes, deterministic demo transport, LiveKit pilot seam, and no-key constraints. Remove sales-order claims from active product specs while preserving historical release docs.

- [x] **Step 6: Commit**

```bash
git add specs adrs/0007-bus-ticket-web-call-demo.md packages/contracts
git commit -m "feat: add bus ticket demo contracts"
```

### Task 2: Build deterministic booking agent

**Files:**

- Create: `packages/core/src/bus-booking.ts`
- Create: `packages/core/test/bus-booking.test.ts`
- Modify: `packages/core/package.json`

**Interfaces:**

- Consumes: `BookingDraft`, `BusTrip`, `CallMessage` from contracts.
- Produces:

```ts
export function createBusDemoCatalog(): BusTrip[]
export function createInitialBooking(conversationId: string): BookingDraft
export function advanceBookingAgent(draft: BookingDraft, message: CallMessage): AgentTurn
export function confirmBooking(draft: BookingDraft, actor: 'customer' | 'staff'): BookingDraft
export function canConfirmBooking(draft: BookingDraft): boolean
```

- [x] **Step 1: Write failing state-machine tests**

Cover: route/date/seats extraction; trip proposal; passenger details; missing-field clarification; explicit confirmation; duplicate confirmation code reuse.

```ts
const first = advanceBookingAgent(initial, customer('Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.'))
expect(first.draft).toMatchObject({ origin: 'Sài Gòn', destination: 'Đà Lạt', passengerCount: 2, status: 'trip_proposed' })
expect(first.reply).toContain('22:00')
```

- [x] **Step 2: Run RED**

Run: `pnpm --filter @ordervoice/core test -- bus-booking.test.ts`  
Expected: FAIL because module does not exist.

- [x] **Step 3: Implement minimal catalog, parser, state machine**

Normalize Vietnamese diacritics for intent matching but preserve display values. Parse only supported demo route, 1–6 seats, demo date phrases, trip time, passenger name/phone, and explicit confirmation. Return one concise Vietnamese reply per turn.

- [x] **Step 4: Run GREEN**

Run: `pnpm --filter @ordervoice/core test -- bus-booking.test.ts`  
Expected: PASS.

- [x] **Step 5: Add direct package subpath export**

Expose `@ordervoice/core/bus-booking` directly to its TypeScript source so Next.js does not traverse legacy `.js` re-exports.

```json
"exports": {
  ".": "./src/index.ts",
  "./bus-booking": "./src/bus-booking.ts"
}
```

- [x] **Step 6: Run full core tests and commit**

Run: `pnpm --filter @ordervoice/core test`  
Expected: all legacy order tests plus booking tests PASS.

```bash
git add packages/core
git commit -m "feat: add deterministic bus booking agent"
```

### Task 3: Build two-sided Web Call workspace

**Files:**

- Create: `apps/web/src/lib/bus-demo.ts`
- Create: `apps/web/src/components/bus-call/bus-call-workspace.tsx`
- Create: `apps/web/src/components/bus-call/call-header.tsx`
- Create: `apps/web/src/components/bus-call/customer-call-card.tsx`
- Create: `apps/web/src/components/bus-call/care-desk-card.tsx`
- Create: `apps/web/src/components/bus-call/booking-summary.tsx`
- Create: `apps/web/src/components/bus-call/message-timeline.tsx`
- Create: `apps/web/src/components/bus-call/bus-call-workspace.test.tsx`
- Modify: `apps/web/src/app/console/page.tsx`
- Modify: `apps/web/package.json`

**Interfaces:**

- Consumes: `advanceBookingAgent`, `confirmBooking`, typed initial workspace.
- Produces: customer message submission, human reply, auto reply, takeover, call lifecycle, booking display.

- [x] **Step 1: Write failing component tests**

Test these behaviors independently:

1. Human mode receives customer text but does not create agent reply.
2. Auto mode adds an agent reply after a customer preset.
3. Switching auto → human preserves transcript and booking.
4. Confirm button remains disabled until booking is complete.

```tsx
await user.click(screen.getByRole('button', { name: 'Gửi yêu cầu mẫu' }))
expect(screen.getByText(/chuyến giường nằm 22:00/i)).toBeVisible()
expect(screen.getByText('2 hành khách')).toBeVisible()
```

- [x] **Step 2: Run RED**

Run: `pnpm --filter @ordervoice/web test -- bus-call-workspace.test.tsx`  
Expected: FAIL because workspace does not exist.

- [x] **Step 3: Implement initial state and component shell**

Use `useState` only in workspace. Child cards receive typed props and callbacks. Keep each component under 300 lines. Use native buttons, inputs, labels, status regions, and existing token variables.

- [x] **Step 4: Implement human and auto transitions**

Customer final messages always update booking evidence. Only auto mode calls `advanceBookingAgent` and sends its reply. Human mode exposes reply suggestions and `Gửi & nói` without an automatic send.

- [x] **Step 5: Run GREEN**

Run: `pnpm --filter @ordervoice/web test -- bus-call-workspace.test.tsx`  
Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/bus-demo.ts apps/web/src/components/bus-call apps/web/src/app/console/page.tsx
git commit -m "feat: add two-sided bus call workspace"
```

### Task 4: Add progressive browser voice

**Files:**

- Create: `apps/web/src/hooks/use-speech-recognition.ts`
- Create: `apps/web/src/lib/device-speech.ts`
- Create: `apps/web/src/hooks/use-speech-recognition.test.tsx`
- Modify: `apps/web/src/components/bus-call/bus-call-workspace.tsx`
- Modify: `apps/web/src/components/bus-call/customer-call-card.tsx`
- Modify: `apps/web/src/components/bus-call/care-desk-card.tsx`
- Modify: `apps/web/src/components/bus-call/bus-call-workspace.test.tsx`

**Interfaces:**

```ts
export type SpeechRecognitionState = 'unsupported' | 'idle' | 'listening' | 'error'
export function speakVietnamese(text: string): 'speaking' | 'unsupported'
```

- [x] **Step 1: Write failing browser-adapter tests**

Test unsupported fallback, final recognition callback, and that no speech occurs before a customer/staff click causes a reply.

- [x] **Step 2: Run RED**

Run: `pnpm --filter @ordervoice/web test -- use-speech-recognition.test.tsx bus-call-workspace.test.tsx`  
Expected: FAIL because voice adapters do not exist.

- [x] **Step 3: Implement optional SpeechRecognition**

Support `window.SpeechRecognition` and `window.webkitSpeechRecognition`, `lang = 'vi-VN'`, `interimResults = true`, one active recognizer, clear stop/error state. Final transcript enters the same customer-message path as text/presets.

- [x] **Step 4: Implement device TTS**

Cancel existing speech, create `SpeechSynthesisUtterance`, set `lang = 'vi-VN'`, and speak only from explicit user-triggered flows. Keep visible replay and stop controls.

- [x] **Step 5: Run GREEN and commit**

Run: `pnpm --filter @ordervoice/web test`  
Expected: all web tests PASS.

```bash
git add apps/web/src/hooks apps/web/src/lib/device-speech.ts apps/web/src/components/bus-call
git commit -m "feat: add browser voice controls"
```

### Task 5: Complete product surfaces and documentation

**Files:**

- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/design-system/page.tsx`
- Modify: `apps/web/src/components/ui/app-shell.tsx`
- Modify: `README.md`
- Modify: `.env.example`
- Create: `docs/livekit-bus-pilot.md`
- Create: `docs/vedi-demo-script.md`
- Modify: `docs/architecture.md`

**Interfaces:**

- Landing CTA points to `/console`.
- Demo script documents human and auto flows.
- LiveKit doc includes exact credential/deployment prerequisites and no unsupported live claim.

- [x] **Step 1: Add failing E2E expectations for new product copy**

Update Playwright to expect `VéĐi`, two role headings, and mode controls.

- [x] **Step 2: Run RED**

Run: `pnpm test:e2e`  
Expected: FAIL on old OrderVoice copy.

- [x] **Step 3: Update landing, metadata, shell, design route, docs**

Use warm travel accents while retaining Apple-like spacing, typography, hairlines, focus states, and reduced-motion handling. Remove active sales-order/ERP claims from current surfaces.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/app apps/web/src/components/ui/app-shell.tsx README.md .env.example docs
git commit -m "feat: pivot product surfaces to Vedi"
```

### Task 6: End-to-end verification and production release

**Files:**

- Modify: `apps/web/e2e/console.spec.ts`
- Modify: `apps/web/e2e/design-system.spec.ts`
- Create: `docs/vedi-release-manifest.md`
- Modify: `tasks/TASK-002-bus-ticket-agent-demo.md`

**Interfaces:**

- Auto scenario ends with one confirmed booking code.
- Human scenario proves no automatic response and explicit staff send.

- [ ] **Step 1: Finish Playwright flows**

```ts
test('auto agent books two seats and confirms once', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('button', { name: 'Bắt đầu Web Call' }).click()
  await page.getByRole('button', { name: 'Agent tự động' }).click()
  await page.getByRole('button', { name: 'Gửi yêu cầu mẫu' }).click()
  await page.getByRole('button', { name: 'Chọn chuyến 22:00' }).click()
  await page.getByRole('button', { name: 'Gửi thông tin hành khách' }).click()
  await page.getByRole('button', { name: 'Xác nhận đặt vé' }).click()
  await expect(page.getByText(/VD-[A-Z0-9-]+/)).toBeVisible()
})

test('human staff replies without auto agent', async ({ page }) => {
  await page.goto('/console')
  await page.getByRole('button', { name: 'Bắt đầu Web Call' }).click()
  await page.getByRole('button', { name: 'Nhân viên' }).click()
  await page.getByRole('button', { name: 'Gửi yêu cầu mẫu' }).click()
  await expect(page.getByText(/chuyến giường nằm 22:00/i)).toHaveCount(0)
  await page.getByLabel('Phản hồi của nhân viên').fill('Dạ em kiểm tra chuyến phù hợp ngay ạ.')
  await page.getByRole('button', { name: 'Gửi & nói' }).click()
  await expect(page.getByText('Dạ em kiểm tra chuyến phù hợp ngay ạ.')).toBeVisible()
})
```

- [ ] **Step 2: Run full local gates**

Run each command and require exit code 0:

```bash
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build
git diff --check
```

- [ ] **Step 3: Browser verification**

Start dev server, then use agent-browser to load `/console`, check meaningful content, no Next overlay, no console errors, auto flow, human flow, and mobile viewport.

- [ ] **Step 4: Security scan**

Scan tracked files for private-key and API-key patterns. Output filenames only on a match. Do not read or print ignored environment files.

- [ ] **Step 5: Commit feature release candidate**

```bash
git add apps/web/e2e docs/vedi-release-manifest.md tasks/TASK-002-bus-ticket-agent-demo.md
git commit -m "test: verify Vedi bus ticket demo"
```

- [ ] **Step 6: Sync and integrate**

No `origin` exists. Verify `dev` has not moved, merge the verified feature into local `dev` under the user's explicit auto-approval, then re-run all gates on final `dev`.

- [ ] **Step 7: Deploy with current Vercel CLI**

Use `pnpm dlx vercel@latest` because installed CLI `56.2.1` is older than `56.3.1`. Build production from the verified local source, deploy to the existing Vercel project, keep the old alias, and add a VéĐi alias if available.

- [ ] **Step 8: Production smoke and close task**

Verify deployment target `production`, state `Ready`, `/api/health`, `/console`, auto booking flow, and no browser error overlay. Record deployment ID, URL, source SHA, gate counts, and external LiveKit caveat. Mark TASK-002 Done only after this evidence exists.
