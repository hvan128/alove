import { z } from 'zod'

import { checkDashboardRequest } from '@/lib/dashboard-auth'
import { markBookingPaidByOperator } from '@/lib/db/booking-store'

export const runtime = 'nodejs'

const payRequestSchema = z.object({ callId: z.string().trim().min(1).max(128) }).strict()

export async function POST(
  req: Request,
  { params }: { params: Promise<{ bookingId: string }> },
): Promise<Response> {
  if (!checkDashboardRequest(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { bookingId: rawBookingId } = await params
  const bookingId = Number(rawBookingId)
  const parsed = payRequestSchema.safeParse(await req.json().catch(() => null))
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0 || !parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const result = await markBookingPaidByOperator({ bookingId, callId: parsed.data.callId })
  if (!result.paid) {
    return Response.json({ error: 'booking_not_payable' }, { status: 409 })
  }
  return Response.json(result)
}
