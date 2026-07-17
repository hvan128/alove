import type { NormalizedAudioFrame, Source } from '@ordervoice/contracts'

type BrowserFrameOptions = {
  conversationId: string
  source: Extract<Source, 'browser' | 'replay'>
  trackId: string
  sequence: number
  capturedAtMs: number
}

export function createBrowserAudioFrame(payload: Buffer, options: BrowserFrameOptions): NormalizedAudioFrame {
  if (payload.byteLength === 0 || payload.byteLength % 2 !== 0) {
    throw new Error('browser PCM payload must contain 16-bit samples')
  }
  const view = new Int16Array(payload.buffer, payload.byteOffset, payload.byteLength / 2)

  return {
    sessionId: options.conversationId,
    source: options.source,
    trackId: options.trackId,
    speaker: 'caller',
    sequence: options.sequence,
    capturedAtMs: options.capturedAtMs,
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_s16le',
    pcm: Int16Array.from(view),
  }
}
