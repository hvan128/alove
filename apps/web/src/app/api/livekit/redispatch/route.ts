import type { NextRequest } from 'next/server'
import { AgentDispatchClient } from 'livekit-server-sdk'
import { z } from 'zod'

import {
  createRoomServiceClient,
  isLiveKitConfigured,
  liveKitHttpUrl,
  roomNameForConversation,
} from '@/lib/livekit/token'
import { verifyCallSession } from '@/lib/livekit/call-session'
import { consumeRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const LIVEKIT_AGENT_NAME = process.env.LIVEKIT_AGENT_NAME ?? 'alove'

const BodySchema = z.object({
  sessionToken: z.string().min(1).max(2048),
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
  const session = verifyCallSession(parsed.data.sessionToken)
  if (!session) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const rate = consumeRateLimit(`redispatch:${session.conversationId}`, { limit: 3, windowMs: 2 * 60 * 1000 })
  if (!rate.allowed) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const apiKey = process.env.LIVEKIT_API_KEY!
  const apiSecret = process.env.LIVEKIT_API_SECRET!
  const roomName = roomNameForConversation(session.conversationId)
  try {
    const participants = await createRoomServiceClient().listParticipants(roomName)
    if (!participants.some((participant) => participant.identity === session.identity)) {
      return Response.json({ error: 'call_not_active' }, { status: 410 })
    }
    // ParticipantInfo.Kind.AGENT is protocol value 4. If an agent is already in
    // the room, a retry is idempotently successful instead of dispatching twice.
    if (participants.some((participant) => participant.kind === 4)) {
      return Response.json({ ok: true, alreadyRunning: true })
    }
  } catch {
    // listParticipants is read-only and fails when the room is gone or LiveKit
    // cannot be reached. Crucially, do not call createDispatch in either case:
    // that API would otherwise create a ghost room.
    return Response.json({ error: 'call_not_active' }, { status: 410 })
  }

  const client = new AgentDispatchClient(liveKitHttpUrl(), apiKey, apiSecret, { requestTimeout: 3_000 })
  try {
    await client.createDispatch(roomName, LIVEKIT_AGENT_NAME)
  } catch {
    return Response.json({ error: 'dispatch_failed' }, { status: 502 })
  }
  return Response.json({ ok: true })
}
