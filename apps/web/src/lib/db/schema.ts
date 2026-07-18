import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

// Final-only persistence: no partial transcripts, no raw audio. The booking core
// stays the source of truth — rows here are an audit/history projection of what
// already happened, never an input to the next turn.
export const calls = pgTable('calls', {
  id: text('id').primaryKey(), // = conversationId (room booking-<id>)
  channel: text('channel', { enum: ['phone', 'web'] }).notNull().default('web'),
  callerNumber: text('caller_number'),
  status: text('status', { enum: ['active', 'ended'] }).notNull().default('active'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
})

export const callTurns = pgTable('call_turns', {
  id: serial('id').primaryKey(),
  callId: text('call_id').notNull().references(() => calls.id),
  role: text('role', { enum: ['customer', 'agent'] }).notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const bookingSnapshots = pgTable('booking_snapshots', {
  id: serial('id').primaryKey(),
  callId: text('call_id').notNull().references(() => calls.id),
  snapshot: jsonb('snapshot').notNull(),
  status: text('status', {
    enum: ['collecting', 'trip_proposed', 'awaiting_confirmation', 'confirmed'],
  }).notNull(),
  bookingCode: text('booking_code'),
  totalFareVnd: integer('total_fare_vnd'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // NULL booking codes stay distinct in Postgres, so interim snapshots insert
  // freely while a duplicate confirmed snapshot (same code) is rejected.
  uniqueIndex('booking_snapshots_call_code_unique').on(table.callId, table.bookingCode),
])

export type CallRow = typeof calls.$inferSelect
export type CallTurnRow = typeof callTurns.$inferSelect
export type BookingSnapshotRow = typeof bookingSnapshots.$inferSelect
