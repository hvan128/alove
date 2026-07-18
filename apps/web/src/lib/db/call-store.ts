import { eq, sql } from 'drizzle-orm'
import type { BookingDraft } from '@ordervoice/contracts'

import { getDb } from './client'
import { bookingSnapshots, calls, callTurns } from './schema'

export type CallChannel = 'phone' | 'web'

// Every write here is best-effort audit history: a DB failure must never break
// the live call, so all helpers swallow errors after logging.
function logSkip(op: string, error: unknown): void {
  console.warn(`[call-store] ${op} skipped:`, error instanceof Error ? error.message : error)
}

export async function recordCallStarted(
  conversationId: string,
  channel: CallChannel,
  callerNumber?: string | null,
): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    await db
      .insert(calls)
      .values({ id: conversationId, channel, callerNumber: callerNumber ?? null })
      .onConflictDoUpdate({
        target: calls.id,
        set: { channel, ...(callerNumber ? { callerNumber } : {}) },
      })
  } catch (error) {
    logSkip('recordCallStarted', error)
  }
}

export async function recordCallEnded(conversationId: string): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    await db
      .update(calls)
      .set({ status: 'ended', endedAt: sql`now()` })
      .where(eq(calls.id, conversationId))
  } catch (error) {
    logSkip('recordCallEnded', error)
  }
}

export async function recordAdvance(
  conversationId: string,
  customerText: string,
  reply: string,
  draft: BookingDraft,
): Promise<void> {
  const db = getDb()
  if (!db) return
  try {
    // The agent may call advance before (or without) a call.started event — the
    // web demo path has no agent worker at all — so ensure the call row exists.
    await db.insert(calls).values({ id: conversationId }).onConflictDoNothing()
    await db.insert(callTurns).values([
      { callId: conversationId, role: 'customer', text: customerText },
      { callId: conversationId, role: 'agent', text: reply },
    ])
    await db
      .insert(bookingSnapshots)
      .values({
        callId: conversationId,
        snapshot: draft,
        status: draft.status,
        bookingCode: draft.bookingCode,
        totalFareVnd: draft.totalFareVnd,
      })
      .onConflictDoNothing({ target: [bookingSnapshots.callId, bookingSnapshots.bookingCode] })
  } catch (error) {
    logSkip('recordAdvance', error)
  }
}
