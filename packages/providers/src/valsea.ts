import type { NormalizedAudioFrame, Source, Speaker, TranscriptSegment } from '@ordervoice/contracts'
import WebSocket from 'ws'

type UnknownRecord = Record<string, unknown>

export type ValseaEventContext = {
  conversationId: string
  source: Source
  speaker: Speaker
}

export type ValseaSessionOptions = ValseaEventContext & {
  apiKey: string
  hintText?: string
  targetLanguage?: 'english' | 'vietnamese'
  onTranscript: (segment: TranscriptSegment) => void
  onStatus: (state: 'connecting' | 'live' | 'error', detail?: string) => void
}

export type ValseaSession = {
  sendFrame: (frame: NormalizedAudioFrame) => void
  endUtterance: () => void
  stop: () => void
}

export type ValseaSessionStartMessage = {
  type: 'session.start'
  model: 'valsea-rtt'
  language: 'vietnamese'
  hint_text: string
  enable_correction: true
  diarize: false
  target_language?: 'english' | 'vietnamese'
}

export type ValseaMappedServerEvent =
  | { kind: 'created'; sessionId: string | null }
  | { kind: 'ready'; sessionId: string | null }
  | { kind: 'transcript'; segment: TranscriptSegment }
  | { kind: 'error'; code: string; message: string }

const DEFAULT_HINT_TEXT = [
  'đặt vé xe khách',
  'điểm đi',
  'điểm đến',
  'ngày đi',
  'giờ khởi hành',
  'điểm đón',
  'điểm trả',
  'ghế ngồi',
  'giường nằm',
  'limousine',
  'Sài Gòn',
  'Đà Lạt',
  'Nha Trang',
  'Bến xe Miền Đông mới',
].join(', ')

export function createValseaConnectionConfig(apiKey: string): {
  url: 'wss://api.valsea.ai/v1/realtime'
  headers: { Authorization: string }
} {
  if (!apiKey.trim()) throw new Error('VALSEA API key is required')
  return {
    url: 'wss://api.valsea.ai/v1/realtime',
    headers: { Authorization: `Bearer ${apiKey}` },
  }
}

export function createValseaSessionStartMessage(options: {
  hintText?: string
  targetLanguage?: 'english' | 'vietnamese'
} = {}): ValseaSessionStartMessage {
  return {
    type: 'session.start',
    model: 'valsea-rtt',
    language: 'vietnamese',
    hint_text: options.hintText?.trim() || DEFAULT_HINT_TEXT,
    enable_correction: true,
    diarize: false,
    ...(options.targetLanguage ? { target_language: options.targetLanguage } : {}),
  }
}

export function createValseaAudioAppendMessage(pcm: Int16Array): {
  type: 'audio.append'
  audio: string
} {
  const bytes = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  return { type: 'audio.append', audio: bytes.toString('base64') }
}

export function createValseaCommitMessage(): { type: 'audio.commit' } {
  return { type: 'audio.commit' }
}

export function createValseaStopMessage(): { type: 'session.stop' } {
  return { type: 'session.stop' }
}

export function mapValseaTranscriptEvent(raw: unknown, context: ValseaEventContext): TranscriptSegment | null {
  if (!isRecord(raw) || (raw.type !== 'transcript.partial' && raw.type !== 'transcript.final')) {
    return null
  }

  const transcript = isRecord(raw.transcript) ? raw.transcript : raw
  const text = stringValue(transcript.text) ?? stringValue(raw.text)
  if (!text) {
    return null
  }

  const kind = raw.type === 'transcript.final' ? 'final' : 'partial'
  const startedAtMs = numberValue(transcript.start_ms) ?? numberValue(raw.start_ms) ?? 0
  const endedAtMs = numberValue(transcript.end_ms)
    ?? numberValue(raw.end_ms)
    ?? numberValue(raw.timestampMs)
    ?? startedAtMs
  const providerEventId = stringValue(raw.event_id) ?? stringValue(raw.id)

  return {
    id: providerEventId ?? `${context.conversationId}-${kind}-${startedAtMs}-${endedAtMs}`,
    conversationId: context.conversationId,
    kind,
    speaker: context.speaker,
    text,
    startedAtMs,
    endedAtMs,
    confidence: numberValue(transcript.confidence) ?? numberValue(raw.confidence) ?? null,
    source: context.source,
    ...(providerEventId ? { providerEventId } : {}),
  }
}

export function mapValseaServerEvent(raw: unknown, context: ValseaEventContext): ValseaMappedServerEvent | null {
  if (!isRecord(raw) || typeof raw.type !== 'string') return null
  if (raw.type === 'session.created' || raw.type === 'session.ready') {
    return {
      kind: raw.type === 'session.ready' ? 'ready' : 'created',
      sessionId: stringValue(raw.sessionId) ?? null,
    }
  }
  if (raw.type === 'error') {
    return {
      kind: 'error',
      code: stringValue(raw.code) ?? 'VALSEA_ERROR',
      message: stringValue(raw.message) ?? 'VALSEA trả về lỗi không xác định.',
    }
  }
  const segment = mapValseaTranscriptEvent(raw, context)
  return segment ? { kind: 'transcript', segment } : null
}

export function createValseaSession(options: ValseaSessionOptions): ValseaSession {
  const pendingFrames: NormalizedAudioFrame[] = []
  let pendingCommit = false
  let ready = false
  const connection = createValseaConnectionConfig(options.apiKey)
  const socket = new WebSocket(connection.url, { headers: connection.headers })

  options.onStatus('connecting')
  socket.on('open', () => {
    socket.send(JSON.stringify(createValseaSessionStartMessage({
      ...(options.hintText ? { hintText: options.hintText } : {}),
      ...(options.targetLanguage ? { targetLanguage: options.targetLanguage } : {}),
    })))
  })
  socket.on('message', (payload) => {
    try {
      const mapped = mapValseaServerEvent(JSON.parse(payload.toString()), options)
      if (mapped?.kind === 'ready') {
        ready = true
        while (pendingFrames.length > 0) {
          const frame = pendingFrames.shift()
          if (frame) sendPcmFrame(socket, frame)
        }
        if (pendingCommit) {
          socket.send(JSON.stringify(createValseaCommitMessage()))
          pendingCommit = false
        }
        options.onStatus('live')
      } else if (mapped?.kind === 'transcript') {
        options.onTranscript(mapped.segment)
      } else if (mapped?.kind === 'error') {
        options.onStatus('error', `${mapped.code}: ${mapped.message}`)
      }
    } catch {
      options.onStatus('error', 'Không thể đọc sự kiện VALSEA.')
    }
  })
  socket.on('error', () => options.onStatus('error', 'Kết nối VALSEA thất bại.'))

  return {
    sendFrame(frame) {
      if (socket.readyState !== WebSocket.OPEN || !ready) {
        if (pendingFrames.length < 250) pendingFrames.push(frame)
        return
      }
      sendPcmFrame(socket, frame)
    },
    endUtterance() {
      if (socket.readyState === WebSocket.OPEN && ready) {
        socket.send(JSON.stringify(createValseaCommitMessage()))
      } else {
        pendingCommit = true
      }
    },
    stop() {
      pendingFrames.length = 0
      pendingCommit = false
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(createValseaStopMessage()))
      }
      ready = false
      socket.close()
    },
  }
}

function sendPcmFrame(socket: WebSocket, frame: NormalizedAudioFrame): void {
  socket.send(Buffer.from(frame.pcm.buffer, frame.pcm.byteOffset, frame.pcm.byteLength))
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}
