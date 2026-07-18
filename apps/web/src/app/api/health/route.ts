import { sql } from 'drizzle-orm'

import { isAgentWebhookConfigured } from '@/lib/agent-auth'
import { isDbConfigured, requireDb } from '@/lib/db/client'
import { isLiveKitConfigured, probeLiveKit } from '@/lib/livekit/token'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type DependencyState = 'ready' | 'not_configured' | 'unreachable' | 'not_ready'

export async function GET(): Promise<Response> {
  let database: DependencyState = isDbConfigured() ? 'ready' : 'not_configured'
  if (database === 'ready') {
    try {
      // Referencing the contract columns makes a missing migration fail closed;
      // sellable inventory makes an empty/stale seed fail readiness as well.
      const result = await requireDb().execute(sql`
        SELECT
          EXISTS (SELECT 1 FROM operators) AS "hasOperator",
          EXISTS (
            SELECT 1
            FROM trips t
            INNER JOIN routes r ON r.id = t.route_id
            INNER JOIN seats s ON s.trip_id = t.id
            WHERE t.active = 'yes'
              AND r.active = 'yes'
              AND t.departure_at > now()
              AND (
                s.status = 'available'
                OR (s.status = 'held' AND (s.hold_expires_at IS NULL OR s.hold_expires_at <= now()))
              )
          ) AS "hasSellableTrip",
          (SELECT count(*) FROM call_turns WHERE sequence IS NULL OR event_id IS NULL) = 0
            AS "auditSchemaReady",
          (SELECT count(*) FROM booking_snapshots WHERE sequence IS NULL OR event_id IS NULL) = 0
            AS "snapshotSchemaReady",
          (SELECT count(*) FROM bookings WHERE confirmation_text IS NULL) = 0
            AS "bookingSchemaReady"
      `)
      const [row] = result.rows as unknown as Array<{
        hasOperator: boolean
        hasSellableTrip: boolean
        auditSchemaReady: boolean
        snapshotSchemaReady: boolean
        bookingSchemaReady: boolean
      }>
      if (!row || !Object.values(row).every(Boolean)) database = 'not_ready'
    } catch {
      database = 'unreachable'
    }
  }

  let livekit: DependencyState = isLiveKitConfigured() ? 'ready' : 'not_configured'
  if (livekit === 'ready') {
    try {
      await probeLiveKit()
    } catch {
      livekit = 'unreachable'
    }
  }

  const services = {
    database,
    livekit,
    agentWebhook: isAgentWebhookConfigured() ? 'ready' : 'not_configured',
  } as const
  const ready = Object.values(services).every((state) => state === 'ready')

  return Response.json(
    { status: ready ? 'ready' : 'not_ready', services },
    { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
