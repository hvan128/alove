import { describe, expect, it } from 'vitest'
import { seatHoldSchema } from '../src/inventory.js'

describe('seat inventory contracts', () => {
  it('parses an active seat hold', () => {
    expect(seatHoldSchema.parse({
      id: 'hold-1',
      sessionCode: 'DEMO42',
      bookingDraftId: 'booking-DEMO42',
      tripId: 'trip-1',
      seatCodes: ['A05', 'A06'],
      actorId: 'staff-1',
      status: 'active',
      createdAt: '2026-07-18T10:00:00.000Z',
      expiresAt: '2026-07-18T10:10:00.000Z',
      maxExpiresAt: '2026-07-18T10:30:00.000Z',
      releasedAt: null,
      consumedAt: null,
    }).status).toBe('active')
  })
})
