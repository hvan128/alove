import { after } from 'next/server'
import { z } from 'zod'
import type { CallMessage } from '@ordervoice/contracts'
import { bookingDraftSchema } from '@ordervoice/contracts'
import { advanceBookingAgent, createInitialBooking } from '@ordervoice/core/bus-booking'

import { recordAdvance } from '@/lib/db/call-store'

export const runtime = 'nodejs'

// The agent worker is the only caller — it authenticates with the shared secret.
// Booking stays server-authoritative and deterministic; the agent never invents
// prices, trips, seats or ticket codes, it only relays what core returns.
const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  // Agent holds the draft between turns and echoes it back; null on the first turn.
  draft: bookingDraftSchema.nullable().default(null),
  text: z.string().min(1).max(2000),
  messageId: z.string().min(1).max(120).optional(),
})

function unauthorized(): Response {
  return Response.json({ error: 'unauthorized' }, { status: 401 })
}

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.AGENT_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: 'agent_secret_not_configured' }, { status: 503 })
  }
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return unauthorized()
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }
  const { conversationId, text, messageId } = parsed.data
  const draft = parsed.data.draft ?? createInitialBooking(conversationId)

  const message: CallMessage = {
    id: messageId ?? `customer-${Date.now()}`,
    conversationId: draft.conversationId,
    role: 'customer',
    text,
    createdAt: new Date().toISOString(),
    channel: 'voice',
    final: true,
  }

  const turn = advanceBookingAgent(draft, message)

  // Audit history goes to Neon after the response is sent — the caller (a live
  // voice turn) never waits on the database. Outside a request scope (unit
  // tests call POST directly) `after` throws, so fall back to fire-and-forget;
  // recordAdvance itself never rejects.
  const persist = () => recordAdvance(draft.conversationId, text, turn.reply, turn.draft)
  try {
    after(persist)
  } catch {
    void persist()
  }

  return Response.json({ draft: turn.draft, reply: turn.reply })
}
