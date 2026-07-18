import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { vietnamesePhoneSchema } from '@/lib/call-contract'
import { findBookings } from '@/lib/db/booking-store'
import { isDbConfigured } from '@/lib/db/client'

export const runtime = 'nodejs'

const BodySchema = z.object({
  code: z.string().min(1).max(40),
  phone: vietnamesePhoneSchema,
})

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }
  if (!isDbConfigured()) {
    return Response.json({ error: 'database_not_configured' }, { status: 503 })
  }
  const bookings = await findBookings(parsed.data)
  return Response.json({ bookings })
}
