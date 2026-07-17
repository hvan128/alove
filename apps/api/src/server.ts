import cors from '@fastify/cors'
import formbody from '@fastify/formbody'
import websocket from '@fastify/websocket'
import Fastify, { type FastifyInstance } from 'fastify'
import { mediaControlSchema, persistentTranscriptSegmentSchema, type Source, type Speaker, type TranscriptSegment } from '@ordervoice/contracts'
import { createTwilioStreamTwiml, createValseaSession, isValidTwilioWebhook, parseTwilioMedia, type TwilioMediaEvent, type ValseaSession } from '@ordervoice/providers'
import { z } from 'zod'
import { createBrowserAudioFrame } from './media.js'
import { createRepositoryFromEnvironment, type ConversationRepository } from './repository.js'

type ServerOptions = {
  repository?: ConversationRepository
  publicGatewayUrl?: string
}

const advanceDemoSchema = z.object({ step: z.number().int().positive() })
const approvalSchema = z.object({ actor: z.string().trim().min(1) })
const exportSchema = z.object({ idempotencyKey: z.string().trim().min(1) })
const lineCorrectionSchema = z.object({
  sku: z.string().trim().min(1),
  productLabel: z.string().trim().min(1),
  quantity: z.number().positive(),
  unit: z.string().trim().min(1),
})

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

  app.post('/v1/orders/:id/lines/:lineId/correct', async (request, reply) => {
    const parsed = lineCorrectionSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'valid SKU, product label, quantity and unit are required' })
    }
    const params = request.params as { id: string; lineId: string }
    try {
      return await repository.correctOrderLine(params.id, { ...parsed.data, lineId: params.lineId })
    } catch (error) {
      return reply.code(409).send({ error: messageFrom(error) })
    }
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
    const verification = verifyTwilioWebhook('/v1/webhooks/twilio/voice', request.headers, request.body)
    if (!verification.ok) return reply.code(verification.statusCode).send({ error: verification.error })
    const body = request.body as { CallSid?: string } | undefined
    const conversationId = body?.CallSid ? `conversation-${body.CallSid}` : `conversation-${crypto.randomUUID()}`
    const gatewayBase = options.publicGatewayUrl ?? process.env.PUBLIC_GATEWAY_URL ?? 'wss://gateway.example.invalid'
    const streamUrl = `${gatewayBase.replace(/\/$/u, '')}/ws/telephony/${encodeURIComponent(conversationId)}`
    return reply.type('text/xml').send(createTwilioStreamTwiml(streamUrl, conversationId))
  })

  app.post('/v1/webhooks/twilio/status', async (request, reply) => {
    const verification = verifyTwilioWebhook('/v1/webhooks/twilio/status', request.headers, request.body)
    if (!verification.ok) return reply.code(verification.statusCode).send({ error: verification.error })
    return reply.code(204).send()
  })

  app.get('/ws/media/:conversationId', { websocket: true }, (socket, request) => {
    const conversationId = (request.params as { conversationId: string }).conversationId
    let source: Extract<Source, 'browser' | 'replay'> = 'browser'
    let trackId = 'browser-mic'
    let sequence = 0
    let session: ValseaSession | undefined

    sendStatus(socket, process.env.VALSEA_API_KEY ? 'connecting' : 'error', process.env.VALSEA_API_KEY ? 'Chờ lệnh bắt đầu audio.' : 'VALSEA_API_KEY chưa được cấu hình; demo cục bộ vẫn khả dụng.')

    socket.on('message', (message, isBinary) => {
      if (isBinary) {
        if (!session) {
          sendStatus(socket, 'error', 'Chưa có phiên VALSEA cho audio PCM.')
          return
        }
        try {
          session.sendFrame(createBrowserAudioFrame(toBuffer(message), {
            conversationId,
            source,
            trackId,
            sequence,
            capturedAtMs: sequence * 20,
          }))
          sequence += 1
        } catch (error) {
          sendStatus(socket, 'error', messageFrom(error))
        }
        return
      }

      try {
        const control = mediaControlSchema.parse(JSON.parse(toBuffer(message).toString()))
        if (control.type === 'start') {
          if (control.source === 'telephony') {
            sendStatus(socket, 'error', 'Telephony phải dùng endpoint Twilio riêng.')
            return
          }
          source = control.source
          trackId = control.trackId
          session?.stop()
          session = beginValseaSession(socket, repository, { conversationId, source, speaker: 'caller' })
        }
        if (control.type === 'end_of_utterance') session?.endUtterance()
        if (control.type === 'stop') {
          session?.stop()
          socket.close()
        }
      } catch {
        sendStatus(socket, 'error', 'Gói điều khiển audio không hợp lệ.')
      }
    })
    socket.on('close', () => session?.stop())
  })

  app.get('/ws/telephony/:conversationId', { websocket: true }, (socket, request) => {
    const conversationId = (request.params as { conversationId: string }).conversationId
    const sessions = new Map<'inbound' | 'outbound', ValseaSession>()
    sendStatus(socket, process.env.VALSEA_API_KEY ? 'connecting' : 'error', process.env.VALSEA_API_KEY ? 'Chờ Twilio Media Stream.' : 'VALSEA_API_KEY chưa được cấu hình.')

    socket.on('message', (message) => {
      try {
        const payload = JSON.parse(toBuffer(message).toString()) as unknown
        if (!isTwilioMediaEvent(payload)) {
          if (isRecord(payload) && payload.event === 'stop') {
            sessions.forEach((session) => session.stop())
            socket.close()
          }
          return
        }
        const track = payload.media.track
        let session = sessions.get(track)
        if (!session) {
          session = beginValseaSession(socket, repository, {
            conversationId,
            source: 'telephony',
            speaker: track === 'outbound' ? 'agent' : 'caller',
          })
          if (!session) return
          sessions.set(track, session)
        }
        session.sendFrame(parseTwilioMedia(payload, conversationId))
      } catch (error) {
        sendStatus(socket, 'error', `Twilio media không hợp lệ: ${messageFrom(error)}`)
      }
    })
    socket.on('close', () => sessions.forEach((session) => session.stop()))
  })

  await app.ready()
  return app
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : 'operation could not be completed'
}

function beginValseaSession(
  socket: JsonSocket,
  repository: ConversationRepository,
  context: { conversationId: string; source: Source; speaker: Speaker },
): ValseaSession | undefined {
  const apiKey = process.env.VALSEA_API_KEY
  if (!apiKey) {
    sendStatus(socket, 'error', 'VALSEA_API_KEY chưa được cấu hình; không thể bắt đầu ASR thật.')
    return undefined
  }

  return createValseaSession({
    ...context,
    apiKey,
    onStatus: (state, detail) => sendStatus(socket, state, detail),
    onTranscript: (segment) => {
      sendTranscript(socket, segment)
      if (segment.kind === 'final') {
        void repository.appendFinalSegment(persistentTranscriptSegmentSchema.parse(segment)).catch((error: unknown) => {
          sendStatus(socket, 'error', `Không thể lưu final transcript: ${messageFrom(error)}`)
        })
      }
    },
  })
}

type JsonSocket = { send: (data: string) => void }

function sendStatus(socket: JsonSocket, state: 'connecting' | 'live' | 'error', detail?: string): void {
  socket.send(JSON.stringify({ type: 'source.status', state, ...(detail ? { detail } : {}) }))
}

function sendTranscript(socket: JsonSocket, segment: TranscriptSegment): void {
  const { id: _id, conversationId: _conversationId, ...payload } = segment
  socket.send(JSON.stringify({ type: `transcript.${segment.kind}`, segment: payload }))
}

function toBuffer(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value
  if (value instanceof ArrayBuffer) return Buffer.from(value)
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength)
  if (Array.isArray(value) && value.every(Buffer.isBuffer)) return Buffer.concat(value)
  throw new Error('WebSocket payload type is not supported')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTwilioMediaEvent(value: unknown): value is TwilioMediaEvent {
  if (!isRecord(value) || value.event !== 'media' || !isRecord(value.media)) return false
  const media = value.media
  return typeof value.streamSid === 'string'
    && (media.track === 'inbound' || media.track === 'outbound')
    && typeof media.chunk === 'string'
    && typeof media.timestamp === 'string'
    && typeof media.payload === 'string'
}

function verifyTwilioWebhook(
  path: '/v1/webhooks/twilio/voice' | '/v1/webhooks/twilio/status',
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
): { ok: true } | { ok: false; statusCode: 403 | 503; error: string } {
  if (process.env.NODE_ENV !== 'production') return { ok: true }
  const baseUrl = process.env.TWILIO_WEBHOOK_BASE_URL
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!baseUrl || !authToken) {
    return { ok: false, statusCode: 503, error: 'Twilio webhook verification is not configured.' }
  }
  const signature = headers['x-twilio-signature']
  const normalizedSignature = Array.isArray(signature) ? signature[0] : signature
  const params = toStringParams(body)
  const valid = isValidTwilioWebhook({
    authToken,
    signature: normalizedSignature,
    url: `${baseUrl.replace(/\/$/u, '')}${path}`,
    params,
  })
  return valid ? { ok: true } : { ok: false, statusCode: 403, error: 'Invalid Twilio signature.' }
}

function toStringParams(body: unknown): Record<string, string> {
  if (!isRecord(body)) return {}
  return Object.fromEntries(Object.entries(body).flatMap(([key, value]) => typeof value === 'string' ? [[key, value]] : []))
}
