# VéĐi Operations Dashboard and Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship Apple-like operations dashboard, catalog administration, vehicle/seat template editor, and staff-only inventory seat picker on top of Plans 1–2.

**Architecture:** Server components query role-gated read models; client components own only interaction state. Dashboard stays cross-session and opens focused staff cockpit. Catalog and seat mutations use existing APIs; caller route remains unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Phosphor Icons, Vitest/Testing Library, Playwright.

## Global Constraints

- Requires completed catalog and inventory plans.
- Apple-like means calm hierarchy, generous whitespace, system typography, restrained translucent surfaces, hairlines, compact semantic color; do not copy Apple UI.
- Minimum target size is 44px; support keyboard and reduced motion.
- Seat state uses text/icon/accessible name, not color alone.
- Dashboard is operations landing; transcript remains in focused staff cockpit.
- Caller never receives seat-map controls.
- UI never invents role, catalog status, inventory state, hold success, or booking success.
- All pages label `memory` as `Mô phỏng · không bền vững`.
- Follow TDD and focused commits.

---

### Task 1: Operator shell and server-side access gate

**Files:**
- Create: `apps/web/src/components/operations/operations-shell.tsx`
- Create: `apps/web/src/components/operations/operations-shell.test.tsx`
- Create: `apps/web/src/app/operations/layout.tsx`
- Create: `apps/web/src/app/admin/layout.tsx`
- Modify: `apps/web/src/components/ui/app-shell.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Consumes: `getOperatorActor(process.env)`.
- Produces: `OperationsShell({ actor, mode, children })` and fail-closed layouts.

- [ ] **Step 1: Write failing shell tests**

```tsx
it('shows role-scoped navigation and non-durable label', () => {
  render(<OperationsShell actor={{ id: 'demo-admin', role: 'admin', demo: true }} mode="memory"><div>Body</div></OperationsShell>)
  expect(screen.getByRole('link', { name: 'Tổng quan' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Tuyến & chuyến' })).toBeVisible()
  expect(screen.getByText('Mô phỏng · không bền vững')).toBeVisible()
})
it('hides admin links from customer-care', () => {
  render(<OperationsShell actor={{ id: 'staff-1', role: 'customer-care', demo: false }} mode="neon"><div /></OperationsShell>)
  expect(screen.queryByRole('link', { name: 'Tuyến & chuyến' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run and verify component failure**

Run: `pnpm --filter @ordervoice/web test -- operations-shell.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Build shell and layouts**

```tsx
export function OperationsShell({ actor, mode, children }: { actor: OperatorActor; mode: 'memory' | 'neon'; children: ReactNode }) {
  const admin = actor.role === 'admin' || actor.role === 'dispatcher'
  return <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:grid lg:grid-cols-[228px_1fr]">
    <aside className="border-r border-[var(--divider)] bg-[color-mix(in_srgb,var(--surface)_76%,transparent)] p-4 backdrop-blur-xl">
      <Link href="/operations" className="flex min-h-11 items-center gap-3 rounded-xl px-3 font-semibold">VéĐi</Link>
      <nav aria-label="Vận hành" className="mt-8 space-y-1">
        <Nav href="/operations" label="Tổng quan" />
        <Nav href="/operations#calls" label="Cuộc gọi" />
        <Nav href="/reports" label="Báo cáo" />
        {admin ? <><Nav href="/admin/catalog" label="Tuyến & chuyến" /><Nav href="/admin/vehicles" label="Xe & sơ đồ ghế" /></> : null}
      </nav>
      <p className="mt-8 text-xs text-[var(--muted)]">{mode === 'memory' ? 'Mô phỏng · không bền vững' : actor.role}</p>
    </aside>
    <main className="min-w-0 p-4 sm:p-6 lg:p-10">{children}</main>
  </div>
}
```

Layouts call `getOperatorActor`; map `OPERATOR_AUTH_UNCONFIGURED` to a clear 503-style page, never demo-admin implicitly. Add `--glass-surface` and `--metric-shadow` tokens; keep existing dark-mode behavior.

- [ ] **Step 4: Run shell tests and accessibility assertions**

Run: `pnpm --filter @ordervoice/web test -- operations-shell.test.tsx ui.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/operations apps/web/src/app/operations/layout.tsx apps/web/src/app/admin/layout.tsx apps/web/src/components/ui/app-shell.tsx apps/web/src/app/globals.css
git commit -m "feat: add operator workspace shell"
```

### Task 2: Operations read model

**Files:**
- Create: `apps/web/src/lib/operations/operations-repository.ts`
- Create: `apps/web/src/lib/operations/operations-repository.test.ts`
- Create: `apps/web/src/app/api/operations/dashboard/route.ts`

**Interfaces:**
- Produces: `OperationsDashboardSnapshot` and `getDashboard(at)`.

- [ ] **Step 1: Write failing projection tests**

```ts
it('projects queue, calls, bookings, departures and alerts', async () => {
  const snapshot = await createOperationsRepository({}, seededOperations()).getDashboard('2026-07-18T10:00:00.000Z')
  expect(snapshot.metrics).toMatchObject({ queuedCalls: 4, activeCalls: 3, confirmedBookings: 18 })
  expect(snapshot.departures[0]).toMatchObject({ tripId: 'trip-1', available: 5, capacity: 34 })
  expect(snapshot.freshAt).toBe('2026-07-18T10:00:00.000Z')
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @ordervoice/web test -- operations-repository.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement read model interface and repositories**

```ts
export type OperationsDashboardSnapshot = {
  mode: 'memory' | 'neon'; freshAt: string
  metrics: { queuedCalls: number; longestWaitSeconds: number; activeCalls: number; callsToday: number; confirmedBookings: number; conversionRate: number; agentAssistRate: number }
  queue: Array<{ sessionCode: string; routeLabel: string; waitSeconds: number; passengerCount: number | null }>
  activeCalls: Array<{ sessionCode: string; ownerId: string | null; authority: 'human' | 'auto'; bookingState: string; startedAt: string }>
  departures: Array<{ tripId: string; routeLabel: string; departureAt: string; vehicleLabel: string; available: number; held: number; booked: number; capacity: number }>
  alerts: Array<{ id: string; severity: 'info' | 'warning' | 'danger'; message: string }>
}
export type OperationsRepository = { mode: 'memory' | 'neon'; getDashboard(at: string): Promise<OperationsDashboardSnapshot> }
```

Memory returns seeded deterministic `DEMO42` values. Neon uses aggregate queries over `bus_calls`, `bus_bookings`, `catalog_trips`, `trip_seats`, and recent audit/inventory events. Guard division by zero. Route handler requires any operator role and sets `Cache-Control: no-store`.

- [ ] **Step 4: Run repository/API tests**

Run: `pnpm --filter @ordervoice/web test -- operations-repository.test.ts && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/operations apps/web/src/app/api/operations
git commit -m "feat: project operator dashboard metrics"
```

### Task 3: Apple-like operations dashboard

**Files:**
- Create: `apps/web/src/app/operations/page.tsx`
- Create: `apps/web/src/components/operations/metric-card.tsx`
- Create: `apps/web/src/components/operations/call-queue.tsx`
- Create: `apps/web/src/components/operations/active-call-list.tsx`
- Create: `apps/web/src/components/operations/departure-list.tsx`
- Create: `apps/web/src/components/operations/operations-dashboard.tsx`
- Create: `apps/web/src/components/operations/operations-dashboard.test.tsx`

**Interfaces:**
- Consumes: `OperationsDashboardSnapshot`.
- Produces: dashboard matching approved hierarchy.

- [ ] **Step 1: Write failing dashboard test**

```tsx
it('renders KPIs, queue, departures, freshness and accessible actions', () => {
  render(<OperationsDashboard snapshot={snapshot} />)
  expect(screen.getByRole('heading', { name: /chào buổi sáng/iu })).toBeVisible()
  expect(screen.getByText('04')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Nhận cuộc gọi DEMO42' })).toHaveAttribute('href', '/staff?session=DEMO42')
  expect(screen.getByText('Agent tự động · collecting')).toBeVisible()
  expect(screen.getByText(/cập nhật lúc/iu)).toBeVisible()
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @ordervoice/web test -- operations-dashboard.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement dashboard components**

Server page gets actor/repository snapshot and renders `OperationsDashboard`. Use four `MetricCard`s; queue rows link to `/staff?session=...`; departures show labeled occupancy bar with numeric text; alerts use semantic labels. Use rounded 24px surfaces, restrained blur, `tracking-[-0.04em]`, no hardcoded white outside tokens.

```tsx
export function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <article className="rounded-3xl border border-[var(--hairline)] bg-[var(--glass-surface)] p-5 shadow-[var(--metric-shadow)]">
    <p className="text-xs text-[var(--muted)]">{label}</p><p className="mt-6 text-4xl font-semibold tracking-[-0.05em]">{value}</p><p className="mt-2 text-xs text-[var(--muted)]">{note}</p>
  </article>
}
```

- [ ] **Step 4: Run UI tests**

Run: `pnpm --filter @ordervoice/web test -- operations-dashboard.test.tsx && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/operations/page.tsx apps/web/src/components/operations
git commit -m "feat: add Apple-like operations dashboard"
```

### Task 4: Catalog Admin UI and CSV dry run

**Files:**
- Create: `apps/web/src/app/admin/catalog/page.tsx`
- Create: `apps/web/src/components/catalog/catalog-workspace.tsx`
- Create: `apps/web/src/components/catalog/catalog-version-bar.tsx`
- Create: `apps/web/src/components/catalog/catalog-table.tsx`
- Create: `apps/web/src/components/catalog/catalog-import-dialog.tsx`
- Create: `apps/web/src/components/catalog/catalog-workspace.test.tsx`

**Interfaces:**
- Consumes: catalog APIs from Plan 1.
- Produces: draft editor, validation issue display, diff summary, CSV dry run, publish action.

- [ ] **Step 1: Write failing interaction test**

```tsx
it('blocks publish while validation has blocking issues', async () => {
  render(<CatalogWorkspace initial={draftWithIssue} actorRole="admin" />)
  expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()
  expect(screen.getByText('Mẫu xe không tồn tại.')).toBeVisible()
})
it('previews CSV errors without applying rows', async () => {
  await user.upload(screen.getByLabelText('Nhập CSV'), csvFile)
  expect(await screen.findByText('Dòng 2 · INVALID_ARRIVAL_AT')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Áp dụng dòng hợp lệ' })).toBeDisabled()
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @ordervoice/web test -- catalog-workspace.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement workspace**

Use tabs `Chi nhánh & điểm`, `Tuyến`, `Chuyến`, `Xe`, `Giá`; each edit sends expected revision. Version bar shows published vs draft counts and validation state. Branch/stop forms preserve ordered route stop IDs. CSV dialog calls dry-run endpoint, lists row errors, and applies valid rows only after explicit click. Publish requires admin, zero blocking issues, confirmation dialog, and effective time. On 409, show “Catalog đã đổi; tải lại diff” and preserve local form values for copy.

- [ ] **Step 4: Run tests/typecheck**

Run: `pnpm --filter @ordervoice/web test -- catalog-workspace.test.tsx && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/admin/catalog apps/web/src/components/catalog
git commit -m "feat: add catalog administration workspace"
```

### Task 5: Vehicle template editor

**Files:**
- Create: `apps/web/src/app/admin/vehicles/page.tsx`
- Create: `apps/web/src/components/vehicles/vehicle-template-editor.tsx`
- Create: `apps/web/src/components/vehicles/seat-cell.tsx`
- Create: `apps/web/src/components/vehicles/vehicle-template-editor.test.tsx`

**Interfaces:**
- Consumes: `VehicleTemplate`, catalog save API.
- Produces: keyboard-operable 1–2 floor grid editor.

- [ ] **Step 1: Write failing accessibility/validation tests**

```tsx
it('adds a seat by keyboard and announces duplicate code', async () => {
  render(<VehicleTemplateEditor template={template} onSave={onSave} />)
  await user.click(screen.getByRole('gridcell', { name: 'Tầng 1 hàng 1 cột 1: trống' }))
  await user.type(screen.getByLabelText('Mã ghế'), 'A01')
  await user.click(screen.getByRole('button', { name: 'Đặt ghế' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Mã ghế A01 bị trùng')
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @ordervoice/web test -- vehicle-template-editor.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement grid editor**

Render `role="grid"`, each cell as 44px button with row/column label. Palette: seat, double-bed, aisle, driver, blocked. Maintain one selected floor. Derive capacity from `seat` and `double-bed` cells. Validate duplicate codes, overlapping coordinates, floor range, and missing codes before save. Do not implement drag-and-drop; click/keyboard is sufficient and accessible.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ordervoice/web test -- vehicle-template-editor.test.tsx && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/admin/vehicles apps/web/src/components/vehicles
git commit -m "feat: add accessible vehicle seat designer"
```

### Task 6: Staff-only seat picker and hold countdown

**Files:**
- Create: `apps/web/src/components/staff/seat-picker.tsx`
- Create: `apps/web/src/components/staff/seat-picker.test.tsx`
- Modify: `apps/web/src/components/staff/booking-form.tsx`
- Modify: `apps/web/src/components/staff/staff-workspace.tsx`
- Modify: `apps/web/src/components/staff/assistant-rail.tsx`
- Modify: `apps/web/src/components/staff/staff-workspace.test.tsx`

**Interfaces:**
- Consumes: trip inventory, `holdSeats`, `releaseSeatHold`, hold expiry.
- Produces: staff-only labeled seat selection and disabled durable confirmation without hold.

- [ ] **Step 1: Write failing picker tests**

```tsx
it('selects only available seats up to passenger count', async () => {
  render(<SeatPicker seats={seats} passengerCount={2} selected={[]} hold={null} onHold={onHold} />)
  await user.click(screen.getByRole('button', { name: 'Ghế A05 · Còn trống' }))
  await user.click(screen.getByRole('button', { name: 'Ghế A06 · Còn trống' }))
  expect(onHold).toHaveBeenCalledWith(['A05', 'A06'])
  expect(screen.getByRole('button', { name: 'Ghế A01 · Đã bán' })).toBeDisabled()
})
it('announces expiry and disables confirm', () => {
  render(<SeatPicker {...props} hold={expiredHold} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Giữ ghế đã hết hạn')
})
it('shows block control only to dispatcher/admin', () => {
  render(<SeatPicker {...props} actorRole="dispatcher" />)
  expect(screen.getByRole('button', { name: 'Khóa ghế A05' })).toBeVisible()
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @ordervoice/web test -- seat-picker.test.tsx staff-workspace.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement picker and cockpit integration**

Seat button labels: `Còn trống`, `Đang giữ`, `Đã bán`, `Khóa`. Use blue/orange/neutral/danger tokens plus visible legend. Selection calls hold only when count equals `passengerCount`. Countdown derives from server `expiresAt`, announces at 60 seconds and expiry, offers “Gia hạn 10 phút” while below `maxExpiresAt`, and offers “Chọn lại” after expiry. Admin/dispatcher gets explicit block/unblock action; customer-care/read-only never sees it. Replace free-text seat input in durable mode; keep it in demo mode for regression compatibility. `AssistantRail` gate requires active matching hold when `runtimeProfile === 'durable'`.

- [ ] **Step 4: Verify no caller seat controls**

Run: `rg -n "SeatPicker|seat-picker|sơ đồ ghế" apps/web/src/components/call apps/web/src/app/call`

Expected: no matches.

- [ ] **Step 5: Run staff tests and commit**

Run: `pnpm --filter @ordervoice/web test -- seat-picker.test.tsx staff-workspace.test.tsx`

Expected: PASS.

```bash
git add apps/web/src/components/staff
git commit -m "feat: add staff seat picker and hold feedback"
```

### Task 7: Operations reports

**Files:**
- Create: `apps/web/src/app/reports/page.tsx`
- Create: `apps/web/src/components/operations/operations-report.tsx`
- Create: `apps/web/src/components/operations/operations-report.test.tsx`
- Modify: `apps/web/src/lib/operations/operations-repository.ts`
- Modify: `apps/web/src/lib/operations/operations-repository.test.ts`

**Interfaces:**
- Produces: `getReport({ from, to })` with call outcomes, conversion, Agent-assist rate and route load.

- [ ] **Step 1: Write failing report test**

```tsx
it('shows range, conversion, Agent assist and route load with numeric labels', () => {
  render(<OperationsReport report={report} />)
  expect(screen.getByRole('heading', { name: 'Báo cáo vận hành' })).toBeVisible()
  expect(screen.getByText('84% chuyển đổi')).toBeVisible()
  expect(screen.getByText('61% Agent hỗ trợ')).toBeVisible()
  expect(screen.getByText('Sài Gòn → Đà Lạt · 29/34')).toBeVisible()
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @ordervoice/web test -- operations-report.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Implement query and server page**

Add `getReport(range: { from: string; to: string })` to `OperationsRepository`. Validate ISO range, cap at 90 days, aggregate outcomes/authority/route occupancy, and return freshness/mode. Render native date inputs, metric cards and accessible horizontal bars with numeric labels. Read-only role may view; no mutation exists.

- [ ] **Step 4: Run reports tests and commit**

Run: `pnpm --filter @ordervoice/web test -- operations-report.test.tsx operations-repository.test.ts && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

```bash
git add apps/web/src/app/reports apps/web/src/components/operations/operations-report.tsx apps/web/src/components/operations/operations-report.test.tsx apps/web/src/lib/operations
git commit -m "feat: add operator operations reports"
```

### Task 8: Full operator E2E story

**Files:**
- Create: `apps/web/e2e/operations.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `apps/web/e2e/console.spec.ts`
- Modify: `docs/current-vs-target-architecture.md`
- Modify: `docs/integration-test-status.md`
- Modify: `docs/release-manifest.md`

**Interfaces:**
- Produces: browser evidence for dashboard, publish, seat hold and confirmation.

- [ ] **Step 1: Add failing E2E path**

```ts
test('operator publishes catalog and staff consumes seat hold', async ({ page, context }) => {
  await page.goto('/admin/catalog')
  await page.getByRole('button', { name: 'Validate' }).click()
  await page.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByText('Published')).toBeVisible()
  const staff = await context.newPage()
  const caller = await context.newPage()
  await staff.goto('/staff?session=OPS42')
  await caller.goto('/call?session=OPS42')
  await caller.getByRole('button', { name: 'Bắt đầu cuộc gọi' }).click()
  await caller.getByRole('button', { name: 'Gửi câu mẫu hành trình' }).click()
  await caller.getByRole('button', { name: 'Gửi câu mẫu hành khách' }).click()
  await expect(staff.getByLabel('Số khách')).toHaveValue('2')
  await staff.getByRole('button', { name: 'Ghế A05 · Còn trống' }).click()
  await staff.getByRole('button', { name: 'Ghế A06 · Còn trống' }).click()
  await expect(staff.getByText(/giữ đến/iu)).toBeVisible()
  await staff.getByRole('button', { name: 'Xác nhận đặt vé' }).click()
  await expect(staff.getByText('Đã xác nhận', { exact: true })).toBeVisible()
})
```

- [ ] **Step 2: Configure explicit demo actor for Playwright and verify initial failure**

Change `webServer.command` to `OPERATOR_DEMO_MODE=true pnpm --filter @ordervoice/web dev --port 3000`.

Run: `pnpm test:e2e -- operations.spec.ts`

Expected: FAIL until seeded catalog/inventory flow is connected end-to-end.

- [ ] **Step 3: Complete deterministic seed wiring and run E2E**

Use one process-level memory store shared by catalog, inventory and operations repositories when `OPERATOR_DEMO_MODE=true`. Seed `DEMO42`, published trip, 34-seat template, and A05/A06 available. Do not seed production mode.

Run: `pnpm test:e2e`

Expected: operations story and existing console stories PASS.

- [ ] **Step 4: Update truth docs from Target to verified status only for observed paths**

Record test command, mode `memory/non-durable`, date, source SHA and failure behavior. Keep Neon concurrency and external operator API unverified until credentialed evidence exists.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e playwright.config.ts docs/current-vs-target-architecture.md docs/integration-test-status.md docs/release-manifest.md
git commit -m "test: verify operator catalog and seat workflow"
```

### Task 9: Release acceptance gate

**Files:**
- Modify only defects found in Tasks 1–7.

- [ ] **Step 1: Run full repository verification**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
git diff --check
```

Expected: all PASS.

- [ ] **Step 2: Manual responsive/accessibility smoke**

Run: `OPERATOR_DEMO_MODE=true pnpm dev:web`

Check `/operations`, `/admin/catalog`, `/admin/vehicles`, `/staff?session=DEMO42` at 390px, 768px, and 1440px. Expected: no horizontal document overflow; navigation reachable; keyboard can operate template/seat grids; reduced-motion removes animation; status meaning survives grayscale.

- [ ] **Step 3: Commit verification fixes if needed**

```bash
git add apps/web docs playwright.config.ts
git commit -m "fix: close operator UI verification gaps"
```

Skip when no changes.
