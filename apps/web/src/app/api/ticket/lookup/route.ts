import { z } from 'zod'

import { findTicketForCustomer } from '@/lib/db/booking-store'
import { clientKey, rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * The one endpoint a passenger reaches without a shared secret.
 *
 * Everything under /api/booking is agent-only because it moves real inventory.
 * This route only reads, and only ever one ticket, for someone who already knows
 * the code and the last four digits of the phone that booked it.
 */

const BodySchema = z.object({
  code: z.string().min(1).max(40),
  phoneLast4: z.string().regex(/^\d{4}$/u),
})

// Ten attempts a minute leaves a fat-fingered passenger plenty of room and still
// makes walking the 10k digit space take days.
const ATTEMPT_LIMIT = 10
const WINDOW_MS = 60_000

export async function POST(req: Request): Promise<Response> {
  const limit = rateLimit(`ticket-lookup:${clientKey(req)}`, ATTEMPT_LIMIT, WINDOW_MS)
  if (!limit.allowed) {
    return Response.json(
      { error: 'too_many_attempts' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    )
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  let ticket
  try {
    ticket = await findTicketForCustomer(parsed.data)
  } catch (error) {
    // An unreachable database must not surface as an unhandled 500 on the one
    // route strangers can reach: the driver's error text names tables and
    // columns. Log it server-side, tell the passenger something useful.
    console.error('ticket lookup failed', error)
    return Response.json({ error: 'lookup_unavailable' }, { status: 503 })
  }

  if (!ticket) {
    // Same answer for "no such code" and "wrong digits" — see findTicketForCustomer.
    return Response.json({ error: 'not_found' }, { status: 404 })
  }
  return Response.json({ ticket })
}
