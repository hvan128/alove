import { getPublicIntegrationStatus } from '@/lib/livekit/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  return Response.json(getPublicIntegrationStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
