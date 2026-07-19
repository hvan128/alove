import { z } from 'zod'

import { newsletterSubscriptions } from '@/lib/db/schema'
import { isDbConfigured, requireDb } from '@/lib/db/client'
import { consumeRateLimit, requestIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

export async function POST(req: Request): Promise<Response> {
  const rate = consumeRateLimit(`newsletter:${requestIp(req)}`, { limit: 5, windowMs: 60 * 60 * 1_000 })
  if (!rate.allowed) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'invalid_email' }, { status: 400 })
  if (!isDbConfigured()) return Response.json({ error: 'service_unavailable' }, { status: 503 })

  const inserted = await requireDb().insert(newsletterSubscriptions)
    .values({
      email: parsed.data.email,
      source: 'landing_footer',
    })
    .onConflictDoNothing()
    .returning({ email: newsletterSubscriptions.email })

  return Response.json({ subscribed: true }, { status: inserted.length === 0 ? 200 : 201 })
}
