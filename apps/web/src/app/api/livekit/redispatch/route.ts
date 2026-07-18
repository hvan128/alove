import type { NextRequest } from 'next/server'
import { AgentDispatchClient } from 'livekit-server-sdk'
import { z } from 'zod'

import { isLiveKitConfigured, LIVEKIT_WS_URL, roomNameForConversation } from '@/lib/livekit/token'

export const runtime = 'nodejs'

const LIVEKIT_AGENT_NAME = process.env.LIVEKIT_AGENT_NAME ?? 'alove'

const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
})

/**
 * Re-dispatch the booking agent into an existing room.
 *
 * The participant token's RoomConfiguration dispatch is one-shot: if it fires
 * while the worker is mid-restart (or a worker grabbed then dropped it), no agent
 * ever joins and the caller hears silence. The client calls this after ~12s of no
 * agent so a fresh dispatch lands on a now-ready worker.
 */
export async function POST(req: NextRequest) {
  if (!isLiveKitConfigured()) {
    return Response.json({ error: 'livekit_not_configured' }, { status: 503 })
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }

  const apiKey = process.env.LIVEKIT_API_KEY!
  const apiSecret = process.env.LIVEKIT_API_SECRET!
  // AgentDispatchClient needs the HTTP(S) host, not the ws(s):// URL.
  const client = new AgentDispatchClient(LIVEKIT_WS_URL.replace(/^ws/u, 'http'), apiKey, apiSecret)
  try {
    await client.createDispatch(roomNameForConversation(parsed.data.conversationId), LIVEKIT_AGENT_NAME)
  } catch {
    return Response.json({ error: 'dispatch_failed' }, { status: 502 })
  }
  return Response.json({ ok: true })
}
