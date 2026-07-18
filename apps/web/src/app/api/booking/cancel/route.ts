import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { cancelBooking } from '@/lib/db/booking-store'

export const runtime = 'nodejs'

const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  code: z.string().min(1).max(40).nullish(),
})

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }
  const { conversationId, code } = parsed.data
  const result = await cancelBooking({ callId: conversationId, code: code ?? null })
  return Response.json(result)
}
