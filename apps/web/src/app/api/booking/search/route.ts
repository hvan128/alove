import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { listServedRoutes, searchTrips } from '@/lib/db/booking-store'

export const runtime = 'nodejs'

const BodySchema = z.object({
  origin: z.string().min(1).max(80),
  destination: z.string().min(1).max(80),
  // YYYY-MM-DD in Vietnam time; omit to look across the next two weeks.
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).nullish(),
  passengers: z.number().int().min(1).max(20).nullish(),
})

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }

  const trips = await searchTrips(parsed.data)
  // An empty result is a normal answer, not an error — the agent must say the
  // route/date has nothing rather than invent a departure. Hand back what IS
  // served so it can offer a real alternative.
  return Response.json({ trips, servedRoutes: trips.length === 0 ? await listServedRoutes() : [] })
}
