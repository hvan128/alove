import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SQL } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'

const fakeDb = vi.hoisted(() => ({ execute: vi.fn() }))

vi.mock('./client', () => ({
  requireDb: vi.fn(() => fakeDb),
}))

import { createEmptyBooking } from '@/lib/call-contract'
import { recordBookingUpdated, recordCallEnded, recordTranscriptFinal } from './call-store'

function compileCall(index = 0) {
  const query = fakeDb.execute.mock.calls[index]![0] as SQL
  const compiled = new PgDialect().sqlToQuery(query)
  return { ...compiled, sql: compiled.sql.replace(/\s+/gu, ' ').trim().toLowerCase() }
}

describe('call-store event projection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeDb.execute.mockResolvedValue({ rows: [] })
  })

  it('stores final transcripts atomically and idempotently by call plus event id', async () => {
    await recordTranscriptFinal({
      conversationId: 'call-1',
      eventId: 'turn-1',
      sequence: 1,
      role: 'customer',
      text: 'Tôi muốn đặt vé.',
    })

    expect(fakeDb.execute).toHaveBeenCalledTimes(1)
    const compiled = compileCall()
    expect(compiled.sql).toContain('with call_row as ( insert into "calls"')
    expect(compiled.sql).toContain('insert into "call_turns"')
    expect(compiled.sql).toContain('on conflict (call_id, event_id) do nothing')
    expect(compiled.params).toEqual(expect.arrayContaining(['call-1', 'turn-1', 1, 'customer', 'Tôi muốn đặt vé.']))
  })

  it('stores normalized booking snapshots with the same idempotency boundary', async () => {
    const booking = createEmptyBooking('call-1')
    await recordBookingUpdated({
      conversationId: 'call-1',
      eventId: 'booking-1',
      sequence: 2,
      booking,
    })

    const compiled = compileCall()
    expect(compiled.sql).toContain('insert into "booking_snapshots"')
    expect(compiled.sql).toContain('on conflict (call_id, event_id) do nothing')
    expect(compiled.params).toContain(JSON.stringify(booking))
    expect(compiled.params).toEqual(expect.arrayContaining(['call-1', 'booking-1', 2, 'collecting']))
  })

  it('keeps the first ended timestamp when the webhook is retried', async () => {
    await recordCallEnded('call-1')

    const compiled = compileCall()
    expect(compiled.sql).toContain('on conflict (id) do update')
    expect(compiled.sql).toContain('ended_at = coalesce("calls"."ended_at", excluded.ended_at)')
    expect(compiled.params).toContain('call-1')
  })
})
