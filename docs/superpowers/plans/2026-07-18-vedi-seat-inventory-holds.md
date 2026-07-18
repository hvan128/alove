# VéĐi Seat Inventory and Holds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add staff-only per-trip seat state, conflict-safe ten-minute holds, expiry/release, and atomic booking confirmation while preserving current seat extraction and demo assignment.

**Architecture:** Keep `BookingDraft.seats` as conversation/display state, bind it to `catalogVersionId`, `tripId`, and `seatHoldId`, and make inventory authoritative. Memory and Neon repositories share one interface; Neon uses WebSocket transactions from Plan 1.

**Tech Stack:** TypeScript 5.9, Zod 4, Vitest 4, Drizzle ORM 0.45, PostgreSQL transactions, Next.js 16 App Router.

## Global Constraints

- Requires completed `2026-07-18-vedi-catalog-publish-foundation.md`.
- Default hold duration is exactly 10 minutes; automatic renewals cap at 30 cumulative minutes per session.
- States are exactly `available`, `held`, `booked`, `blocked`.
- One trip seat has at most one active hold/booking owner.
- Caller has no seat-map mutation endpoint.
- Confirmation, hold consumption, immutable booking, and audit commit atomically.
- Persistence failure never reports hold or booking success.
- Preserve `createBusDemoCatalog()`, seat speech extraction, manual seat evidence, and existing deterministic tests.
- Follow TDD and commit each independently testable task.

---

### Task 1: Inventory contracts and booking references

**Files:**
- Create: `packages/contracts/src/inventory.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/test/contracts.test.ts`
- Create: `packages/contracts/test/inventory.test.ts`
- Modify: `packages/core/src/bus-booking.ts`
- Modify: `packages/core/test/bus-booking.test.ts`

**Interfaces:**
- Produces: `TripSeat`, `SeatHold`, hold command/result schemas; optional authoritative references on `BookingDraft`.

- [ ] **Step 1: Write failing tests**

```ts
it('parses an active seat hold', () => {
  expect(seatHoldSchema.parse({ id: 'hold-1', sessionCode: 'DEMO42', bookingDraftId: 'booking-DEMO42', tripId: 'trip-1', seatCodes: ['A05', 'A06'], actorId: 'staff-1', status: 'active', createdAt: now, expiresAt: later, maxExpiresAt: max, releasedAt: null, consumedAt: null }).status).toBe('active')
})
it('requires authoritative references for durable confirmed drafts', () => {
  expect(bookingDraftSchema.safeParse({ ...confirmedDraft, runtimeProfile: 'durable', catalogVersionId: null, tripId: null, seatHoldId: null }).success).toBe(false)
})
```

- [ ] **Step 2: Run and verify missing schema failure**

Run: `pnpm --filter @ordervoice/contracts test -- inventory.test.ts`

Expected: FAIL because inventory schemas do not exist.

- [ ] **Step 3: Add schemas and extend booking draft**

```ts
// packages/contracts/src/inventory.ts
import { z } from 'zod'
export const tripSeatStateSchema = z.enum(['available', 'held', 'booked', 'blocked'])
export const tripSeatSchema = z.object({ tripId: z.string().min(1), seatCode: z.string().min(1), state: tripSeatStateSchema, revision: z.number().int().nonnegative(), activeHoldId: z.string().min(1).nullable(), bookingId: z.string().min(1).nullable() }).strict()
export const seatHoldStatusSchema = z.enum(['active', 'released', 'expired', 'consumed'])
export const seatHoldSchema = z.object({ id: z.string().min(1), sessionCode: z.string().regex(/^[A-Z0-9]{4,12}$/u), bookingDraftId: z.string().min(1), tripId: z.string().min(1), seatCodes: z.array(z.string().min(1)).min(1), actorId: z.string().min(1), status: seatHoldStatusSchema, createdAt: z.string().datetime(), expiresAt: z.string().datetime(), maxExpiresAt: z.string().datetime(), releasedAt: z.string().datetime().nullable(), consumedAt: z.string().datetime().nullable() }).strict()
export const holdSeatsCommandSchema = z.object({ sessionCode: z.string().regex(/^[A-Z0-9]{4,12}$/u), bookingDraftId: z.string().min(1), tripId: z.string().min(1), seatCodes: z.array(z.string().min(1)).min(1), expectedInventoryRevision: z.number().int().nonnegative() }).strict()
export type TripSeat = z.infer<typeof tripSeatSchema>
export type SeatHold = z.infer<typeof seatHoldSchema>
export type HoldSeatsCommand = z.infer<typeof holdSeatsCommandSchema>
```

Export it from `index.ts`. Extend `bookingDraftSchema` with `runtimeProfile: z.enum(['demo','durable']).default('demo')`, `catalogVersionId`, `tripId`, and `seatHoldId`, all nullable/default null. In `superRefine`, require all three only when status is confirmed and runtime profile is durable.

Update `createInitialBooking()` to return `runtimeProfile: 'demo'`, `catalogVersionId: null`, `tripId: null`, and `seatHoldId: null`. Update typed test fixtures with the same fields; do not change current seat extraction expectations.

- [ ] **Step 4: Run tests/typecheck**

Run: `pnpm --filter @ordervoice/contracts test && pnpm --filter @ordervoice/contracts typecheck`

Expected: PASS after updating existing fixtures with defaults or explicit values.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts packages/core/src/bus-booking.ts packages/core/test/bus-booking.test.ts
git commit -m "feat: define seat inventory contracts"
```

### Task 2: Pure inventory state rules

**Files:**
- Create: `packages/core/src/inventory.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/test/inventory.test.ts`

**Interfaces:**
- Produces: `createSeatHold`, `renewSeatHold`, `releaseSeatHold`, `expireSeatHold`, `assertHoldCanConfirm`.

- [ ] **Step 1: Write failing state tests**

```ts
it('caps automatic renewal at thirty minutes', () => {
  const hold = createSeatHold(command, actor, '2026-07-18T10:00:00.000Z')
  expect(renewSeatHold(hold, '2026-07-18T10:09:00.000Z').expiresAt).toBe('2026-07-18T10:19:00.000Z')
  expect(() => renewSeatHold({ ...hold, expiresAt: '2026-07-18T10:29:00.000Z' }, '2026-07-18T10:29:00.000Z')).toThrow('HOLD_MAX_DURATION')
})
it('rejects confirmation after expiry', () => {
  expect(() => assertHoldCanConfirm(hold, draft, '2026-07-18T10:11:00.000Z')).toThrow('HOLD_EXPIRED')
})
```

- [ ] **Step 2: Run and verify missing module failure**

Run: `pnpm --filter @ordervoice/core test -- inventory.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement deterministic clock-driven rules**

```ts
const HOLD_MS = 10 * 60_000
const MAX_HOLD_MS = 30 * 60_000
export function createSeatHold(command: HoldSeatsCommand, actor: OperatorActor, now: string): SeatHold {
  const start = Date.parse(now)
  return { id: `hold-${command.sessionCode}-${start}`, sessionCode: command.sessionCode, bookingDraftId: command.bookingDraftId, tripId: command.tripId, seatCodes: [...new Set(command.seatCodes)].sort(), actorId: actor.id, status: 'active', createdAt: now, expiresAt: new Date(start + HOLD_MS).toISOString(), maxExpiresAt: new Date(start + MAX_HOLD_MS).toISOString(), releasedAt: null, consumedAt: null }
}
export function renewSeatHold(hold: SeatHold, now: string): SeatHold {
  if (hold.status !== 'active' || Date.parse(now) >= Date.parse(hold.expiresAt)) throw new Error('HOLD_EXPIRED')
  const next = Date.parse(now) + HOLD_MS
  if (next > Date.parse(hold.maxExpiresAt)) throw new Error('HOLD_MAX_DURATION')
  return { ...hold, expiresAt: new Date(next).toISOString() }
}
export function releaseSeatHold(hold: SeatHold, now: string): SeatHold { if (hold.status !== 'active') return hold; return { ...hold, status: 'released', releasedAt: now } }
export function expireSeatHold(hold: SeatHold, now: string): SeatHold { return hold.status === 'active' && Date.parse(now) >= Date.parse(hold.expiresAt) ? { ...hold, status: 'expired', releasedAt: now } : hold }
export function assertHoldCanConfirm(hold: SeatHold, draft: BookingDraft, now: string): void {
  if (hold.status !== 'active' || Date.parse(now) >= Date.parse(hold.expiresAt)) throw new Error('HOLD_EXPIRED')
  if (hold.bookingDraftId !== draft.id || hold.tripId !== draft.tripId || hold.seatCodes.join('|') !== [...draft.seats].sort().join('|')) throw new Error('HOLD_SCOPE_CONFLICT')
}
```

- [ ] **Step 4: Run core tests**

Run: `pnpm --filter @ordervoice/core test && pnpm --filter @ordervoice/core typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat: add deterministic seat hold rules"
```

### Task 3: Inventory schema and migration

**Files:**
- Create: `db/inventory-schema.ts`
- Modify: `db/schema.ts`
- Create: `db/migrations/0004_trip_seat_inventory.sql`
- Modify: `db/test/db.test.ts`

**Interfaces:**
- Produces: `tripSeats`, `seatHolds`, `seatHoldItems`, `inventoryEvents`, `bookingConfirmations`, `confirmedBookings`, booking authoritative reference columns.

- [ ] **Step 1: Add failing schema test**

```ts
expect([tripSeats, seatHolds, seatHoldItems, inventoryEvents, bookingConfirmations, confirmedBookings].map(getTableName)).toEqual(['trip_seats', 'seat_holds', 'seat_hold_items', 'inventory_events', 'booking_confirmations', 'confirmed_bookings'])
```

- [ ] **Step 2: Run DB tests and verify missing exports**

Run: `pnpm --filter @ordervoice/db test`

Expected: FAIL.

- [ ] **Step 3: Add Drizzle tables and SQL migration**

```ts
export const tripSeats = pgTable('trip_seats', { id: text('id').primaryKey(), tripId: text('trip_id').notNull().references(() => catalogTrips.id, { onDelete: 'cascade' }), seatCode: text('seat_code').notNull(), state: text('state').notNull().default('available'), revision: integer('revision').notNull().default(0), activeHoldId: text('active_hold_id'), bookingId: text('booking_id'), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex('trip_seats_trip_code_unique').on(table.tripId, table.seatCode)])
export const seatHolds = pgTable('seat_holds', { id: text('id').primaryKey(), callId: text('call_id').notNull().references(() => busCalls.id, { onDelete: 'cascade' }), bookingDraftId: text('booking_draft_id').notNull().references(() => busBookings.id, { onDelete: 'cascade' }), tripId: text('trip_id').notNull().references(() => catalogTrips.id), actorId: text('actor_id').notNull(), status: text('status').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull(), expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), maxExpiresAt: timestamp('max_expires_at', { withTimezone: true }).notNull(), releasedAt: timestamp('released_at', { withTimezone: true }), consumedAt: timestamp('consumed_at', { withTimezone: true }) })
export const seatHoldItems = pgTable('seat_hold_items', { holdId: text('hold_id').notNull().references(() => seatHolds.id, { onDelete: 'cascade' }), tripSeatId: text('trip_seat_id').notNull().references(() => tripSeats.id), seatCode: text('seat_code').notNull() }, (table) => [primaryKey({ columns: [table.holdId, table.tripSeatId] })])
export const inventoryEvents = pgTable('inventory_events', { id: text('id').primaryKey(), tripId: text('trip_id').notNull(), holdId: text('hold_id'), eventType: text('event_type').notNull(), actorId: text('actor_id').notNull(), payload: jsonb('payload').notNull().default({}), correlationId: text('correlation_id').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() })
export const bookingConfirmations = pgTable('booking_confirmations', { id: text('id').primaryKey(), callId: text('call_id').notNull().references(() => busCalls.id), bookingDraftId: text('booking_draft_id').notNull().references(() => busBookings.id), holdId: text('hold_id').notNull().references(() => seatHolds.id), actorId: text('actor_id').notNull(), idempotencyScope: text('idempotency_scope').notNull(), idempotencyKey: text('idempotency_key').notNull(), requestHash: text('request_hash').notNull(), acceptedSummaryHash: text('accepted_summary_hash').notNull(), outcome: text('outcome').notNull(), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex('booking_confirmations_scope_key_unique').on(table.idempotencyScope, table.idempotencyKey)])
export const confirmedBookings = pgTable('confirmed_bookings', { id: text('id').primaryKey(), bookingCode: text('booking_code').notNull(), callId: text('call_id').notNull().references(() => busCalls.id), bookingDraftId: text('booking_draft_id').notNull().references(() => busBookings.id), confirmationId: text('confirmation_id').notNull().references(() => bookingConfirmations.id), holdId: text('hold_id').notNull().references(() => seatHolds.id), snapshot: jsonb('snapshot').notNull(), confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull() }, (table) => [uniqueIndex('confirmed_bookings_code_unique').on(table.bookingCode), uniqueIndex('confirmed_bookings_confirmation_unique').on(table.confirmationId)])
```

Migration adds state/status checks plus `catalog_version_id`, `trip_id`, `seat_hold_id`, `runtime_profile` columns to `bus_bookings`. Active ownership lives on locked `trip_seats.active_hold_id`; `seat_hold_items` stays append-only history.

- [ ] **Step 4: Verify schema**

Run: `pnpm --filter @ordervoice/db test && pnpm --filter @ordervoice/db typecheck && rg -n "trip_seats|seat_holds|booking_confirmations|confirmed_bookings|CHECK|UNIQUE" db/migrations/0004_trip_seat_inventory.sql`

Expected: PASS; migration contains state/status checks, inventory indexes, scoped idempotency uniqueness and immutable booking uniqueness.

- [ ] **Step 5: Commit**

```bash
git add db
git commit -m "feat: add trip seat inventory schema"
```

### Task 4: Atomic inventory repository

**Files:**
- Create: `apps/web/src/lib/inventory/inventory-repository.ts`
- Create: `apps/web/src/lib/inventory/inventory-repository.test.ts`
- Create: `apps/web/src/lib/inventory/inventory-neon.integration.test.ts`

**Interfaces:**
- Produces: `InventoryRepository.getTripInventory`, `hold`, `renew`, `release`, `releaseForSession`, `consume`.

- [ ] **Step 1: Write concurrent memory test**

```ts
it('allows one winner for concurrent holds', async () => {
  const repo = createInventoryRepository({}, seededMemoryInventory())
  const results = await Promise.allSettled([repo.hold(command('CALL1'), staff, now), repo.hold(command('CALL2'), staff, now)])
  expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter((item) => item.status === 'rejected' && String(item.reason).includes('SEAT_NOT_AVAILABLE'))).toHaveLength(1)
})
```

- [ ] **Step 2: Run and verify failure**

Run: `pnpm --filter @ordervoice/web test -- inventory-repository.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement serialized memory mutation and Neon row locking**

```ts
export type InventoryRepository = {
  mode: 'memory' | 'neon'
  getTripInventory(tripId: string, now: string): Promise<{ revision: number; seats: TripSeat[] }>
  hold(command: HoldSeatsCommand, actor: OperatorActor, now: string): Promise<SeatHold>
  renew(holdId: string, actor: OperatorActor, now: string): Promise<SeatHold>
  release(holdId: string, actor: OperatorActor, now: string, reason: string): Promise<SeatHold>
  releaseForSession(sessionCode: string, actor: OperatorActor, now: string, reason: string): Promise<number>
  consume(holdId: string, bookingId: string, actor: OperatorActor, now: string): Promise<SeatHold>
  setBlocked(tripId: string, seatCodes: string[], blocked: boolean, actor: OperatorActor, now: string): Promise<TripSeat[]>
}
```

Memory implementation chains mutations through one `Promise` mutex. Neon `hold` uses one `db.transaction`: expire stale holds, select requested `trip_seats FOR UPDATE`, reject missing/non-available rows, insert hold/items/event, update seats to held and increment revisions. Map unique violation `23505` to `SEAT_NOT_AVAILABLE`. `setBlocked` permits only admin/dispatcher, locks rows, rejects held/booked seats, changes `available <-> blocked`, and appends one inventory event.

Create `inventory-neon.integration.test.ts` using `describe.runIf(Boolean(process.env.DATABASE_URL))`. Seed one catalog trip and seat inside `beforeEach`, launch two `hold()` promises, assert exactly one fulfillment, then delete only records prefixed `it-inventory-` in `afterEach`.

- [ ] **Step 4: Run repository tests**

Run: `pnpm --filter @ordervoice/web test -- inventory-repository.test.ts && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/inventory
git commit -m "feat: add atomic seat inventory repository"
```

### Task 5: Authoritative confirmation service

**Files:**
- Create: `apps/web/src/lib/booking/confirm-booking.ts`
- Create: `apps/web/src/lib/booking/confirm-booking.test.ts`
- Modify: `apps/web/src/lib/db/session-repository.ts`

**Interfaces:**
- Produces: `confirmBookingWithHold(command, actor, deps)`.

- [ ] **Step 1: Write atomicity/idempotency tests**

```ts
it('consumes hold and returns same booking on exact retry', async () => {
  const first = await confirmBookingWithHold(command, staff, deps)
  const retry = await confirmBookingWithHold(command, staff, deps)
  expect(retry.bookingCode).toBe(first.bookingCode)
  expect(deps.inventory.consume).toHaveBeenCalledTimes(1)
})
it('does not confirm after hold expiry', async () => {
  await expect(confirmBookingWithHold(command, staff, expiredDeps)).rejects.toThrow('HOLD_EXPIRED')
})
```

- [ ] **Step 2: Run and verify missing service**

Run: `pnpm --filter @ordervoice/web test -- confirm-booking.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement service with injected transaction boundary**

```ts
export type ConfirmBookingCommand = { sessionCode: string; bookingDraftId: string; holdId: string; acceptedSummaryHash: string; idempotencyKey: string; expectedRevision: number }
export async function confirmBookingWithHold(command: ConfirmBookingCommand, actor: OperatorActor, deps: ConfirmationDependencies): Promise<BookingDraft> {
  requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
  return deps.transaction(async (tx) => {
    const prior = await tx.findConfirmation(command.idempotencyKey, command.sessionCode, actor.id)
    if (prior) {
      if (prior.requestHash !== hashConfirmation(command)) throw new Error('IDEMPOTENCY_CONFLICT')
      return prior.booking
    }
    const draft = await tx.lockDraft(command.bookingDraftId)
    if (!draft || draft.revision !== command.expectedRevision) throw new Error('BOOKING_VERSION_CONFLICT')
    const hold = await tx.lockHold(command.holdId)
    assertHoldCanConfirm(hold, draft.booking, deps.now())
    const booking = confirmBooking(draft.booking, 'staff')
    await tx.consumeHold(hold.id, booking.id, actor, deps.now())
    await tx.insertConfirmationAndAudit(command, booking, actor)
    return booking
  })
}
```

Memory dependency snapshots state and rolls back on throw. Neon dependency uses one `getDb().transaction` and row locks.

- [ ] **Step 4: Run confirmation and regression tests**

Run: `pnpm --filter @ordervoice/web test -- confirm-booking.test.ts session-repository.test.ts && pnpm test`

Expected: PASS; old demo confirmation still works only in demo runtime profile.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/booking apps/web/src/lib/db/session-repository.ts
git commit -m "feat: confirm bookings with seat holds"
```

### Task 6: Inventory and confirmation HTTP boundary

**Files:**
- Create: `apps/web/src/app/api/trips/[tripId]/inventory/route.ts`
- Create: `apps/web/src/app/api/trips/[tripId]/inventory/block/route.ts`
- Create: `apps/web/src/app/api/seat-holds/route.ts`
- Create: `apps/web/src/app/api/seat-holds/[holdId]/renew/route.ts`
- Create: `apps/web/src/app/api/seat-holds/[holdId]/release/route.ts`
- Create: `apps/web/src/app/api/bookings/[sessionCode]/confirm/route.ts`
- Create: `apps/web/src/lib/inventory/inventory-http.test.ts`
- Modify: `apps/web/src/hooks/use-call-session.ts`

**Interfaces:**
- Produces: role-gated inventory JSON API and durable confirmation call from staff controller.

- [ ] **Step 1: Write route tests for caller denial, conflicts, and expiry**

```ts
it('does not accept actor role from JSON', async () => {
  const response = await POST(request({ ...command, role: 'admin' }), context)
  expect(response.status).toBe(503)
})
it('maps unavailable seats to 409 with fresh revision', async () => {
  expect(await conflictResponse.json()).toMatchObject({ error: 'SEAT_NOT_AVAILABLE', inventoryRevision: 3 })
})
```

- [ ] **Step 2: Run and verify route failure**

Run: `pnpm --filter @ordervoice/web test -- inventory-http.test.ts`

Expected: FAIL.

- [ ] **Step 3: Implement handlers with shared mapper**

Map `FORBIDDEN` to 403, `SEAT_NOT_AVAILABLE`/version/idempotency conflicts to 409, `HOLD_EXPIRED` to 410, validation to 400, auth/persistence unavailable to 503. GET inventory permits operator roles; all mutations reject `read-only`. Responses use `Cache-Control: no-store`.

Extend `CallSessionController`:

```ts
holdSeats: (tripId: string, seatCodes: string[], inventoryRevision: number) => Promise<SeatHold>
renewSeatHold: () => Promise<SeatHold>
releaseSeatHold: () => Promise<void>
confirmBooking: () => Promise<void>
```

In durable profile, call APIs and dispatch returned booking snapshot only after success. `renewSeatHold` calls the renew endpoint and replaces hold state only after success. Block endpoint permits admin/dispatcher only and rejects held/booked seats with 409. In demo profile, preserve existing synchronous confirmation.

- [ ] **Step 4: Run web tests/typecheck**

Run: `pnpm --filter @ordervoice/web test && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/trips apps/web/src/app/api/seat-holds apps/web/src/app/api/bookings apps/web/src/lib/inventory/inventory-http.test.ts apps/web/src/hooks/use-call-session.ts
git commit -m "feat: expose seat holds and durable confirmation"
```

### Task 7: Release holds on lifecycle changes

**Files:**
- Modify: `apps/web/src/hooks/use-call-session.ts`
- Modify: `apps/web/src/components/staff/staff-workspace.tsx`
- Modify: `apps/web/src/hooks/use-call-session.test.tsx`

**Interfaces:**
- Consumes: `releaseSeatHold`, booking trip/seat changes, end-call action.
- Produces: automatic explicit release with reason.

- [ ] **Step 1: Add failing lifecycle tests**

```ts
it.each(['trip_changed', 'seats_changed', 'call_ended'])('releases active hold for %s', async (reason) => {
  // render controller with mocked fetch, create hold, trigger corresponding action
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/release'), expect.objectContaining({ method: 'POST', body: expect.stringContaining(reason) }))
})
```

- [ ] **Step 2: Run focused tests and verify missing release calls**

Run: `pnpm --filter @ordervoice/web test -- use-call-session.test.tsx`

Expected: FAIL.

- [ ] **Step 3: Add release-before-replace ordering**

Store current hold in a ref. Before changing `selectedTrip` or `seats`, await release, then edit. `endCall` sends release with `call_ended` before publishing end event. `pagehide` uses `fetch(..., { keepalive: true })` only for best-effort release; server expiry remains authoritative.

- [ ] **Step 4: Run regressions**

Run: `pnpm --filter @ordervoice/web test -- use-call-session.test.tsx staff-workspace.test.tsx && pnpm test`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-call-session.ts apps/web/src/hooks/use-call-session.test.tsx apps/web/src/components/staff/staff-workspace.tsx
git commit -m "feat: release holds on booking lifecycle changes"
```

### Task 8: Inventory acceptance gate

**Files:**
- Modify only defects found in Tasks 1–7.

- [ ] **Step 1: Run full verification**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Expected: PASS; current seat extraction tests still expect `A05`, `A06`; durable confirmation cannot succeed without active matching hold.

- [ ] **Step 2: Run local PostgreSQL transaction smoke**

Run: `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/ordervoice_test pnpm --filter @ordervoice/web test -- inventory-neon.integration.test.ts`

Expected: two concurrent holds for same seat yield one success/one `SEAT_NOT_AVAILABLE`; expired hold cannot confirm; exact retry returns one booking.

- [ ] **Step 3: Commit verification fixes if needed**

```bash
git add packages/contracts packages/core db apps/web pnpm-lock.yaml
git commit -m "fix: close seat inventory verification gaps"
```

Skip when no files changed.
