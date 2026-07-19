import { timingSafeEqual } from 'node:crypto'

import { bookingWebhookConfigurationStatus, deliverBookingWebhook } from '@/lib/booking-webhook'
import {
  countAbandonedBookingWebhooks,
  listDueBookingWebhookEventIds,
  reconcileStaleBookingWebhookAttempts,
} from '@/lib/db/webhook-outbox-store'
import { reportIssue } from '@/lib/observability'

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

  await reconcileStaleBookingWebhookAttempts()
  const eventIds = await listDueBookingWebhookEventIds(3)
  const counts = { delivered: 0, failed: 0, pending: 0 }
  const results = await Promise.all(eventIds.map(async (eventId) => {
    try {
      return await deliverBookingWebhook(eventId)
    } catch (cause) {
      reportIssue('[alove] scheduled booking webhook deferred', {
        level: 'warning',
        cause,
        context: { eventId, reason: 'delivery_infrastructure_error' },
      })
      return { status: 'pending' as const, attempts: 0 }
    }
  }))
  for (const result of results) {
    if (result.status === 'delivered') counts.delivered += 1
    else if (result.status === 'failed') counts.failed += 1
    else counts.pending += 1
  }

  // This cron is the only thing that runs on a schedule, so it doubles as the
  // daily sweep for tickets the outbox has already abandoned. Reporting after
  // the drain keeps the count from including events this run just recovered.
  const abandoned = await countAbandonedBookingWebhooks()
  if (abandoned > 0) {
    reportIssue('[alove] booking webhook outbox has abandoned events', {
      level: 'error',
      context: { abandoned, reason: 'no_retry_path_remaining' },
    })
  }

  return Response.json({ status: 'processed', processed: eventIds.length, counts, abandoned }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
