import type { HoldSeatsCommand, OperatorActor } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import { createInitialBooking } from '../src/bus-booking.js'
import {
  assertHoldCanConfirm,
  createSeatHold,
  expireSeatHold,
  releaseSeatHold,
  renewSeatHold,
} from '../src/inventory.js'

const actor: OperatorActor = { id: 'staff-1', role: 'dispatcher', demo: false }
const command: HoldSeatsCommand = {
  sessionCode: 'DEMO42',
  bookingDraftId: 'booking-DEMO42',
  tripId: 'trip-1',
  seatCodes: ['A06', 'A05', 'A05'],
  expectedInventoryRevision: 0,
}

describe('seat hold rules', () => {
  it('creates a sorted ten-minute hold and caps renewal at thirty minutes', () => {
    const hold = createSeatHold(command, actor, '2026-07-18T10:00:00.000Z')

    expect(hold).toMatchObject({
      seatCodes: ['A05', 'A06'],
      expiresAt: '2026-07-18T10:10:00.000Z',
      maxExpiresAt: '2026-07-18T10:30:00.000Z',
    })
    expect(renewSeatHold(hold, '2026-07-18T10:09:00.000Z').expiresAt)
      .toBe('2026-07-18T10:19:00.000Z')
    expect(() => renewSeatHold(
      { ...hold, expiresAt: '2026-07-18T10:29:00.000Z' },
      '2026-07-18T10:21:00.000Z',
    )).toThrow('HOLD_MAX_DURATION')
  })

  it('rejects confirmation after expiry or for a different scope', () => {
    const hold = createSeatHold(command, actor, '2026-07-18T10:00:00.000Z')
    const draft = {
      ...createInitialBooking('DEMO42'),
      runtimeProfile: 'durable' as const,
      tripId: 'trip-1',
      seatHoldId: hold.id,
      seats: ['A05', 'A06'],
    }

    expect(() => assertHoldCanConfirm(hold, draft, '2026-07-18T10:11:00.000Z')).toThrow('HOLD_EXPIRED')
    expect(() => assertHoldCanConfirm(hold, { ...draft, tripId: 'trip-2' }, '2026-07-18T10:05:00.000Z'))
      .toThrow('HOLD_SCOPE_CONFLICT')
  })

  it('releases or expires only active holds', () => {
    const hold = createSeatHold(command, actor, '2026-07-18T10:00:00.000Z')

    expect(releaseSeatHold(hold, '2026-07-18T10:05:00.000Z')).toMatchObject({
      status: 'released', releasedAt: '2026-07-18T10:05:00.000Z',
    })
    expect(expireSeatHold(hold, '2026-07-18T10:11:00.000Z')).toMatchObject({
      status: 'expired', releasedAt: '2026-07-18T10:11:00.000Z',
    })
  })
})
