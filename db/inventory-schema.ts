import { integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { catalogTrips } from './catalog-schema'
import { busBookings, busCalls } from './schema'

export const tripSeats = pgTable('trip_seats', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull().references(() => catalogTrips.id, { onDelete: 'cascade' }),
  seatCode: text('seat_code').notNull(),
  state: text('state').notNull().default('available'),
  revision: integer('revision').notNull().default(0),
  activeHoldId: text('active_hold_id'),
  bookingId: text('booking_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('trip_seats_trip_code_unique').on(table.tripId, table.seatCode),
])

export const seatHolds = pgTable('seat_holds', {
  id: text('id').primaryKey(),
  callId: text('call_id').notNull().references(() => busCalls.id, { onDelete: 'cascade' }),
  bookingDraftId: text('booking_draft_id').notNull().references(() => busBookings.id, { onDelete: 'cascade' }),
  tripId: text('trip_id').notNull().references(() => catalogTrips.id),
  actorId: text('actor_id').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  maxExpiresAt: timestamp('max_expires_at', { withTimezone: true }).notNull(),
  releasedAt: timestamp('released_at', { withTimezone: true }),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
})

export const seatHoldItems = pgTable('seat_hold_items', {
  holdId: text('hold_id').notNull().references(() => seatHolds.id, { onDelete: 'cascade' }),
  tripSeatId: text('trip_seat_id').notNull().references(() => tripSeats.id),
  seatCode: text('seat_code').notNull(),
}, (table) => [
  primaryKey({ columns: [table.holdId, table.tripSeatId] }),
])

export const inventoryEvents = pgTable('inventory_events', {
  id: text('id').primaryKey(),
  tripId: text('trip_id').notNull(),
  holdId: text('hold_id'),
  eventType: text('event_type').notNull(),
  actorId: text('actor_id').notNull(),
  payload: jsonb('payload').notNull().default({}),
  correlationId: text('correlation_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const bookingConfirmations = pgTable('booking_confirmations', {
  id: text('id').primaryKey(),
  callId: text('call_id').notNull().references(() => busCalls.id),
  bookingDraftId: text('booking_draft_id').notNull().references(() => busBookings.id),
  holdId: text('hold_id').notNull().references(() => seatHolds.id),
  actorId: text('actor_id').notNull(),
  idempotencyScope: text('idempotency_scope').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  acceptedSummaryHash: text('accepted_summary_hash').notNull(),
  outcome: text('outcome').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('booking_confirmations_scope_key_unique').on(table.idempotencyScope, table.idempotencyKey),
])

export const confirmedBookings = pgTable('confirmed_bookings', {
  id: text('id').primaryKey(),
  bookingCode: text('booking_code').notNull(),
  callId: text('call_id').notNull().references(() => busCalls.id),
  bookingDraftId: text('booking_draft_id').notNull().references(() => busBookings.id),
  confirmationId: text('confirmation_id').notNull().references(() => bookingConfirmations.id),
  holdId: text('hold_id').notNull().references(() => seatHolds.id),
  snapshot: jsonb('snapshot').notNull(),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex('confirmed_bookings_code_unique').on(table.bookingCode),
  uniqueIndex('confirmed_bookings_confirmation_unique').on(table.confirmationId),
])
