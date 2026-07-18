import { afterEach, describe, expect, it } from 'vitest'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { getDb, resetDbForTests } from '../index.js'
import {
  bookingAuditEvents,
  busBookings,
  busCallEvents,
  busCallMessages,
  busCalls,
  catalogTrips,
  catalogVersions,
  bookingConfirmations,
  confirmedBookings,
  inventoryEvents,
  seatHoldItems,
  seatHolds,
  tripSeats,
  vehicleTemplateSeats,
  vehicleTemplates,
} from '../schema.js'

const originalDatabaseUrl = process.env.DATABASE_URL

afterEach(async () => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
  await resetDbForTests()
})

describe('Neon database initialization', () => {
  it('defers database configuration until the database is requested', () => {
    delete process.env.DATABASE_URL

    expect(() => getDb()).toThrow('DATABASE_URL is required')
  })

  it('exports the VéĐi call, message, booking and audit schema', () => {
    expect([busCalls, busCallEvents, busCallMessages, busBookings, bookingAuditEvents].map(getTableName)).toEqual([
      'bus_calls',
      'bus_call_events',
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
      'pickupPoint',
      'dropoffPoint',
      'fieldEvidence',
      'confirmedFields',
      'reviewItems',
      'revision',
    ]))
    expect(Object.keys(getTableColumns(busCalls))).toEqual(expect.arrayContaining([
      'transcriptLanguage',
      'transport',
      'agentState',
      'valseaState',
      'revision',
    ]))
    expect(Object.keys(getTableColumns(busCallMessages))).toEqual(expect.arrayContaining([
      'language',
      'translations',
      'confidence',
      'startedAtMs',
      'endedAtMs',
    ]))
  })

  it('exports versioned operator catalog tables', () => {
    expect([
      catalogVersions,
      catalogTrips,
      vehicleTemplates,
      vehicleTemplateSeats,
    ].map(getTableName)).toEqual([
      'catalog_versions',
      'catalog_trips',
      'vehicle_templates',
      'vehicle_template_seats',
    ])
  })

  it('exports authoritative trip seat inventory tables', () => {
    expect([
      tripSeats,
      seatHolds,
      seatHoldItems,
      inventoryEvents,
      bookingConfirmations,
      confirmedBookings,
    ].map(getTableName)).toEqual([
      'trip_seats',
      'seat_holds',
      'seat_hold_items',
      'inventory_events',
      'booking_confirmations',
      'confirmed_bookings',
    ])
  })
})
