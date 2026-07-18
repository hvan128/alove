import type { BookingDraft, OperatorActor, SeatHold } from '@ordervoice/contracts'
import { describe, expect, it, vi } from 'vitest'
import { createInitialBooking } from '@ordervoice/core'
import {
  confirmBookingWithHold,
  type ConfirmationDependencies,
  type ConfirmBookingCommand,
} from './confirm-booking'

const staff: OperatorActor = { id: 'staff-1', role: 'customer-care', demo: false }
const command: ConfirmBookingCommand = {
  sessionCode: 'DEMO42',
  bookingDraftId: 'booking-DEMO42',
  holdId: 'hold-DEMO42',
  acceptedSummaryHash: 'summary-1',
  idempotencyKey: 'confirm-1',
  expectedRevision: 4,
}

function confirmedReadyDraft(): BookingDraft {
  return {
    ...createInitialBooking('DEMO42'),
    runtimeProfile: 'durable',
    catalogVersionId: 'catalog-v1',
    tripId: 'trip-1',
    seatHoldId: 'hold-DEMO42',
    status: 'awaiting_confirmation',
    origin: 'Sài Gòn', destination: 'Đà Lạt', travelDateLabel: '24/07', timeWindow: '22:00',
    passengerCount: 1,
    selectedTrip: {
      id: 'trip-1', origin: 'Sài Gòn', destination: 'Đà Lạt', departureTime: '22:00', arrivalTime: '05:30',
      vehicleType: 'Giường nằm', priceVnd: 320000, pickupPoint: 'Bến xe', dropoffPoint: 'Đà Lạt', availableSeats: ['A05'],
    },
    seats: ['A05'], passengerName: 'Nguyễn Minh Anh', phone: '0909123456',
    pickupPoint: 'Bến xe', dropoffPoint: 'Đà Lạt', totalFareVnd: 320000,
    confirmedFields: ['origin', 'destination', 'travelDateLabel', 'timeWindow', 'passengerCount', 'passengerName', 'phone', 'pickupPoint', 'dropoffPoint', 'selectedTrip', 'seats'],
  }
}

function dependencies(expiresAt = '2026-07-18T10:10:00.000Z') {
  const draft = confirmedReadyDraft()
  const hold: SeatHold = {
    id: 'hold-DEMO42', sessionCode: 'DEMO42', bookingDraftId: draft.id, tripId: 'trip-1',
    seatCodes: ['A05'], actorId: staff.id, status: 'active',
    createdAt: '2026-07-18T10:00:00.000Z', expiresAt,
    maxExpiresAt: '2026-07-18T10:30:00.000Z', releasedAt: null, consumedAt: null,
  }
  const confirmations = new Map<string, { requestHash: string; booking: BookingDraft }>()
  const consumeHold = vi.fn(async () => undefined)
  const deps: ConfirmationDependencies = {
    now: () => '2026-07-18T10:05:00.000Z',
    async transaction(work) {
      return work({
        async findConfirmation(key) { return confirmations.get(key) ?? null },
        async lockDraft() { return { booking: structuredClone(draft), revision: 4 } },
        async lockHold() { return structuredClone(hold) },
        consumeHold,
        async insertConfirmationAndAudit(input, booking) {
          confirmations.set(input.command.idempotencyKey, {
            requestHash: input.requestHash,
            booking: structuredClone(booking),
          })
        },
      })
    },
  }
  return { deps, consumeHold }
}

describe('authoritative booking confirmation', () => {
  it('consumes hold and returns same booking on exact retry', async () => {
    const { deps, consumeHold } = dependencies()
    const first = await confirmBookingWithHold(command, staff, deps)
    const retry = await confirmBookingWithHold(command, staff, deps)

    expect(retry.bookingCode).toBe(first.bookingCode)
    expect(consumeHold).toHaveBeenCalledTimes(1)
  })

  it('does not confirm after hold expiry', async () => {
    const { deps, consumeHold } = dependencies('2026-07-18T10:04:00.000Z')

    await expect(confirmBookingWithHold(command, staff, deps)).rejects.toThrow('HOLD_EXPIRED')
    expect(consumeHold).not.toHaveBeenCalled()
  })
})
