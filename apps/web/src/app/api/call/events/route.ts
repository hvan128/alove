import { z } from 'zod'

import { requireAgent } from '@/lib/agent-auth'
import { bookingSnapshotSchema } from '@/lib/call-contract'
import {
  recordBookingUpdated,
  recordCallEnded,
  recordCallStarted,
  recordTranscriptFinal,
} from '@/lib/db/call-store'
import { isDbConfigured } from '@/lib/db/client'

export const runtime = 'nodejs'

const ConversationIdSchema = z.string().min(1).max(120)
const EventIdSchema = z.string().min(1).max(160)
const SequenceSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)

const BodySchema = z.discriminatedUnion('type', [
  z.object({
    conversationId: ConversationIdSchema,
    type: z.literal('call.started'),
    channel: z.enum(['phone', 'web']).optional(),
    callerNumber: z.string().min(1).max(32).optional(),
  }),
  z.object({
    conversationId: ConversationIdSchema,
    type: z.literal('call.ended'),
  }),
  z.object({
    conversationId: ConversationIdSchema,
    type: z.literal('transcript.final'),
    eventId: EventIdSchema,
    sequence: SequenceSchema,
    role: z.enum(['customer', 'agent']),
    text: z.string().trim().min(1).max(10_000),
  }),
  z.object({
    conversationId: ConversationIdSchema,
    type: z.literal('booking.updated'),
    eventId: EventIdSchema,
    sequence: SequenceSchema,
    booking: bookingSnapshotSchema,
  }),
]).superRefine((event, context) => {
  if (event.type !== 'booking.updated' || event.booking.conversationId === event.conversationId) return
  context.addIssue({
    code: 'custom',
    path: ['booking', 'conversationId'],
    message: 'Booking snapshot must belong to the webhook conversation.',
  })
})

export async function POST(req: Request): Promise<Response> {
  const denied = requireAgent(req)
  if (denied) return denied.response

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return Response.json({ error: 'invalid_request', issues: parsed.error.issues }, { status: 400 })
  }
  if (!isDbConfigured()) {
    return Response.json({ error: 'database_not_configured' }, { status: 503 })
  }

  const event = parsed.data
  switch (event.type) {
    case 'call.started':
      await recordCallStarted(event.conversationId, event.channel ?? 'web', event.callerNumber ?? null)
      break
    case 'call.ended':
      await recordCallEnded(event.conversationId)
      break
    case 'transcript.final':
      await recordTranscriptFinal(event)
      break
    case 'booking.updated':
      await recordBookingUpdated(event)
      break
  }

  return Response.json({ ok: true })
}
