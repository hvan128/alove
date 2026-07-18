import { boolean, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { catalogTrips, catalogVersions } from './catalog-schema'

export * from './catalog-schema'
export * from './inventory-schema'

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  source: text('source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transcriptSegments = pgTable('transcript_segments', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  providerEventId: text('provider_event_id'),
  speaker: text('speaker').notNull(),
  text: text('text').notNull(),
  startedAtMs: integer('started_at_ms').notNull(),
  endedAtMs: integer('ended_at_ms').notNull(),
  confidence: real('confidence'),
  source: text('source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('transcript_segments_provider_event_unique').on(table.conversationId, table.providerEventId),
])

export const orderDrafts = pgTable('order_drafts', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  customerId: text('customer_id'),
  customerName: text('customer_name'),
  status: text('status').notNull(),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  externalReference: text('external_reference'),
  exceptions: jsonb('exceptions').notNull().default([]),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orderLines = pgTable('order_lines', {
  id: text('id').primaryKey(),
  orderDraftId: text('order_draft_id').notNull().references(() => orderDrafts.id, { onDelete: 'cascade' }),
  sku: text('sku'),
  productLabel: text('product_label').notNull(),
  quantity: real('quantity'),
  unit: text('unit'),
  resolution: text('resolution').notNull(),
})

export const orderEvidence = pgTable('order_evidence', {
  id: text('id').primaryKey(),
  orderLineId: text('order_line_id').notNull().references(() => orderLines.id, { onDelete: 'cascade' }),
  segmentId: text('segment_id').notNull().references(() => transcriptSegments.id, { onDelete: 'cascade' }),
  quote: text('quote').notNull(),
  startMs: integer('start_ms').notNull(),
  endMs: integer('end_ms').notNull(),
  confidence: real('confidence').notNull(),
})

export const replies = pgTable('replies', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  approvedForSpeech: boolean('approved_for_speech').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const exports = pgTable('erp_exports', {
  idempotencyKey: text('idempotency_key').primaryKey(),
  orderDraftId: text('order_draft_id').notNull().references(() => orderDrafts.id, { onDelete: 'cascade' }),
  externalReference: text('external_reference').notNull(),
  requestSnapshot: jsonb('request_snapshot').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const busCalls = pgTable('bus_calls', {
  id: text('id').primaryKey(),
  mode: text('mode').notNull(),
  status: text('status').notNull(),
  transcriptLanguage: text('transcript_language').notNull().default('original'),
  transport: text('transport').notNull().default('local'),
  agentState: text('agent_state').notNull().default('offline'),
  valseaState: text('valsea_state').notNull().default('unconfigured'),
  revision: integer('revision').notNull().default(0),
  isDemo: boolean('is_demo').notNull().default(true),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const busCallEvents = pgTable('bus_call_events', {
  id: text('id').primaryKey(),
  callId: text('call_id').notNull().references(() => busCalls.id, { onDelete: 'cascade' }),
  eventId: text('event_id').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('bus_call_events_call_event_unique').on(table.callId, table.eventId),
])

export const busCallMessages = pgTable('bus_call_messages', {
  id: text('id').primaryKey(),
  callId: text('call_id').notNull().references(() => busCalls.id, { onDelete: 'cascade' }),
  providerEventId: text('provider_event_id'),
  role: text('role').notNull(),
  channel: text('channel').notNull(),
  text: text('text').notNull(),
  language: text('language').notNull().default('vi'),
  translations: jsonb('translations').notNull().default({}),
  confidence: real('confidence'),
  startedAtMs: integer('started_at_ms').notNull().default(0),
  endedAtMs: integer('ended_at_ms').notNull().default(0),
  final: boolean('final').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('bus_call_messages_provider_event_unique').on(table.callId, table.providerEventId),
])

export const busBookings = pgTable('bus_bookings', {
  id: text('id').primaryKey(),
  callId: text('call_id').notNull().references(() => busCalls.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),
  runtimeProfile: text('runtime_profile').notNull().default('demo'),
  catalogVersionId: text('catalog_version_id').references(() => catalogVersions.id),
  tripId: text('trip_id').references(() => catalogTrips.id),
  seatHoldId: text('seat_hold_id'),
  origin: text('origin'),
  destination: text('destination'),
  travelDateLabel: text('travel_date_label'),
  timeWindow: text('time_window'),
  passengerCount: integer('passenger_count'),
  selectedTrip: jsonb('selected_trip'),
  seats: jsonb('seats').notNull().default([]),
  passengerName: text('passenger_name'),
  phone: text('phone'),
  pickupPoint: text('pickup_point'),
  dropoffPoint: text('dropoff_point'),
  vehiclePreference: text('vehicle_preference'),
  paymentMethod: text('payment_method'),
  note: text('note'),
  totalFareVnd: integer('total_fare_vnd'),
  bookingCode: text('booking_code'),
  evidenceMessageIds: jsonb('evidence_message_ids').notNull().default([]),
  fieldEvidence: jsonb('field_evidence').notNull().default({}),
  confirmedFields: jsonb('confirmed_fields').notNull().default([]),
  reviewItems: jsonb('review_items').notNull().default([]),
  revision: integer('revision').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('bus_bookings_call_unique').on(table.callId),
  uniqueIndex('bus_bookings_code_unique').on(table.bookingCode),
])

export const bookingAuditEvents = pgTable('booking_audit_events', {
  id: text('id').primaryKey(),
  bookingId: text('booking_id').notNull().references(() => busBookings.id, { onDelete: 'cascade' }),
  actor: text('actor').notNull(),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
