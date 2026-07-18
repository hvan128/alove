import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { vietnamesePhoneSchema } from '@/lib/call-contract'
import { cancelBooking } from '@/lib/db/booking-store'
import { isDbConfigured } from '@/lib/db/client'

export const runtime = 'nodejs'

const BodySchema = z.object({
  conversationId: z.string().min(1).max(120),
  code: z.string().min(1).max(40).nullish(),
  phone: vietnamesePhoneSchema.nullish(),
}).superRefine((value, context) => {
  if (Boolean(value.code) === Boolean(value.phone)) return
  context.addIssue({
    code: 'custom',
    message: 'Vé từ cuộc gọi trước cần cả mã vé và số điện thoại.',
  })
})

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request' }, { status: 400 })
  }
  if (!isDbConfigured()) {
    return Response.json({ error: 'database_not_configured' }, { status: 503 })
  }
  const { conversationId, code, phone } = parsed.data
  const result = await cancelBooking({
    callId: conversationId,
    code: code ?? null,
    phone: phone ?? null,
  })
  return Response.json(result)
}
