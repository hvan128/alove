import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { bookingWebhookConfigurationStatus, deliverBookingWebhook } from '@/lib/booking-webhook'
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
  const webhookConfiguration = bookingWebhookConfigurationStatus()
  const ticket = await confirmBooking({
    callId: conversationId,
    ...rest,
    enqueueWebhook: webhookConfiguration === 'enabled',
  })
  if (!ticket) {
    // No live hold for this call — seats expired or were never taken.
    return Response.json({ confirmed: false, reason: 'no_held_seats' })
  }
  let webhook: Awaited<ReturnType<typeof deliverBookingWebhook>> = {
    status: webhookConfiguration === 'enabled' ? 'pending' : webhookConfiguration,
    attempts: 0,
  }
  if (webhookConfiguration === 'enabled') {
    try {
      webhook = await deliverBookingWebhook(ticket.webhookEventId ?? null)
    } catch {
      // Booking is already authoritative and the durable event remains queued.
      // Delivery infrastructure must never turn that success into an HTTP 500.
      console.warn('[alove] booking webhook deferred', { reason: 'delivery_infrastructure_error' })
    }
  }
  return Response.json({
    confirmed: true,
    code: ticket.code,
    seatCodes: ticket.seatCodes,
    totalVnd: ticket.totalVnd,
    departureLabel: ticket.departureLabel,
    pickupPoint: ticket.pickupPoint,
    webhook,
  })
}
