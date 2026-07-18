import type { NextRequest } from 'next/server'
import { createCallSession } from '@/lib/livekit/call-session'
import {
  createParticipantToken,
  isLiveKitConfigured,
  LIVEKIT_WS_URL,
  roomNameForConversation,
} from '@/lib/livekit/token'
import { consumeRateLimit, requestIp } from '@/lib/rate-limit'

// WebhookReceiver / AccessToken use node crypto — keep this off the edge runtime.
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isLiveKitConfigured()) {
    return Response.json({ error: 'livekit_not_configured' }, { status: 503 })
  }

  const rate = consumeRateLimit(`call-session:${requestIp(req)}`, { limit: 8, windowMs: 10 * 60 * 1000 })
  if (!rate.allowed) {
    return Response.json(
      { error: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  // The public caller never chooses a room, role, identity, or display name.
  // Those values are server-issued and bound together by the signed session.
  const { session, token: sessionToken } = createCallSession()
  const roomName = roomNameForConversation(session.conversationId)
  const token = await createParticipantToken(roomName, session.identity, 'Khách', 'customer')
  return Response.json({
    token,
    sessionToken,
    conversationId: session.conversationId,
    serverUrl: LIVEKIT_WS_URL,
    roomName,
  })
}
