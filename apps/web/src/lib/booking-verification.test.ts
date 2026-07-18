import { describe, expect, it } from 'vitest'

import { createVerifiedBooking, verifiedBookingSchema } from './booking-verification'
import { bookingSnapshotSchema, createEmptyBooking } from './call-contract'

function confirmedSnapshot() {
  return bookingSnapshotSchema.parse({
    ...createEmptyBooking('call-private'),
    id: 'booking-private',
    status: 'confirmed',
    origin: 'Hà Nội',
    destination: 'Vinh',
    travelDateLabel: '20/07/2026',
    passengerCount: 2,
    selectedTrip: {
      id: 'trip-1',
      origin: 'Hà Nội',
      destination: 'Vinh',
      departureTime: '20:00',
      arrivalTime: '01:30',
      vehicleType: 'Limousine',
      seatNoun: 'ghế',
      priceVnd: 300_000,
      pickupPoint: 'Bến xe Nước Ngầm',
      dropoffPoint: 'Bến xe Vinh',
    },
    seats: ['A1', 'A2'],
    passengerName: 'Nguyễn An',
    phone: '0909123456',
    totalFareVnd: 600_000,
    bookingCode: 'MA-260720-0001',
  })
}

describe('public booking verification projection', () => {
  it('returns only the travel facts needed for verification and omits direct identifiers', () => {
    const verified = createVerifiedBooking(confirmedSnapshot())

    expect(verifiedBookingSchema.parse(verified)).toEqual(verified)
    expect(verified).toEqual({
      schemaVersion: '1.0',
      status: 'confirmed',
      bookingCode: 'MA-260720-0001',
      origin: 'Hà Nội',
      destination: 'Vinh',
      travelDateLabel: '20/07/2026',
      departureTime: '20:00',
      vehicleType: 'Limousine',
      seatNoun: 'ghế',
      pickupPoint: 'Bến xe Nước Ngầm',
      dropoffPoint: 'Bến xe Vinh',
      seats: ['A1', 'A2'],
      passengerCount: 2,
      totalFareVnd: 600_000,
    })
    expect(verified).not.toHaveProperty('passengerName')
    expect(verified).not.toHaveProperty('phone')
    expect(verified).not.toHaveProperty('conversationId')
    expect(verified).not.toHaveProperty('id')
    expect(verified).not.toHaveProperty('selectedTrip')
  })

  it('preserves the catalog seat noun without exposing passenger identifiers', () => {
    const snapshot = confirmedSnapshot()
    snapshot.selectedTrip!.seatNoun = 'giường'

    expect(createVerifiedBooking(snapshot).seatNoun).toBe('giường')
  })

  it('refuses to project an incomplete or non-confirmed snapshot', () => {
    expect(() => createVerifiedBooking(createEmptyBooking('call-collecting'))).toThrow(
      /complete confirmed booking snapshot/u,
    )
  })
})
