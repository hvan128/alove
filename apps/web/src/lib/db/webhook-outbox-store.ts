import { sql } from 'drizzle-orm'

import { requireDb } from './client'
import { bookingWebhookOutbox } from './schema'

export type WebhookOutboxState = {
  status: 'pending' | 'delivering' | 'delivered' | 'failed'
  attempts: number
}

export async function claimBookingWebhookAttempt(eventId: string): Promise<{
  payload: unknown
  attempts: number
} | null> {
  const result = await requireDb().execute(sql`
    UPDATE ${bookingWebhookOutbox}
    SET status = 'delivering',
        attempts = ${bookingWebhookOutbox.attempts} + 1,
        last_attempt_at = now(),
        updated_at = now(),
        last_error_code = NULL
    WHERE ${bookingWebhookOutbox.eventId} = ${eventId}
      AND ${bookingWebhookOutbox.attempts} < 3
      AND (
        (
          ${bookingWebhookOutbox.status} = 'pending'
          AND ${bookingWebhookOutbox.nextAttemptAt} <= now()
        )
        OR (
          ${bookingWebhookOutbox.status} = 'failed'
          AND ${bookingWebhookOutbox.lastErrorCode} IN ('network_error', 'dns_error', 'transient_http')
          AND ${bookingWebhookOutbox.nextAttemptAt} <= now()
        )
        OR (
          ${bookingWebhookOutbox.status} = 'delivering'
          AND ${bookingWebhookOutbox.lastAttemptAt} < now() - interval '1 minute'
        )
      )
    RETURNING payload, attempts
  `)
  const [row] = result.rows as unknown as Array<{ payload: unknown; attempts: number | string }>
  return row ? { payload: row.payload, attempts: Number(row.attempts) } : null
}

export async function getBookingWebhookState(eventId: string): Promise<WebhookOutboxState | null> {
  const result = await requireDb().execute(sql`
    SELECT status, attempts
    FROM ${bookingWebhookOutbox}
    WHERE ${bookingWebhookOutbox.eventId} = ${eventId}
    LIMIT 1
  `)
  const [row] = result.rows as unknown as Array<{ status: WebhookOutboxState['status']; attempts: number | string }>
  return row ? { status: row.status, attempts: Number(row.attempts) } : null
}

export async function recordBookingWebhookDelivered(eventId: string): Promise<void> {
  await requireDb().execute(sql`
    UPDATE ${bookingWebhookOutbox}
    SET status = 'delivered', delivered_at = now(), updated_at = now(), last_error_code = NULL
    WHERE ${bookingWebhookOutbox.eventId} = ${eventId}
  `)
}

export async function recordBookingWebhookFailed(eventId: string, errorCode: string): Promise<void> {
  await requireDb().execute(sql`
    UPDATE ${bookingWebhookOutbox}
    SET status = 'failed',
        updated_at = now(),
        last_error_code = ${errorCode},
        next_attempt_at = CASE
          WHEN ${errorCode} IN ('network_error', 'dns_error', 'transient_http')
            THEN now() + make_interval(secs => (1 << GREATEST(${bookingWebhookOutbox.attempts} - 1, 0)))
          ELSE ${bookingWebhookOutbox.nextAttemptAt}
        END
    WHERE ${bookingWebhookOutbox.eventId} = ${eventId}
      AND ${bookingWebhookOutbox.status} = 'delivering'
  `)
}

/** Events eligible for a scheduled retry; permanent failures are excluded. */
export async function listDueBookingWebhookEventIds(limit = 3): Promise<string[]> {
  const result = await requireDb().execute(sql`
    SELECT ${bookingWebhookOutbox.eventId} AS "eventId"
    FROM ${bookingWebhookOutbox}
    WHERE ${bookingWebhookOutbox.attempts} < 3
      AND (
        (
          ${bookingWebhookOutbox.status} = 'pending'
          AND ${bookingWebhookOutbox.nextAttemptAt} <= now()
        )
        OR (
          ${bookingWebhookOutbox.status} = 'failed'
          AND ${bookingWebhookOutbox.lastErrorCode} IN ('network_error', 'dns_error', 'transient_http')
          AND ${bookingWebhookOutbox.nextAttemptAt} <= now()
        )
        OR (
          ${bookingWebhookOutbox.status} = 'delivering'
          AND ${bookingWebhookOutbox.lastAttemptAt} < now() - interval '1 minute'
        )
      )
    ORDER BY ${bookingWebhookOutbox.createdAt}
    LIMIT ${Math.min(Math.max(limit, 1), 10)}
  `)
  return (result.rows as unknown as Array<{ eventId: string }>).map((row) => row.eventId)
}
