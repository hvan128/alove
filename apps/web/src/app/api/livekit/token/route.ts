import type { NextRequest } from 'next/server'
import { z } from 'zod'

import { checkDashboardRequest } from '@/lib/dashboard-auth'
import {
  createParticipantToken,
  isLiveKitConfigured,
  LIVEKIT_WS_URL,
  roomNameForConversation,
} from '@/lib/livekit/token'

// WebhookReceiver / AccessToken use node crypto — keep this off the edge runtime.
export const runtime = 'nodejs'

const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  role: z.enum(['customer', 'staff', 'observer']).default('customer'),
  identity: z.string().min(1).max(120).optional(),
  displayName: z.string().min(1).max(120).optional(),
  // Công tắc giọng đọc ẩn phía client; worker đọc lại từ metadata participant.
  ttsProvider: z.enum(['elevenlabs', 'google']).optional(),
})

export async function POST(req: NextRequest) {
  if (!isLiveKitConfigured()) {
    return Response.json({ error: 'livekit_not_configured' }, { status: 503 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }
  const { conversationId, role } = parsed.data

  // An observer token lets its holder listen in on a live call — only the
  // dashboard (gated by DASHBOARD_ACCESS_KEY) may mint one.
  if (role === 'observer' && !checkDashboardRequest(req)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const roomName = roomNameForConversation(conversationId)
  const identity = parsed.data.identity ?? `${role}-${conversationId}`
  const displayName =
    parsed.data.displayName ??
    (role === 'customer' ? 'Khách' : role === 'observer' ? 'Giám sát' : 'Nhân viên')

  const token = await createParticipantToken(
    roomName,
    identity,
    displayName,
    role,
    parsed.data.ttsProvider ? { tts: parsed.data.ttsProvider } : undefined,
  )
  return Response.json({ token, serverUrl: LIVEKIT_WS_URL, roomName })
}
