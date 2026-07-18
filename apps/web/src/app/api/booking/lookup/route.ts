import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { findBookings } from '@/lib/db/booking-store'

export const runtime = 'nodejs'

const BodySchema = z.object({
  code: z.string().min(1).max(40).nullish(),
  phone: z.string().min(8).max(15).nullish(),
}).refine((v) => Boolean(v.code || v.phone), { message: 'code hoặc phone là bắt buộc' })

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }
  const bookings = await findBookings(parsed.data)
  return Response.json({ bookings })
}
