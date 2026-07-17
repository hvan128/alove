import { boolean, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

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
