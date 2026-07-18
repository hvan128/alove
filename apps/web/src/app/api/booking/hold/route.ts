import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { holdSeats } from '@/lib/db/booking-store'
import { isDbConfigured } from '@/lib/db/client'

export const runtime = 'nodejs'

const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  tripId: z.string().min(1).max(160),
  passengers: z.number().int().min(1).max(20),
})

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }
  if (!isDbConfigured()) {
    return Response.json({ error: 'database_not_configured' }, { status: 503 })
  }
  const { conversationId, tripId, passengers } = parsed.data

  const held = await holdSeats({ tripId, callId: conversationId, passengers })
  if (!held) {
    return Response.json({ held: false, reason: 'no_seats' })
  }
  return Response.json({
    held: true,
    seatCodes: held.seatCodes,
    seatsHeld: held.seatCodes.length,
    priceVnd: held.priceVnd,
    totalVnd: held.totalVnd,
    seatNoun: held.seatNoun,
  })
}
