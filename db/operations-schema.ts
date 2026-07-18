import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Cross-session operations audit. Distinct from `booking_audit_events`, which
 * is keyed by booking_id and therefore cannot describe what happened before a
 * booking draft existed — accepting a call, delegating to the Agent or taking
 * authority back.
 */
export const operationsAuditEvents = pgTable('operations_audit_events', {
  id: text('id').primaryKey(),
  sessionCode: text('session_code').notNull(),
  eventType: text('event_type').notNull(),
  actorId: text('actor_id').notNull(),
  actorRole: text('actor_role').notNull(),
  reason: text('reason'),
  payload: jsonb('payload').notNull().default({}),
  correlationId: text('correlation_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('operations_audit_events_session_created_idx').on(table.sessionCode, table.createdAt),
  index('operations_audit_events_created_idx').on(table.createdAt),
])
