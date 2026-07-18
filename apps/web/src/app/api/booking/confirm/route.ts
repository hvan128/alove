import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { confirmBooking } from '@/lib/db/booking-store'

export const runtime = 'nodejs'

const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  tripId: z.string().min(1).max(160),
  passengerName: z.string().min(1).max(120),
  phone: z.string().regex(/^0\d{8,10}$/u),
})

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }

  const { conversationId, ...rest } = parsed.data
  const ticket = await confirmBooking({ callId: conversationId, ...rest })
  if (!ticket) {
    // No live hold for this call — seats expired or were never taken.
    return Response.json({ confirmed: false, reason: 'no_held_seats' })
  }
  return Response.json({ confirmed: true, ...ticket })
}
