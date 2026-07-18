// @vitest-environment node

import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const execute = vi.fn()

vi.mock('./client', () => ({ requireDb: () => ({ execute }) }))

import {
  claimBookingWebhookAttempt,
  listDueBookingWebhookEventIds,
  reconcileStaleBookingWebhookAttempts,
  recordBookingWebhookFailed,
} from './webhook-outbox-store'

function sqlText(value: SQL): string {
  return new PgDialect().sqlToQuery(value).sql.replace(/\s+/gu, ' ').trim().toLowerCase()
}

describe('durable webhook outbox store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    execute.mockResolvedValue({ rows: [] })
  })

  it('claims only due retryable rows below the persisted three-attempt ceiling', async () => {
    await claimBookingWebhookAttempt('booking.confirmed.v1:MA-260720-0001')
    const query = sqlText(execute.mock.calls[0]![0] as SQL)

    expect(query).toContain('"attempts" < 3')
    expect(query).toContain("\"last_error_code\" in ('network_error', 'dns_error', 'transient_http')")
    expect(query).toContain('"next_attempt_at" <= now()')
    expect(query).toContain("\"status\" = 'delivering'")
    expect(query).toContain("interval '1 minute'")
  })

  it('persists retry schedules only for transient failure codes', async () => {
    await recordBookingWebhookFailed('event-1', 'permanent_http')
    const query = sqlText(execute.mock.calls[0]![0] as SQL)

    expect(query).toContain("in ('network_error', 'dns_error', 'transient_http')")
    expect(query).toContain('next_attempt_at = case')
    expect(query).toContain('make_interval')
  })

  it('lists pending, transient-failed and stale leased events for the cron drainer', async () => {
    execute.mockResolvedValue({ rows: [{ eventId: 'event-1' }, { eventId: 'event-2' }] })
    await expect(listDueBookingWebhookEventIds(3)).resolves.toEqual(['event-1', 'event-2'])
    const query = sqlText(execute.mock.calls[0]![0] as SQL)

    expect(query).toContain('"attempts" < 3')
    expect(query).toContain("\"status\" = 'pending'")
    expect(query).toContain("\"status\" = 'failed'")
    expect(query).toContain('limit $1')
  })

  it('terminally reconciles a stale final lease instead of leaving it delivering forever', async () => {
    execute.mockResolvedValue({ rows: [{ eventId: 'event-1' }] })
    await expect(reconcileStaleBookingWebhookAttempts('event-1')).resolves.toBe(1)
    const query = sqlText(execute.mock.calls[0]![0] as SQL)

    expect(query).toContain("\"status\" = 'delivering'")
    expect(query).toContain('"attempts" >= 3')
    expect(query).toContain("interval '1 minute'")
    expect(query).toContain("last_error_code = 'retry_budget_exhausted'")
    expect(query).toContain('"event_id" = $1')
  })
})
