import { timingSafeEqual } from 'node:crypto'

import { bookingWebhookConfigurationStatus, deliverBookingWebhook } from '@/lib/booking-webhook'
import { listDueBookingWebhookEventIds } from '@/lib/db/webhook-outbox-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret || Buffer.byteLength(secret) < 32) return false
  const actual = Buffer.from(req.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const configuration = bookingWebhookConfigurationStatus()
  if (configuration === 'disabled') {
    return Response.json({ status: 'disabled', processed: 0 }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  if (configuration === 'misconfigured') {
    return Response.json({ error: 'webhook_misconfigured' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const eventIds = await listDueBookingWebhookEventIds(3)
  const counts = { delivered: 0, failed: 0, pending: 0 }
  for (const eventId of eventIds) {
    try {
      const result = await deliverBookingWebhook(eventId)
      if (result.status === 'delivered') counts.delivered += 1
      else if (result.status === 'failed') counts.failed += 1
      else counts.pending += 1
    } catch {
      counts.pending += 1
      console.warn('[alove] scheduled booking webhook deferred', {
        reason: 'delivery_infrastructure_error',
      })
    }
  }

  return Response.json({ status: 'processed', processed: eventIds.length, counts }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
