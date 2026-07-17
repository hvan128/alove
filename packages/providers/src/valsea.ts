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
  onTranscript: (segment: TranscriptSegment) => void
  onStatus: (state: 'connecting' | 'live' | 'error', detail?: string) => void
}

export type ValseaSession = {
  sendFrame: (frame: NormalizedAudioFrame) => void
  endUtterance: () => void
  stop: () => void
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
  const endedAtMs = numberValue(transcript.end_ms) ?? numberValue(raw.end_ms) ?? startedAtMs
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

export function createValseaSession(options: ValseaSessionOptions): ValseaSession {
  const socket = new WebSocket('wss://api.valsea.ai/v1/realtime', {
    headers: { Authorization: `Bearer ${options.apiKey}` },
  })

  options.onStatus('connecting')
  socket.on('open', () => {
    socket.send(JSON.stringify({
      type: 'session.start',
      audio: { encoding: 'pcm_s16le', sample_rate: 16000, channels: 1 },
    }))
    options.onStatus('live')
  })
  socket.on('message', (payload) => {
    try {
      const mapped = mapValseaTranscriptEvent(JSON.parse(payload.toString()), options)
      if (mapped) {
        options.onTranscript(mapped)
      }
    } catch {
      options.onStatus('error', 'Không thể đọc sự kiện VALSEA.')
    }
  })
  socket.on('error', () => options.onStatus('error', 'Kết nối VALSEA thất bại.'))

  return {
    sendFrame(frame) {
      if (socket.readyState !== WebSocket.OPEN) {
        return
      }
      socket.send(Buffer.from(frame.pcm.buffer, frame.pcm.byteOffset, frame.pcm.byteLength))
    },
    endUtterance() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))
      }
    },
    stop() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'session.stop' }))
      }
      socket.close()
    },
  }
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
