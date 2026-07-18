import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { nextDeparturesOnRoute, searchTrips, suggestRoutes } from '@/lib/db/booking-store'

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
  const { origin, destination, date, passengers } = parsed.data

  const trips = await searchTrips(parsed.data)
  if (trips.length > 0) {
    return Response.json({ trips, routeServed: true })
  }

  // "We don't run this route at all" and "we run it, just not that day" need
  // different answers. Collapsing them told a caller asking for the right route
  // on the wrong date that the route did not exist.
  const otherDates = await nextDeparturesOnRoute({ origin, destination, passengers })
  if (otherDates.length > 0) {
    return Response.json({
      trips: [],
      routeServed: true,
      reason: date ? 'no_trip_on_date' : 'no_seats',
      otherDates,
      suggestedRoutes: [],
    })
  }

  return Response.json({
    trips: [],
    routeServed: false,
    reason: 'route_not_served',
    otherDates: [],
    suggestedRoutes: await suggestRoutes({ origin, destination }),
  })
}
