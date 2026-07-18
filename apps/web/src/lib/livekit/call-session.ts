import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

export const CALL_SESSION_TTL_SECONDS = 15 * 60

const callSessionSchema = z.object({
  version: z.literal(1),
  conversationId: z.string().uuid(),
  identity: z.string().min(1),
  expiresAt: z.number().int().positive(),
})

export type CallSession = z.infer<typeof callSessionSchema>

function signingSecret(): string {
  const secret = process.env.LIVEKIT_API_SECRET
  if (!secret) throw new Error('LIVEKIT_API_SECRET not set')
  return secret
}

function signature(payload: string): string {
  return createHmac('sha256', signingSecret())
    .update(`alove-call-session:v1:${payload}`)
    .digest('base64url')
}

export function createCallSession(now = Date.now()): { session: CallSession; token: string } {
  const conversationId = randomUUID()
  const session: CallSession = {
    version: 1,
    conversationId,
    identity: `customer-${randomUUID()}`,
    expiresAt: Math.floor(now / 1000) + CALL_SESSION_TTL_SECONDS,
  }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return { session, token: `${payload}.${signature(payload)}` }
}

export function verifyCallSession(token: string | null | undefined, now = Date.now()): CallSession | null {
  if (!token) return null
  const [payload, provided, extra] = token.split('.')
  if (!payload || !provided || extra) return null

  const expected = signature(payload)
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = callSessionSchema.safeParse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
    if (!parsed.success || parsed.data.expiresAt <= Math.floor(now / 1000)) return null
    return parsed.data
  } catch {
    return null
  }
}
