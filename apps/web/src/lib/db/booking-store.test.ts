import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'

const fakeDb = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
}))

vi.mock('./client', () => ({
  requireDb: vi.fn(() => fakeDb),
}))

import {
  cancelBooking,
  confirmBooking,
  findBookingSnapshotForVerification,
  holdSeats,
  isExplicitBookingConfirmation,
  searchTrips,
} from './booking-store'

function sqlText(value: SQL): string {
  return new PgDialect().sqlToQuery(value).sql.replace(/\s+/gu, ' ').trim().toLowerCase()
}

function queryReturning<T>(value: T) {
  const query: Record<string, unknown> = {}
  for (const method of ['from', 'groupBy', 'having', 'innerJoin', 'limit', 'orderBy', 'where']) {
    query[method] = vi.fn(() => query)
  }
  query.then = (resolve: (result: T) => unknown, reject: (error: unknown) => unknown) =>
    Promise.resolve(value).then(resolve, reject)
  return query
}

describe('booking-store invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('only accepts deterministic affirmative confirmation phrases', () => {
    expect(isExplicitBookingConfirmation('Tôi xác nhận đặt vé.')).toBe(true)
    expect(isExplicitBookingConfirmation('Vâng, tôi đồng ý đặt vé ạ.')).toBe(true)
    expect(isExplicitBookingConfirmation('Đúng rồi, chốt vé giúp tôi.')).toBe(true)
    expect(isExplicitBookingConfirmation('Tôi không xác nhận đặt vé.')).toBe(false)
    expect(isExplicitBookingConfirmation('Đừng chốt vé.')).toBe(false)
    expect(isExplicitBookingConfirmation('Có lẽ đặt vé')).toBe(false)
    expect(isExplicitBookingConfirmation('Có lẽ chốt vé')).toBe(false)
  })

  it('accepts the short affirmatives callers actually use on the phone', () => {
    // Agent hỏi đóng "anh xác nhận đặt vé chứ ạ?" nên khách hay đáp rất gọn.
    // Danh sách hẹp ban đầu từ chối hết những câu này và làm xuất vé hỏng.
    for (const phrase of ['Ok luôn', 'Ừ được', 'Chuẩn rồi', 'Được rồi em', 'Vâng đặt đi']) {
      expect(isExplicitBookingConfirmation(phrase)).toBe(true)
    }
    // "đúng rồi" từng bị chặn ngược với chú thích ngay trên chính hàm đó.
    expect(isExplicitBookingConfirmation('Đúng rồi')).toBe(true)
  })

  it('still refuses hesitation even when it contains an affirmative word', () => {
    for (const phrase of ['Khoan đã', 'Thôi để sau', 'Chưa chốt đâu', 'Để tôi suy nghĩ']) {
      expect(isExplicitBookingConfirmation(phrase)).toBe(false)
    }
  })

  it('counts expired holds as searchable inventory', async () => {
    const results = [
      [{ id: 'route-1', originCity: 'Sài Gòn', destinationCity: 'Đà Lạt' }],
      [{
        tripId: 'trip-1',
        departureAt: new Date('2026-07-25T15:00:00.000Z'),
        arrivalAt: new Date('2026-07-25T23:00:00.000Z'),
        vehicleType: 'Limousine',
        priceVnd: 300_000,
        pickupPoint: 'Bến xe A',
        dropoffPoint: 'Bến xe B',
        seatsAvailable: 1,
      }],
    ]
    fakeDb.select.mockImplementation((selection) => {
      const result = results.shift() ?? []
      return Object.assign(queryReturning(result), { selection })
    })

    const offers = await searchTrips({ origin: 'Sài Gòn', destination: 'Đà Lạt', passengers: 1 })
    expect(offers[0]).toMatchObject({ arrivalTime: '06:00', arrivesAt: expect.any(String) })

    const seatSelection = fakeDb.select.mock.calls[1]![0] as { seatsAvailable: SQL }
    const aggregate = sqlText(seatSelection.seatsAvailable)
    expect(aggregate).toContain('"seats"."status" = \'held\'')
    expect(aggregate).toContain('"seats"."hold_expires_at" <= now()')
  })

  it('holds seats and releases surplus or old-trip holds in one statement', async () => {
    fakeDb.execute.mockResolvedValue({
      rows: [{ seatCode: 'A01', priceVnd: 300_000, vehicleType: 'Giường nằm' }],
    })

    await expect(holdSeats({ callId: 'call-1', tripId: 'trip-1', passengers: 1 })).resolves.toEqual({
      seatCodes: ['A01'],
      priceVnd: 300_000,
      totalVnd: 300_000,
      seatNoun: 'giường',
    })

    expect(fakeDb.execute).toHaveBeenCalledTimes(1)
    const statement = sqlText(fakeDb.execute.mock.calls[0]![0] as SQL)
    expect(statement).toContain('released as ( update "seats" as s')
    expect(statement).toContain('(select count(*) from selected) =')
    expect(statement).toContain('not exists (select 1 from selected chosen where chosen.id = s.id)')
    expect(statement).toContain('for update skip locked')
  })

  it('confirms only unexpired holds and writes ticket plus seats atomically', async () => {
    fakeDb.execute.mockResolvedValue({
      rows: [{
        code: 'MA-260725-0001',
        seatCodes: ['A01'],
        totalVnd: 300_000,
        departureAt: '2026-07-25T15:00:00.000Z',
        pickupPoint: 'Bến xe A',
        webhookEventId: 'booking.confirmed.v1:MA-260725-0001',
      }],
    })

    const result = await confirmBooking({
      callId: 'call-1',
      tripId: 'trip-1',
      passengerName: 'Nguyễn An',
      phone: '0909123456',
      confirmationText: 'Tôi xác nhận đặt vé.',
      enqueueWebhook: true,
    })
    expect(result?.code).toBe('MA-260725-0001')
    expect(result?.webhookEventId).toBe('booking.confirmed.v1:MA-260725-0001')

    expect(fakeDb.execute).toHaveBeenCalledTimes(1)
    const statement = sqlText(fakeDb.execute.mock.calls[0]![0] as SQL)
    expect(statement).toContain('s.hold_expires_at > now()')
    expect(statement).toContain('booked as ( update "seats" as s')
    expect(statement).toContain('insert into "bookings"')
    expect(statement).toContain('verification_snapshot')
    expect(statement).toContain("'selectedtrip', jsonb_build_object")
    expect(statement).toContain('where booked_count.count = cardinality(p.seat_codes)')
    expect(statement).toContain('insert into "booking_webhook_outbox"')
    expect(statement).toContain("concat('booking.confirmed.v1:', c.code)")
    expect(statement).toContain('on conflict (event_id) do nothing')
  })

  it('reconstructs a valid confirmed snapshot only when both verification factors match', async () => {
    const query = queryReturning([{
      status: 'pending_payment',
      verificationSnapshotRequired: true,
      verificationSnapshot: {
        id: 'booking-17',
        conversationId: 'call-17',
        status: 'confirmed',
        origin: 'Hà Nội',
        destination: 'Vinh',
        travelDateLabel: '25/07/2026',
        passengerCount: 1,
        selectedTrip: {
          id: 'trip-1',
          origin: 'Hà Nội',
          destination: 'Vinh',
          departureTime: '20:00',
          arrivalTime: '06:00',
          vehicleType: 'Giường nằm',
          priceVnd: 300_000,
          pickupPoint: 'Bến xe Nước Ngầm',
          dropoffPoint: 'Bến xe Vinh',
          seatNoun: 'giường',
        },
        seats: ['A01'],
        passengerName: 'Nguyễn An',
        phone: '0909123456',
        totalFareVnd: 300_000,
        bookingCode: 'MA-260725-0017',
      },
    }])
    fakeDb.select.mockReturnValue(query)

    const snapshot = await findBookingSnapshotForVerification({
      code: 'MA-260725-0017',
      phone: '0909123456',
    })

    expect(snapshot).toMatchObject({
      id: 'booking-17',
      conversationId: 'call-17',
      status: 'confirmed',
      origin: 'Hà Nội',
      destination: 'Vinh',
      travelDateLabel: '25/07/2026',
      selectedTrip: {
        departureTime: '20:00',
        arrivalTime: '06:00',
        seatNoun: 'giường',
      },
      phone: '0909123456',
      bookingCode: 'MA-260725-0017',
    })
    const where = (query.where as ReturnType<typeof vi.fn>).mock.calls[0]![0] as SQL
    const compiled = new PgDialect().sqlToQuery(where)
    expect(compiled.params).toContain('MA-260725-0017')
    expect(compiled.params).toContain('0909123456')
    expect(query.innerJoin).not.toHaveBeenCalled()
  })

  it('treats an explicitly exempt legacy booking like an unknown ticket', async () => {
    const query = queryReturning([{
      status: 'pending_payment',
      verificationSnapshot: null,
      verificationSnapshotRequired: false,
    }])
    fakeDb.select.mockReturnValue(query)

    await expect(findBookingSnapshotForVerification({
      code: 'MA-260725-0017',
      phone: '0909123456',
    })).resolves.toBeNull()
  })

  it('fails closed when a required booking snapshot is missing', async () => {
    const query = queryReturning([{
      status: 'pending_payment',
      verificationSnapshot: null,
      verificationSnapshotRequired: true,
    }])
    fakeDb.select.mockReturnValue(query)

    await expect(findBookingSnapshotForVerification({
      code: 'MA-260725-0017',
      phone: '0909123456',
    })).rejects.toThrow('Required booking verification snapshot is missing')
  })

  it('cancels booking and releases its seats in one authenticated statement', async () => {
    fakeDb.execute.mockResolvedValue({
      rows: [{ code: 'MA-260725-0001', seatCodes: ['A01'] }],
    })

    await expect(cancelBooking({
      callId: 'new-call',
      code: 'MA-260725-0001',
      phone: '0909123456',
    })).resolves.toEqual({ cancelled: true, code: 'MA-260725-0001', seatCodes: ['A01'] })

    expect(fakeDb.execute).toHaveBeenCalledTimes(1)
    const compiled = new PgDialect().sqlToQuery(fakeDb.execute.mock.calls[0]![0] as SQL)
    const statement = compiled.sql.replace(/\s+/gu, ' ').toLowerCase()
    expect(statement).toContain('b.code = $2 and b.phone = $3')
    expect(statement).toContain('update "bookings" as b')
    expect(statement).toContain('update "seats" as s')
    expect(compiled.params).toContain('MA-260725-0001')
    expect(compiled.params).toContain('0909123456')
  })
})
