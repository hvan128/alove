import { z } from 'zod'

import { recordCallEnded, recordCallStarted } from '@/lib/db/call-store'

export const runtime = 'nodejs'

// Only the agent worker calls this — same shared-secret seam as booking/advance.
// Events are audit-only: losing one never affects the live call.
const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  type: z.enum(['call.started', 'call.ended']),
  channel: z.enum(['phone', 'web']).optional(),
  callerNumber: z.string().min(1).max(32).optional(),
})

export async function POST(req: Request): Promise<Response> {
  const secret = process.env.AGENT_WEBHOOK_SECRET
  if (!secret) {
    return Response.json({ error: 'agent_secret_not_configured' }, { status: 503 })
  }
  if ((req.headers.get('authorization') ?? '') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }
  const { conversationId, type, channel, callerNumber } = parsed.data

  if (type === 'call.started') {
    await recordCallStarted(conversationId, channel ?? 'web', callerNumber ?? null)
  } else {
    await recordCallEnded(conversationId)
  }
  return Response.json({ ok: true })
}
