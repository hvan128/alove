import type { HoldSeatsCommand, OperatorActor } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import { createInventoryRepository, seededMemoryInventory } from './inventory-repository'

const staff: OperatorActor = { id: 'staff-1', role: 'dispatcher', demo: false }
const now = '2026-07-18T10:00:00.000Z'

function command(sessionCode: string): HoldSeatsCommand {
  return {
    sessionCode,
    bookingDraftId: `booking-${sessionCode}`,
    tripId: 'trip-1',
    seatCodes: ['A05'],
    expectedInventoryRevision: 0,
  }
}

describe('inventory repository', () => {
  it('allows one winner for concurrent holds', async () => {
    const repository = createInventoryRepository({}, seededMemoryInventory())
    const results = await Promise.allSettled([
      repository.hold(command('CALL1'), staff, now),
      repository.hold(command('CALL2'), staff, now),
    ])

    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((item) => (
      item.status === 'rejected' && String(item.reason).includes('SEAT_NOT_AVAILABLE')
    ))).toHaveLength(1)
  })

  it('expires stale holds before returning inventory', async () => {
    const repository = createInventoryRepository({}, seededMemoryInventory())
    const hold = await repository.hold(command('CALL1'), staff, now)

    const inventory = await repository.getTripInventory('trip-1', '2026-07-18T10:11:00.000Z')

    expect(inventory.seats.find((seat) => seat.seatCode === 'A05')).toMatchObject({
      state: 'available', activeHoldId: null,
    })
    await expect(repository.renew(hold.id, staff, '2026-07-18T10:11:00.000Z')).rejects.toThrow('HOLD_EXPIRED')
  })

  it('blocks only free seats and releases all active holds for a session', async () => {
    const repository = createInventoryRepository({}, seededMemoryInventory())
    await repository.setBlocked('trip-1', ['A06'], true, staff, now)
    await repository.hold({ ...command('CALL1'), expectedInventoryRevision: 1 }, staff, now)

    expect(await repository.releaseForSession('CALL1', staff, '2026-07-18T10:01:00.000Z', 'call_ended')).toBe(1)
    expect((await repository.getTripInventory('trip-1', now)).seats).toEqual(expect.arrayContaining([
      expect.objectContaining({ seatCode: 'A05', state: 'available' }),
      expect.objectContaining({ seatCode: 'A06', state: 'blocked' }),
    ]))
  })
})
