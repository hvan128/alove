import { createHash } from 'node:crypto'
import type { BookingDraft, OperatorActor, SeatHold } from '@ordervoice/contracts'
import { bookingDraftSchema } from '@ordervoice/contracts'
import { assertHoldCanConfirm, confirmBooking } from '@ordervoice/core'
import {
  bookingAuditEvents,
  bookingConfirmations,
  busBookings,
  confirmedBookings,
  getDb,
  seatHoldItems,
  seatHolds,
  tripSeats,
} from '@ordervoice/db'
import { and, eq, sql } from 'drizzle-orm'
import { requireOperatorRole } from '../auth/operator-actor'
import { createSessionRepository } from '../db/session-repository'
import { createInventoryRepository } from '../inventory/inventory-repository'

export type ConfirmBookingCommand = {
  sessionCode: string
  bookingDraftId: string
  holdId: string
  acceptedSummaryHash: string
  idempotencyKey: string
  expectedRevision: number
}

export type StoredConfirmation = {
  requestHash: string
  booking: BookingDraft
}

export type ConfirmationTransaction = {
  findConfirmation(
    idempotencyKey: string,
    sessionCode: string,
    actorId: string,
  ): Promise<StoredConfirmation | null>
  lockDraft(bookingDraftId: string): Promise<{ booking: BookingDraft; revision: number } | null>
  lockHold(holdId: string): Promise<SeatHold>
  consumeHold(holdId: string, bookingId: string, actor: OperatorActor, now: string): Promise<void>
  insertConfirmationAndAudit(
    input: {
      command: ConfirmBookingCommand
      requestHash: string
      acceptedSummaryHash: string
    },
    booking: BookingDraft,
    actor: OperatorActor,
  ): Promise<void>
}

export type ConfirmationDependencies = {
  now: () => string
  transaction<T>(work: (transaction: ConfirmationTransaction) => Promise<T>): Promise<T>
}

export async function confirmBookingWithHold(
  command: ConfirmBookingCommand,
  actor: OperatorActor,
  dependencies: ConfirmationDependencies,
): Promise<BookingDraft> {
  requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care'])
  const requestHash = hashConfirmation(command)

  return dependencies.transaction(async (transaction) => {
    const prior = await transaction.findConfirmation(
      command.idempotencyKey,
      command.sessionCode,
      actor.id,
    )
    if (prior) {
      if (prior.requestHash !== requestHash) throw new Error('IDEMPOTENCY_CONFLICT')
      return structuredClone(prior.booking)
    }

    const storedDraft = await transaction.lockDraft(command.bookingDraftId)
    if (!storedDraft || storedDraft.revision !== command.expectedRevision) {
      throw new Error('BOOKING_VERSION_CONFLICT')
    }
    const hold = await transaction.lockHold(command.holdId)
    const now = dependencies.now()
    assertHoldCanConfirm(hold, storedDraft.booking, now)

    const booking = confirmBooking(storedDraft.booking, 'staff')
    await transaction.consumeHold(hold.id, booking.id, actor, now)
    await transaction.insertConfirmationAndAudit({
      command,
      requestHash,
      acceptedSummaryHash: command.acceptedSummaryHash,
    }, booking, actor)
    return structuredClone(booking)
  })
}

export function hashConfirmation(command: ConfirmBookingCommand): string {
  return createHash('sha256').update(JSON.stringify({
    sessionCode: command.sessionCode,
    bookingDraftId: command.bookingDraftId,
    holdId: command.holdId,
    acceptedSummaryHash: command.acceptedSummaryHash,
    expectedRevision: command.expectedRevision,
  })).digest('hex')
}

export function createNeonConfirmationDependencies(
  environment: Record<string, string | undefined> = process.env,
): ConfirmationDependencies {
  if (!environment.DATABASE_URL?.trim()) throw new Error('CONFIRMATION_PERSISTENCE_UNAVAILABLE')
  const database = getDb()

  return {
    now: () => new Date().toISOString(),
    transaction(work) {
      return database.transaction(async (databaseTransaction) => work({
        async findConfirmation(idempotencyKey, sessionCode, actorId) {
          const [confirmation] = await databaseTransaction.select()
            .from(bookingConfirmations)
            .where(and(
              eq(bookingConfirmations.idempotencyScope, `${sessionCode}:${actorId}`),
              eq(bookingConfirmations.idempotencyKey, idempotencyKey),
            )).limit(1)
          if (!confirmation) return null
          const [stored] = await databaseTransaction.select({ snapshot: confirmedBookings.snapshot })
            .from(confirmedBookings)
            .where(eq(confirmedBookings.confirmationId, confirmation.id)).limit(1)
          if (!stored) throw new Error('CONFIRMATION_STATE_CORRUPT')
          return {
            requestHash: confirmation.requestHash,
            booking: bookingDraftSchema.parse(stored.snapshot),
          }
        },
        async lockDraft(bookingDraftId) {
          const [row] = await databaseTransaction.select().from(busBookings)
            .where(eq(busBookings.id, bookingDraftId)).for('update').limit(1)
          return row ? { booking: bookingFromRow(row), revision: row.revision } : null
        },
        async lockHold(holdId) {
          const [row] = await databaseTransaction.select().from(seatHolds)
            .where(eq(seatHolds.id, holdId)).for('update').limit(1)
          if (!row) throw new Error('HOLD_NOT_FOUND')
          const items = await databaseTransaction.select({ seatCode: seatHoldItems.seatCode })
            .from(seatHoldItems).where(eq(seatHoldItems.holdId, holdId))
          return holdFromRow(row, items.map((item) => item.seatCode))
        },
        async consumeHold(holdId, bookingId, _actor, now) {
          const [hold] = await databaseTransaction.select().from(seatHolds)
            .where(eq(seatHolds.id, holdId)).for('update').limit(1)
          if (!hold || hold.status !== 'active' || Date.parse(now) >= hold.expiresAt.getTime()) {
            throw new Error('HOLD_EXPIRED')
          }
          const seats = await databaseTransaction.select().from(tripSeats)
            .where(eq(tripSeats.activeHoldId, holdId)).for('update')
          if (seats.length === 0) throw new Error('HOLD_SCOPE_CONFLICT')
          await databaseTransaction.update(seatHolds).set({ status: 'consumed', consumedAt: new Date(now) })
            .where(eq(seatHolds.id, holdId))
          await databaseTransaction.update(tripSeats).set({
            state: 'booked', activeHoldId: null, bookingId,
            revision: sql`${tripSeats.revision} + 1`, updatedAt: new Date(now),
          }).where(eq(tripSeats.activeHoldId, holdId))
        },
        async insertConfirmationAndAudit(input, booking, actor) {
          const confirmationId = `confirmation-${input.command.sessionCode}-${input.command.idempotencyKey}`
          const confirmedAt = new Date()
          await databaseTransaction.insert(bookingConfirmations).values({
            id: confirmationId,
            callId: input.command.sessionCode,
            bookingDraftId: input.command.bookingDraftId,
            holdId: input.command.holdId,
            actorId: actor.id,
            idempotencyScope: `${input.command.sessionCode}:${actor.id}`,
            idempotencyKey: input.command.idempotencyKey,
            requestHash: input.requestHash,
            acceptedSummaryHash: input.acceptedSummaryHash,
            outcome: 'confirmed',
            createdAt: confirmedAt,
          })
          await databaseTransaction.insert(confirmedBookings).values({
            id: `confirmed-${booking.id}`,
            bookingCode: booking.bookingCode!,
            callId: input.command.sessionCode,
            bookingDraftId: booking.id,
            confirmationId,
            holdId: input.command.holdId,
            snapshot: booking,
            confirmedAt,
          })
          await databaseTransaction.update(busBookings).set({
            status: booking.status,
            runtimeProfile: booking.runtimeProfile,
            catalogVersionId: booking.catalogVersionId,
            tripId: booking.tripId,
            seatHoldId: booking.seatHoldId,
            seats: booking.seats,
            bookingCode: booking.bookingCode,
            totalFareVnd: booking.totalFareVnd,
            revision: sql`${busBookings.revision} + 1`,
            updatedAt: confirmedAt,
          }).where(eq(busBookings.id, booking.id))
          await databaseTransaction.insert(bookingAuditEvents).values({
            id: `audit-${confirmationId}`,
            bookingId: booking.id,
            actor: actor.id,
            eventType: 'booking.confirmed',
            payload: { confirmationId, holdId: input.command.holdId },
            createdAt: confirmedAt,
          })
        },
      }))
    },
  }
}

type DemoConfirmationState = {
  confirmations: Map<string, StoredConfirmation>
  mutex: Promise<void>
}

const sharedDemoConfirmations: DemoConfirmationState = {
  confirmations: new Map(),
  mutex: Promise.resolve(),
}

export function createDemoConfirmationDependencies(
  environment: Record<string, string | undefined> = process.env,
  state: DemoConfirmationState = sharedDemoConfirmations,
): ConfirmationDependencies {
  const sessions = createSessionRepository(environment)
  const inventory = createInventoryRepository(environment)

  return {
    now: () => new Date().toISOString(),
    transaction(work) {
      const run = () => work({
        async findConfirmation(idempotencyKey, sessionCode, actorId) {
          const stored = state.confirmations.get(`${sessionCode}:${actorId}:${idempotencyKey}`)
          return stored ? structuredClone(stored) : null
        },
        async lockDraft(bookingDraftId) {
          const events = await sessions.list(bookingDraftId.replace(/^booking-/u, ''))
          const snapshots = events.filter((event) => event.type === 'booking.snapshot' && event.booking.id === bookingDraftId)
          const latest = snapshots.at(-1)
          return latest?.type === 'booking.snapshot'
            ? { booking: structuredClone(latest.booking), revision: latest.revision }
            : null
        },
        lockHold(holdId) { return inventory.getHold(holdId, new Date().toISOString()) },
        async consumeHold(holdId, bookingId, actor, now) { await inventory.consume(holdId, bookingId, actor, now) },
        async insertConfirmationAndAudit(input, booking, actor) {
          state.confirmations.set(`${input.command.sessionCode}:${actor.id}:${input.command.idempotencyKey}`, { requestHash: input.requestHash, booking: structuredClone(booking) })
        },
      })
      const result = state.mutex.then(run, run)
      state.mutex = result.then(() => undefined, () => undefined)
      return result
    },
  }
}

function bookingFromRow(row: typeof busBookings.$inferSelect): BookingDraft {
  return bookingDraftSchema.parse({
    id: row.id,
    conversationId: row.callId,
    status: row.status,
    runtimeProfile: row.runtimeProfile,
    catalogVersionId: row.catalogVersionId,
    tripId: row.tripId,
    seatHoldId: row.seatHoldId,
    origin: row.origin,
    destination: row.destination,
    travelDateLabel: row.travelDateLabel,
    timeWindow: row.timeWindow,
    passengerCount: row.passengerCount,
    selectedTrip: row.selectedTrip,
    seats: row.seats,
    passengerName: row.passengerName,
    phone: row.phone,
    pickupPoint: row.pickupPoint,
    dropoffPoint: row.dropoffPoint,
    vehiclePreference: row.vehiclePreference,
    paymentMethod: row.paymentMethod,
    note: row.note,
    totalFareVnd: row.totalFareVnd,
    bookingCode: row.bookingCode,
    evidenceMessageIds: row.evidenceMessageIds,
    fieldEvidence: row.fieldEvidence,
    confirmedFields: row.confirmedFields,
    reviewItems: row.reviewItems,
  })
}

function holdFromRow(row: typeof seatHolds.$inferSelect, seatCodes: string[]): SeatHold {
  return {
    id: row.id,
    sessionCode: row.callId,
    bookingDraftId: row.bookingDraftId,
    tripId: row.tripId,
    seatCodes: [...seatCodes].sort(),
    actorId: row.actorId,
    status: row.status as SeatHold['status'],
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    maxExpiresAt: row.maxExpiresAt.toISOString(),
    releasedAt: row.releasedAt?.toISOString() ?? null,
    consumedAt: row.consumedAt?.toISOString() ?? null,
  }
}
