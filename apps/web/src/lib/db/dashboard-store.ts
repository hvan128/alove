import { desc, eq, inArray } from 'drizzle-orm'

import { getDb } from './client'
import { bookingSnapshots, calls, callTurns, type BookingSnapshotRow, type CallRow, type CallTurnRow } from './schema'

export type CallSummary = CallRow & {
  latestBooking: Pick<BookingSnapshotRow, 'status' | 'bookingCode' | 'totalFareVnd'> | null
}

export type CallDetail = {
  call: CallRow
  turns: CallTurnRow[]
  latestSnapshot: BookingSnapshotRow | null
}

// null = persistence not configured (no DATABASE_URL) — callers render an
// explicit "not configured" state instead of an empty list.
export async function listRecentCalls(limit = 50): Promise<CallSummary[] | null> {
  const db = getDb()
  if (!db) return null

  const rows = await db.select().from(calls).orderBy(desc(calls.startedAt)).limit(limit)
  if (rows.length === 0) return []

  const snapshots = await db
    .select()
    .from(bookingSnapshots)
    .where(inArray(bookingSnapshots.callId, rows.map((row) => row.id)))
    .orderBy(desc(bookingSnapshots.createdAt))

  const latestByCall = new Map<string, BookingSnapshotRow>()
  for (const snapshot of snapshots) {
    if (!latestByCall.has(snapshot.callId)) latestByCall.set(snapshot.callId, snapshot)
  }

  return rows.map((row) => {
    const latest = latestByCall.get(row.id)
    return {
      ...row,
      latestBooking: latest
        ? { status: latest.status, bookingCode: latest.bookingCode, totalFareVnd: latest.totalFareVnd }
        : null,
    }
  })
}

export async function getCallDetail(callId: string): Promise<CallDetail | null> {
  const db = getDb()
  if (!db) return null

  const [call] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1)
  if (!call) return null

  const turns = await db.select().from(callTurns).where(eq(callTurns.callId, callId)).orderBy(callTurns.createdAt)
  const [latestSnapshot] = await db
    .select()
    .from(bookingSnapshots)
    .where(eq(bookingSnapshots.callId, callId))
    .orderBy(desc(bookingSnapshots.createdAt))
    .limit(1)

  return { call, turns, latestSnapshot: latestSnapshot ?? null }
}
