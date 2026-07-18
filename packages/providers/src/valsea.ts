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
  // ISO code ('vi', 'en'); mapped to VALSEA's full language name below. VALSEA
  // does not transcribe Vietnamese correctly if this is omitted from session.start.
  language?: string
  onTranscript: (segment: TranscriptSegment) => void
  onStatus: (state: 'connecting' | 'live' | 'error', detail?: string) => void
}

const VALSEA_MODEL = 'valsea-rtt'

// VALSEA names languages in full ("vietnamese"), not as ISO codes ("vi") — verified
// against the live API on 2026-07-18 (see agent/valsea_stt.py, the source of truth
// for this protocol).
const VALSEA_LANGUAGE_NAMES: Record<string, string> = { vi: 'vietnamese', en: 'english' }

function valseaLanguage(code: string): string {
  return VALSEA_LANGUAGE_NAMES[code] ?? code
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
  // VALSEA rejects audio with NOT_READY until it has answered session.ready, so
  // frames sent before that must be buffered rather than dropped or sent early.
  const pendingFrames: NormalizedAudioFrame[] = []
  let ready = false
  const socket = new WebSocket('wss://api.valsea.ai/v1/realtime', {
    headers: { Authorization: `Bearer ${options.apiKey}` },
  })

  options.onStatus('connecting')
  socket.on('open', () => {
    socket.send(JSON.stringify({
      type: 'session.start',
      audio: { encoding: 'pcm_s16le', sample_rate: 16000, channels: 1 },
      language: valseaLanguage(options.language ?? 'vi'),
      model: VALSEA_MODEL,
    }))
  })
  socket.on('message', (payload) => {
    let raw: unknown
    try {
      raw = JSON.parse(payload.toString())
    } catch {
      options.onStatus('error', 'Không thể đọc sự kiện VALSEA.')
      return
    }
    if (!isRecord(raw)) return

    if (raw.type === 'session.ready') {
      ready = true
      while (pendingFrames.length > 0) {
        const frame = pendingFrames.shift()
        if (frame) sendPcmFrame(socket, frame)
      }
      options.onStatus('live')
      return
    }
    if (raw.type === 'error') {
      options.onStatus('error', stringValue(raw.message) ?? stringValue(raw.code) ?? 'Lỗi không rõ từ VALSEA.')
      return
    }

    const mapped = mapValseaTranscriptEvent(raw, options)
    if (mapped) {
      options.onTranscript(mapped)
    }
  })
  socket.on('error', () => options.onStatus('error', 'Kết nối VALSEA thất bại.'))

  return {
    sendFrame(frame) {
      if (!ready || socket.readyState !== WebSocket.OPEN) {
        if (pendingFrames.length < 250) pendingFrames.push(frame)
        return
      }
      sendPcmFrame(socket, frame)
    },
    // VALSEA does its own endpointing and rejects every commit-style message
    // (input_audio_buffer.commit, commit, flush, finalize, end_utterance all
    // return UNKNOWN_MESSAGE) — finals arrive on VALSEA's own schedule, so this
    // is deliberately a no-op. Kept as a method so existing callers (the
    // end_of_utterance control message, the live smoke test) stay valid.
    endUtterance() {},
    stop() {
      pendingFrames.length = 0
      ready = false
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'session.stop' }))
      }
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
