import { describe, expect, it, vi } from 'vitest'
import type { NormalizedAudioFrame } from '@ordervoice/contracts'
import { mapValseaTranscriptEvent } from '../src/valsea.js'

const { instances, FakeWebSocket } = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => void

  class FakeWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1

    readyState = FakeWebSocket.CONNECTING
    sent: unknown[] = []
    private listeners = new Map<string, Listener[]>()

    constructor(public url: string, public options: unknown) {
      instances.push(this)
    }

    on(event: string, callback: Listener): void {
      const list = this.listeners.get(event) ?? []
      list.push(callback)
      this.listeners.set(event, list)
    }

    send(data: unknown): void {
      this.sent.push(data)
    }

    close(): void {}

    emit(event: string, ...args: unknown[]): void {
      for (const callback of this.listeners.get(event) ?? []) callback(...args)
    }

    triggerOpen(): void {
      this.readyState = FakeWebSocket.OPEN
      this.emit('open')
    }

    triggerMessage(payload: unknown): void {
      this.emit('message', Buffer.from(JSON.stringify(payload)))
    }
  }

  const instances: FakeWebSocket[] = []
  return { instances, FakeWebSocket }
})

vi.mock('ws', () => ({ default: FakeWebSocket }))

function lastSocket() {
  const socket = instances.at(-1)
  if (!socket) throw new Error('no FakeWebSocket instance was created')
  return socket
}

function fakeFrame(): NormalizedAudioFrame {
  return {
    sessionId: 'conversation-1',
    source: 'browser',
    trackId: 'track-1',
    speaker: 'caller',
    sequence: 0,
    capturedAtMs: 0,
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_s16le',
    pcm: new Int16Array([1, 2, 3]),
  }
}

describe('VALSEA realtime event adapter', () => {
  it('maps only a final event into a persistable Vietnamese transcript segment', () => {
    const mapped = mapValseaTranscriptEvent({
      type: 'transcript.final',
      event_id: 'evt-1',
      transcript: { text: 'Chị lấy mười hai thùng Arabica.', start_ms: 100, end_ms: 2400, confidence: 0.97 },
    }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })

    expect(mapped).toMatchObject({
      kind: 'final',
      conversationId: 'conversation-1',
      text: 'Chị lấy mười hai thùng Arabica.',
      confidence: 0.97,
      providerEventId: 'evt-1',
    })
  })

  it('rejects non-transcript provider events', () => {
    expect(mapValseaTranscriptEvent({ type: 'session.started' }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })).toBeNull()
  })

  it('normalizes missing provider confidence to null', () => {
    const mapped = mapValseaTranscriptEvent({
      type: 'transcript.final',
      transcript: { text: 'Lấy hai thùng Arabica.', start_ms: 0, end_ms: 800 },
    }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })

    expect(mapped?.confidence).toBeNull()
  })

  it('maps the live flat payload shape (no nested transcript, no start_ms/end_ms/confidence/event_id)', () => {
    const mapped = mapValseaTranscriptEvent({
      type: 'transcript.final',
      text: 'Tôi muốn đặt 2 vé từ Sài Gòn đi Đà Lạt.',
      rawText: 'tôi muốn đặt 2 vé từ sài gòn đi đà lạt',
      isFinal: true,
      timestampMs: 1234,
    }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })

    expect(mapped).toMatchObject({
      kind: 'final',
      text: 'Tôi muốn đặt 2 vé từ Sài Gòn đi Đà Lạt.',
      confidence: null,
      startedAtMs: 0,
    })
    expect(mapped?.providerEventId).toBeUndefined()
  })
})

describe('VALSEA realtime session protocol', () => {
  it('sends language and model on session.start so VALSEA transcribes Vietnamese', async () => {
    const { createValseaSession } = await import('../src/valsea.js')
    createValseaSession({
      apiKey: 'key',
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
      onTranscript: () => {},
      onStatus: () => {},
    })

    const socket = lastSocket()
    socket.triggerOpen()

    const start = JSON.parse(socket.sent[0] as string)
    expect(start).toMatchObject({ type: 'session.start', language: 'vietnamese', model: 'valsea-rtt' })
  })

  it('buffers frames until session.ready and never sends a commit message from endUtterance', async () => {
    const { createValseaSession } = await import('../src/valsea.js')
    const statuses: string[] = []
    const session = createValseaSession({
      apiKey: 'key',
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
      onTranscript: () => {},
      onStatus: (state) => statuses.push(state),
    })

    const socket = lastSocket()
    socket.triggerOpen()
    session.sendFrame(fakeFrame())
    expect(socket.sent).toHaveLength(1) // only session.start so far — frame is buffered

    socket.triggerMessage({ type: 'session.ready', engine: 'valsea-4' })
    expect(statuses).toContain('live')
    expect(socket.sent).toHaveLength(2) // buffered frame flushed as raw PCM

    session.endUtterance()
    expect(socket.sent).toHaveLength(2) // no input_audio_buffer.commit or similar sent
  })

  it('surfaces a VALSEA error event through onStatus instead of failing silently', async () => {
    const { createValseaSession } = await import('../src/valsea.js')
    const statuses: Array<{ state: string; detail?: string }> = []
    createValseaSession({
      apiKey: 'key',
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
      onTranscript: () => {},
      onStatus: (state, detail) => statuses.push({ state, ...(detail ? { detail } : {}) }),
    })

    const socket = lastSocket()
    socket.triggerOpen()
    socket.triggerMessage({ type: 'error', code: 'NOT_READY', message: 'session not ready' })

    expect(statuses).toContainEqual({ state: 'error', detail: 'session not ready' })
  })
})
