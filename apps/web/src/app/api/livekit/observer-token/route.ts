import { randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { checkDashboardRequest } from '@/lib/dashboard-auth'
import {
  createParticipantToken,
  isLiveKitConfigured,
  LIVEKIT_WS_URL,
  roomNameForConversation,
} from '@/lib/livekit/token'

export const runtime = 'nodejs'

const BodySchema = z.object({ conversationId: z.string().min(1).max(120) })

export async function POST(req: NextRequest): Promise<Response> {
  if (!checkDashboardRequest(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!isLiveKitConfigured()) {
    return Response.json({ error: 'livekit_not_configured' }, { status: 503 })
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return Response.json({ error: 'invalid_request' }, { status: 400 })

  const roomName = roomNameForConversation(parsed.data.conversationId)
  const identity = `observer-${randomUUID()}`
  const token = await createParticipantToken(roomName, identity, 'Giám sát', 'observer')
  return Response.json({ token, serverUrl: LIVEKIT_WS_URL, roomName })
}
