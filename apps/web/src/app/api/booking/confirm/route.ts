import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { vietnamesePhoneSchema } from '@/lib/call-contract'
import { confirmBooking, isExplicitBookingConfirmation } from '@/lib/db/booking-store'
import { isDbConfigured } from '@/lib/db/client'

export const runtime = 'nodejs'

const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  tripId: z.string().min(1).max(160),
  passengerName: z.string().min(1).max(120),
  phone: vietnamesePhoneSchema,
  confirmationText: z.string().min(1).max(240).refine(isExplicitBookingConfirmation, {
    message: 'Khách phải xác nhận đặt vé bằng một câu rõ ràng.',
  }),
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

  const { conversationId, ...rest } = parsed.data
  const ticket = await confirmBooking({ callId: conversationId, ...rest })
  if (!ticket) {
    // No live hold for this call — seats expired or were never taken.
    return Response.json({ confirmed: false, reason: 'no_held_seats' })
  }
  return Response.json({ confirmed: true, ...ticket })
}
