import cors from '@fastify/cors'
import formbody from '@fastify/formbody'
import websocket from '@fastify/websocket'
import Fastify, { type FastifyInstance } from 'fastify'
import { mediaControlSchema, persistentTranscriptSegmentSchema } from '@ordervoice/contracts'
import { createTwilioStreamTwiml } from '@ordervoice/providers'
import { z } from 'zod'
import { createRepositoryFromEnvironment, type ConversationRepository } from './repository.js'

type ServerOptions = {
  repository?: ConversationRepository
  publicGatewayUrl?: string
}

const advanceDemoSchema = z.object({ step: z.number().int().positive() })
const approvalSchema = z.object({ actor: z.string().trim().min(1) })
const exportSchema = z.object({ idempotencyKey: z.string().trim().min(1) })

export async function createServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })
  const repository = options.repository ?? createRepositoryFromEnvironment()

  await app.register(cors, { origin: true })
  await app.register(formbody)
  await app.register(websocket)

  app.get('/v1/health', async () => ({ status: 'ok' }))

  app.get('/v1/demo', async () => repository.getDemo())

  app.post('/v1/demo/advance', async (request, reply) => {
    const parsed = advanceDemoSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'step must be a positive integer' })
    }
    return repository.advanceDemo(parsed.data.step)
  })

  app.post('/v1/conversations/:id/segments', async (request, reply) => {
    const parsed = persistentTranscriptSegmentSchema.safeParse(request.body)
    if (!parsed.success || parsed.data.conversationId !== (request.params as { id: string }).id) {
      return reply.code(400).send({ error: 'only a final segment for this conversation is accepted' })
    }
    return repository.appendFinalSegment(parsed.data)
  })

  app.post('/v1/orders/:id/approve', async (request, reply) => {
    const parsed = approvalSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'actor is required' })
    }

    try {
      return await repository.approveOrder((request.params as { id: string }).id, parsed.data.actor)
    } catch (error) {
      return reply.code(409).send({ error: messageFrom(error) })
    }
  })

  app.post('/v1/orders/:id/export', async (request, reply) => {
    const parsed = exportSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'idempotencyKey is required' })
    }

    try {
      return await repository.exportOrder((request.params as { id: string }).id, parsed.data.idempotencyKey)
    } catch (error) {
      return reply.code(409).send({ error: messageFrom(error) })
    }
  })

  app.post('/v1/webhooks/twilio/voice', async (request, reply) => {
    const body = request.body as { CallSid?: string } | undefined
    const conversationId = body?.CallSid ? `conversation-${body.CallSid}` : `conversation-${crypto.randomUUID()}`
    const gatewayBase = options.publicGatewayUrl ?? process.env.PUBLIC_GATEWAY_URL ?? 'wss://gateway.example.invalid'
    const streamUrl = `${gatewayBase.replace(/\/$/u, '')}/ws/telephony/${encodeURIComponent(conversationId)}`
    return reply.type('text/xml').send(createTwilioStreamTwiml(streamUrl, conversationId))
  })

  app.post('/v1/webhooks/twilio/status', async (_request, reply) => reply.code(204).send())

  app.get('/ws/media/:conversationId', { websocket: true }, (socket) => {
    socket.send(JSON.stringify({
      type: 'source.status',
      state: process.env.VALSEA_API_KEY ? 'connecting' : 'error',
      detail: process.env.VALSEA_API_KEY ? 'Đang chờ phiên VALSEA.' : 'VALSEA_API_KEY chưa được cấu hình; dùng demo cục bộ.',
    }))

    socket.on('message', (message, isBinary) => {
      if (isBinary) {
        return
      }

      try {
        const control = mediaControlSchema.parse(JSON.parse(message.toString()))
        if (control.type === 'stop') {
          socket.close()
        }
      } catch {
        socket.send(JSON.stringify({ type: 'source.status', state: 'error', detail: 'Gói điều khiển audio không hợp lệ.' }))
      }
    })
  })

  await app.ready()
  return app
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'operation could not be completed'
}
