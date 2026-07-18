import type {
  HoldSeatsCommand,
  OperatorActor,
  SeatHold,
  TripSeat,
} from '@ordervoice/contracts'
import { createSeatHold, expireSeatHold, releaseSeatHold, renewSeatHold } from '@ordervoice/core'
import {
  getDb,
  inventoryEvents,
  seatHoldItems,
  seatHolds,
  tripSeats,
} from '@ordervoice/db'
import { and, eq, inArray, lte, sql } from 'drizzle-orm'
import { requireOperatorRole } from '../auth/operator-actor'
import { DEMO_SEAT_CODES, DEMO_TRIP_ID } from '../demo/operator-demo-state'

export type InventoryRepository = {
  mode: 'memory' | 'neon'
  getTripInventory(tripId: string, now: string): Promise<{ revision: number; seats: TripSeat[] }>
  getHold(holdId: string, now: string): Promise<SeatHold>
  hold(command: HoldSeatsCommand, actor: OperatorActor, now: string): Promise<SeatHold>
  renew(holdId: string, actor: OperatorActor, now: string): Promise<SeatHold>
  release(holdId: string, actor: OperatorActor, now: string, reason: string): Promise<SeatHold>
  releaseForSession(sessionCode: string, actor: OperatorActor, now: string, reason: string): Promise<number>
  consume(holdId: string, bookingId: string, actor: OperatorActor, now: string): Promise<SeatHold>
  setBlocked(
    tripId: string,
    seatCodes: string[],
    blocked: boolean,
    actor: OperatorActor,
    now: string,
  ): Promise<TripSeat[]>
}

export type InventoryMemoryState = {
  seats: Map<string, TripSeat>
  holds: Map<string, SeatHold>
  mutex: Promise<void>
}

export function seededMemoryInventory(
  tripId = 'trip-1',
  seatCodes = ['A05', 'A06'],
): InventoryMemoryState {
  return {
    seats: new Map(seatCodes.map((seatCode) => [seatKey(tripId, seatCode), {
      tripId,
      seatCode,
      state: 'available' as const,
      revision: 0,
      activeHoldId: null,
      bookingId: null,
    }])),
    holds: new Map(),
    mutex: Promise.resolve(),
  }
}

const sharedMemory = seededMemoryInventory()

export function createInventoryRepository(
  environment: Record<string, string | undefined> = process.env,
  memory: InventoryMemoryState = sharedMemory,
): InventoryRepository {
  if (!environment.DATABASE_URL?.trim() && environment.OPERATOR_DEMO_MODE === 'true') {
    ensureDemoInventory(memory)
  }
  return environment.DATABASE_URL?.trim()
    ? createNeonInventoryRepository()
    : createMemoryInventoryRepository(memory)
}

function createMemoryInventoryRepository(memory: InventoryMemoryState): InventoryRepository {
  return {
    mode: 'memory',
    getTripInventory(tripId, now) {
      return serialize(memory, () => {
        expireMemoryHolds(memory, now)
        return inventorySnapshot(memory, tripId)
      })
    },
    getHold(holdId, now) {
      return serialize(memory, () => {
        expireMemoryHolds(memory, now)
        return cloneHold(requireHold(memory.holds.get(holdId)))
      })
    },
    hold(command, actor, now) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return serialize(memory, () => {
        expireMemoryHolds(memory, now)
        const requested = uniqueSeats(command.seatCodes).map((code) => memory.seats.get(seatKey(command.tripId, code)))
        if (requested.some((seat) => !seat || seat.state !== 'available')) throw new Error('SEAT_NOT_AVAILABLE')
        const revision = inventoryRevision(memory, command.tripId)
        if (revision !== command.expectedInventoryRevision) throw new Error('INVENTORY_VERSION_CONFLICT')
        const hold = createSeatHold(command, actor, now)
        memory.holds.set(hold.id, cloneHold(hold))
        for (const seat of requested) {
          if (!seat) continue
          memory.seats.set(seatKey(seat.tripId, seat.seatCode), {
            ...seat,
            state: 'held',
            activeHoldId: hold.id,
            revision: seat.revision + 1,
          })
        }
        return cloneHold(hold)
      })
    },
    renew(holdId, actor, now) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return serialize(memory, () => {
        const hold = requireHold(memory.holds.get(holdId))
        const renewed = renewSeatHold(hold, now)
        memory.holds.set(holdId, cloneHold(renewed))
        return cloneHold(renewed)
      })
    },
    release(holdId, actor, now, _reason) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return serialize(memory, () => releaseMemoryHold(memory, holdId, now))
    },
    releaseForSession(sessionCode, actor, now, _reason) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return serialize(memory, () => {
        const active = [...memory.holds.values()]
          .filter((hold) => hold.sessionCode === sessionCode && hold.status === 'active')
        for (const hold of active) releaseMemoryHold(memory, hold.id, now)
        return active.length
      })
    },
    consume(holdId, bookingId, actor, now) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return serialize(memory, () => {
        const hold = requireHold(memory.holds.get(holdId))
        if (hold.status !== 'active' || Date.parse(now) >= Date.parse(hold.expiresAt)) {
          throw new Error('HOLD_EXPIRED')
        }
        const consumed: SeatHold = { ...hold, status: 'consumed', consumedAt: now }
        memory.holds.set(holdId, cloneHold(consumed))
        for (const code of hold.seatCodes) {
          const seat = memory.seats.get(seatKey(hold.tripId, code))
          if (!seat || seat.activeHoldId !== holdId) throw new Error('HOLD_SCOPE_CONFLICT')
          memory.seats.set(seatKey(hold.tripId, code), {
            ...seat,
            state: 'booked',
            activeHoldId: null,
            bookingId,
            revision: seat.revision + 1,
          })
        }
        return cloneHold(consumed)
      })
    },
    setBlocked(tripId, seatCodes, blocked, actor) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      return serialize(memory, () => {
        const updated: TripSeat[] = []
        for (const code of uniqueSeats(seatCodes)) {
          const seat = memory.seats.get(seatKey(tripId, code))
          if (!seat) throw new Error('SEAT_NOT_FOUND')
          if (seat.state === 'held' || seat.state === 'booked') throw new Error('SEAT_NOT_AVAILABLE')
          const next: TripSeat = {
            ...seat,
            state: blocked ? 'blocked' : 'available',
            revision: seat.revision + 1,
          }
          memory.seats.set(seatKey(tripId, code), next)
          updated.push(structuredClone(next))
        }
        return updated
      })
    },
  }
}

function createNeonInventoryRepository(): InventoryRepository {
  const database = getDb()
  return {
    mode: 'neon',
    getTripInventory(tripId, now) {
      return database.transaction(async (transaction) => {
        await expireNeonHolds(transaction, now)
        const rows = await transaction.select().from(tripSeats).where(eq(tripSeats.tripId, tripId))
        return rowsSnapshot(rows)
      })
    },
    getHold(holdId, now) {
      return database.transaction(async (transaction) => {
        await expireNeonHolds(transaction, now)
        const [row] = await transaction.select().from(seatHolds).where(eq(seatHolds.id, holdId)).limit(1)
        if (!row) throw new Error('HOLD_NOT_FOUND')
        const items = await transaction.select({ seatCode: seatHoldItems.seatCode })
          .from(seatHoldItems).where(eq(seatHoldItems.holdId, holdId))
        return holdContract(row, items.map((item) => item.seatCode))
      })
    },
    hold(command, actor, now) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return database.transaction(async (transaction) => {
        await expireNeonHolds(transaction, now)
        const codes = uniqueSeats(command.seatCodes)
        const rows = await transaction.select().from(tripSeats).where(and(
          eq(tripSeats.tripId, command.tripId),
          inArray(tripSeats.seatCode, codes),
        )).for('update')
        if (rows.length !== codes.length || rows.some((seat) => seat.state !== 'available')) {
          throw new Error('SEAT_NOT_AVAILABLE')
        }
        const allRows = await transaction.select({ revision: tripSeats.revision })
          .from(tripSeats).where(eq(tripSeats.tripId, command.tripId))
        if (Math.max(0, ...allRows.map((seat) => seat.revision)) !== command.expectedInventoryRevision) {
          throw new Error('INVENTORY_VERSION_CONFLICT')
        }
        const hold = createSeatHold(command, actor, now)
        await transaction.insert(seatHolds).values(holdRow(hold))
        await transaction.insert(seatHoldItems).values(rows.map((seat) => ({
          holdId: hold.id,
          tripSeatId: seat.id,
          seatCode: seat.seatCode,
        })))
        await transaction.update(tripSeats).set({
          state: 'held',
          activeHoldId: hold.id,
          revision: sql`${tripSeats.revision} + 1`,
          updatedAt: new Date(now),
        }).where(inArray(tripSeats.id, rows.map((seat) => seat.id)))
        await insertEvent(transaction, hold.tripId, hold.id, 'hold.created', actor.id, hold.id, now, { seatCodes: hold.seatCodes })
        return hold
      }).catch(mapNeonConflict)
    },
    renew(holdId, actor, now) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return database.transaction(async (transaction) => {
        const hold = await lockNeonHold(transaction, holdId)
        const renewed = renewSeatHold(hold, now)
        await transaction.update(seatHolds).set({ expiresAt: new Date(renewed.expiresAt) })
          .where(eq(seatHolds.id, holdId))
        await insertEvent(transaction, hold.tripId, holdId, 'hold.renewed', actor.id, holdId, now, {})
        return renewed
      })
    },
    release(holdId, actor, now, reason) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return database.transaction((transaction) => releaseNeonHold(transaction, holdId, actor, now, reason))
    },
    releaseForSession(sessionCode, actor, now, reason) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return database.transaction(async (transaction) => {
        const rows = await transaction.select({ id: seatHolds.id }).from(seatHolds).where(and(
          eq(seatHolds.callId, sessionCode),
          eq(seatHolds.status, 'active'),
        )).for('update')
        for (const row of rows) await releaseNeonHold(transaction, row.id, actor, now, reason)
        return rows.length
      })
    },
    consume(holdId, bookingId, actor, now) {
      requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
      return database.transaction(async (transaction) => {
        const hold = await lockNeonHold(transaction, holdId)
        if (hold.status !== 'active' || Date.parse(now) >= Date.parse(hold.expiresAt)) throw new Error('HOLD_EXPIRED')
        const rows = await transaction.select().from(tripSeats)
          .where(eq(tripSeats.activeHoldId, holdId)).for('update')
        if (rows.length !== hold.seatCodes.length) throw new Error('HOLD_SCOPE_CONFLICT')
        await transaction.update(seatHolds).set({ status: 'consumed', consumedAt: new Date(now) })
          .where(eq(seatHolds.id, holdId))
        await transaction.update(tripSeats).set({
          state: 'booked', activeHoldId: null, bookingId,
          revision: sql`${tripSeats.revision} + 1`, updatedAt: new Date(now),
        }).where(eq(tripSeats.activeHoldId, holdId))
        await insertEvent(transaction, hold.tripId, holdId, 'hold.consumed', actor.id, bookingId, now, { bookingId })
        return { ...hold, status: 'consumed', consumedAt: now }
      })
    },
    setBlocked(tripId, seatCodes, blocked, actor, now) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      return database.transaction(async (transaction) => {
        const codes = uniqueSeats(seatCodes)
        const rows = await transaction.select().from(tripSeats).where(and(
          eq(tripSeats.tripId, tripId), inArray(tripSeats.seatCode, codes),
        )).for('update')
        if (rows.length !== codes.length) throw new Error('SEAT_NOT_FOUND')
        if (rows.some((seat) => seat.state === 'held' || seat.state === 'booked')) throw new Error('SEAT_NOT_AVAILABLE')
        const state = blocked ? 'blocked' : 'available'
        await transaction.update(tripSeats).set({
          state, revision: sql`${tripSeats.revision} + 1`, updatedAt: new Date(now),
        }).where(inArray(tripSeats.id, rows.map((seat) => seat.id)))
        await insertEvent(transaction, tripId, null, blocked ? 'seats.blocked' : 'seats.unblocked', actor.id, `${tripId}:${Date.parse(now)}`, now, { seatCodes: codes })
        return rows.map((seat) => tripSeatContract({ ...seat, state, revision: seat.revision + 1 }))
      })
    },
  }
}

function ensureDemoInventory(memory: InventoryMemoryState): void {
  if (DEMO_SEAT_CODES.some((code) => memory.seats.has(seatKey(DEMO_TRIP_ID, code)))) return
  for (const code of DEMO_SEAT_CODES) {
    memory.seats.set(seatKey(DEMO_TRIP_ID, code), {
      tripId: DEMO_TRIP_ID,
      seatCode: code,
      state: 'available',
      revision: 0,
      activeHoldId: null,
      bookingId: null,
    })
  }
}

type NeonDatabase = ReturnType<typeof getDb>
type NeonTransaction = Parameters<Parameters<NeonDatabase['transaction']>[0]>[0]

async function lockNeonHold(transaction: NeonTransaction, holdId: string): Promise<SeatHold> {
  const [row] = await transaction.select().from(seatHolds)
    .where(eq(seatHolds.id, holdId)).for('update').limit(1)
  if (!row) throw new Error('HOLD_NOT_FOUND')
  const items = await transaction.select({ seatCode: seatHoldItems.seatCode })
    .from(seatHoldItems).where(eq(seatHoldItems.holdId, holdId))
  return holdContract(row, items.map((item) => item.seatCode))
}

async function releaseNeonHold(
  transaction: NeonTransaction,
  holdId: string,
  actor: OperatorActor,
  now: string,
  reason: string,
): Promise<SeatHold> {
  const hold = await lockNeonHold(transaction, holdId)
  const released = releaseSeatHold(hold, now)
  if (hold.status !== 'active') return released
  await transaction.update(seatHolds).set({ status: 'released', releasedAt: new Date(now) })
    .where(eq(seatHolds.id, holdId))
  await transaction.update(tripSeats).set({
    state: 'available', activeHoldId: null,
    revision: sql`${tripSeats.revision} + 1`, updatedAt: new Date(now),
  }).where(and(eq(tripSeats.activeHoldId, holdId), eq(tripSeats.state, 'held')))
  await insertEvent(transaction, hold.tripId, holdId, 'hold.released', actor.id, holdId, now, { reason })
  return released
}

async function expireNeonHolds(transaction: NeonTransaction, now: string): Promise<void> {
  const stale = await transaction.select().from(seatHolds).where(and(
    eq(seatHolds.status, 'active'), lte(seatHolds.expiresAt, new Date(now)),
  )).for('update')
  for (const row of stale) {
    await transaction.update(seatHolds).set({ status: 'expired', releasedAt: new Date(now) })
      .where(eq(seatHolds.id, row.id))
    await transaction.update(tripSeats).set({
      state: 'available', activeHoldId: null,
      revision: sql`${tripSeats.revision} + 1`, updatedAt: new Date(now),
    }).where(and(eq(tripSeats.activeHoldId, row.id), eq(tripSeats.state, 'held')))
  }
}

async function insertEvent(
  transaction: NeonTransaction,
  tripId: string,
  holdId: string | null,
  eventType: string,
  actorId: string,
  correlationId: string,
  now: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await transaction.insert(inventoryEvents).values({
    id: `inventory-${eventType}-${correlationId}-${Date.parse(now)}`,
    tripId, holdId, eventType, actorId, correlationId, payload, createdAt: new Date(now),
  })
}

function holdRow(hold: SeatHold) {
  return {
    id: hold.id, callId: hold.sessionCode, bookingDraftId: hold.bookingDraftId, tripId: hold.tripId,
    actorId: hold.actorId, status: hold.status, createdAt: new Date(hold.createdAt),
    expiresAt: new Date(hold.expiresAt), maxExpiresAt: new Date(hold.maxExpiresAt),
    releasedAt: null, consumedAt: null,
  }
}

function holdContract(row: typeof seatHolds.$inferSelect, seatCodes: string[]): SeatHold {
  return {
    id: row.id, sessionCode: row.callId, bookingDraftId: row.bookingDraftId, tripId: row.tripId,
    seatCodes: [...seatCodes].sort(), actorId: row.actorId,
    status: row.status as SeatHold['status'], createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(), maxExpiresAt: row.maxExpiresAt.toISOString(),
    releasedAt: row.releasedAt?.toISOString() ?? null, consumedAt: row.consumedAt?.toISOString() ?? null,
  }
}

function tripSeatContract(row: typeof tripSeats.$inferSelect): TripSeat {
  return {
    tripId: row.tripId, seatCode: row.seatCode, state: row.state as TripSeat['state'],
    revision: row.revision, activeHoldId: row.activeHoldId, bookingId: row.bookingId,
  }
}

function rowsSnapshot(rows: (typeof tripSeats.$inferSelect)[]) {
  return {
    revision: Math.max(0, ...rows.map((seat) => seat.revision)),
    seats: rows.map(tripSeatContract).sort((left, right) => left.seatCode.localeCompare(right.seatCode)),
  }
}

function expireMemoryHolds(memory: InventoryMemoryState, now: string): void {
  for (const hold of memory.holds.values()) {
    const expired = expireSeatHold(hold, now)
    if (expired.status !== 'expired' || hold.status !== 'active') continue
    memory.holds.set(hold.id, expired)
    for (const code of hold.seatCodes) {
      const seat = memory.seats.get(seatKey(hold.tripId, code))
      if (seat?.activeHoldId === hold.id) {
        memory.seats.set(seatKey(hold.tripId, code), {
          ...seat, state: 'available', activeHoldId: null, revision: seat.revision + 1,
        })
      }
    }
  }
}

function releaseMemoryHold(memory: InventoryMemoryState, holdId: string, now: string): SeatHold {
  const hold = requireHold(memory.holds.get(holdId))
  const released = releaseSeatHold(hold, now)
  memory.holds.set(holdId, cloneHold(released))
  if (hold.status === 'active') {
    for (const code of hold.seatCodes) {
      const seat = memory.seats.get(seatKey(hold.tripId, code))
      if (seat?.activeHoldId === holdId) {
        memory.seats.set(seatKey(hold.tripId, code), {
          ...seat, state: 'available', activeHoldId: null, revision: seat.revision + 1,
        })
      }
    }
  }
  return cloneHold(released)
}

function inventorySnapshot(memory: InventoryMemoryState, tripId: string) {
  const seats = [...memory.seats.values()].filter((seat) => seat.tripId === tripId)
    .map((seat) => structuredClone(seat)).sort((left, right) => left.seatCode.localeCompare(right.seatCode))
  return { revision: inventoryRevision(memory, tripId), seats }
}

function inventoryRevision(memory: InventoryMemoryState, tripId: string): number {
  return Math.max(0, ...[...memory.seats.values()].filter((seat) => seat.tripId === tripId).map((seat) => seat.revision))
}

function serialize<T>(memory: InventoryMemoryState, action: () => T | Promise<T>): Promise<T> {
  const result = memory.mutex.then(action, action)
  memory.mutex = result.then(() => undefined, () => undefined)
  return result
}

function uniqueSeats(seatCodes: string[]): string[] {
  return [...new Set(seatCodes)].sort()
}

function seatKey(tripId: string, seatCode: string): string {
  return `${tripId}:${seatCode}`
}

function requireHold(hold: SeatHold | undefined): SeatHold {
  if (!hold) throw new Error('HOLD_NOT_FOUND')
  return cloneHold(hold)
}

function cloneHold(hold: SeatHold): SeatHold {
  return structuredClone(hold)
}

function mapNeonConflict(error: unknown): never {
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
    throw new Error('SEAT_NOT_AVAILABLE')
  }
  throw error
}
