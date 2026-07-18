import { afterEach, describe, expect, it } from 'vitest'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { getDb, resetDbForTests } from '../index.js'
import { bookingAuditEvents, busBookings, busCallMessages, busCalls } from '../schema.js'

const originalDatabaseUrl = process.env.DATABASE_URL

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
  resetDbForTests()
})

describe('Neon database initialization', () => {
  it('defers database configuration until the database is requested', () => {
    delete process.env.DATABASE_URL

    expect(() => getDb()).toThrow('DATABASE_URL is required')
  })

  it('exports the Alove call, message, booking and audit schema', () => {
    expect([busCalls, busCallMessages, busBookings, bookingAuditEvents].map(getTableName)).toEqual([
      'bus_calls',
      'bus_call_messages',
      'bus_bookings',
      'booking_audit_events',
    ])
    expect(Object.keys(getTableColumns(busBookings))).toEqual(expect.arrayContaining([
      'status',
      'origin',
      'destination',
      'selectedTrip',
      'passengerCount',
      'passengerName',
      'phone',
      'seats',
      'totalFareVnd',
      'bookingCode',
    ]))
  })
})
