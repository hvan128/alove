import { sql } from 'drizzle-orm'

import type { BookingSnapshot } from '@/lib/call-contract'

import { requireDb } from './client'
import { bookingSnapshots, calls, callTurns } from './schema'

export type CallChannel = 'phone' | 'web'

export async function recordCallStarted(
  conversationId: string,
  channel: CallChannel,
  callerNumber?: string | null,
): Promise<void> {
  const db = requireDb()
  await db
    .insert(calls)
    .values({ id: conversationId, channel, callerNumber: callerNumber ?? null })
    .onConflictDoUpdate({
      target: calls.id,
      // A delayed/retried start must never reopen a call already marked ended.
      set: { channel, ...(callerNumber ? { callerNumber } : {}) },
    })
}

export async function recordCallEnded(conversationId: string): Promise<void> {
  const db = requireDb()
  await db.execute(sql`
    INSERT INTO ${calls} (id, status, ended_at)
    VALUES (${conversationId}, 'ended', now())
    ON CONFLICT (id) DO UPDATE
    SET status = 'ended',
        ended_at = coalesce(${calls.endedAt}, EXCLUDED.ended_at)
  `)
}

export async function recordTranscriptFinal(input: {
  conversationId: string
  eventId: string
  sequence: number
  role: 'customer' | 'agent'
  text: string
}): Promise<void> {
  const db = requireDb()

  await db.execute(sql`
    WITH call_row AS (
      INSERT INTO ${calls} (id)
      VALUES (${input.conversationId})
      ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
      RETURNING id
    )
    INSERT INTO ${callTurns} (call_id, event_id, sequence, role, text)
    SELECT c.id, ${input.eventId}, ${input.sequence}, ${input.role}, ${input.text}
    FROM call_row c
    ON CONFLICT (call_id, event_id) DO NOTHING
  `)
}

export async function recordBookingUpdated(input: {
  conversationId: string
  eventId: string
  sequence: number
  booking: BookingSnapshot
}): Promise<void> {
  const db = requireDb()

  await db.execute(sql`
    WITH call_row AS (
      INSERT INTO ${calls} (id)
      VALUES (${input.conversationId})
      ON CONFLICT (id) DO UPDATE SET id = EXCLUDED.id
      RETURNING id
    )
    INSERT INTO ${bookingSnapshots} (
      call_id, event_id, sequence, snapshot, status, booking_code, total_fare_vnd
    )
    SELECT c.id,
           ${input.eventId},
           ${input.sequence},
           ${JSON.stringify(input.booking)}::jsonb,
           ${input.booking.status},
           ${input.booking.bookingCode},
           ${input.booking.totalFareVnd}
    FROM call_row c
    ON CONFLICT (call_id, event_id) DO NOTHING
  `)
}
