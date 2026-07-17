import { readFileSync } from 'node:fs'
import { createValseaSession } from '@ordervoice/providers'

const apiKey = process.env.VALSEA_API_KEY
const pcmPath = process.env.VALSEA_PCM16_PATH

if (!apiKey || !pcmPath) {
  throw new Error('Set VALSEA_API_KEY and VALSEA_PCM16_PATH to a consented 16 kHz mono PCM16 fixture before running this smoke test.')
}

const bytes = readFileSync(pcmPath)
if (bytes.byteLength === 0 || bytes.byteLength % 2 !== 0) {
  throw new Error('VALSEA_PCM16_PATH must contain non-empty signed PCM16 little-endian bytes.')
}

const pcm = new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
const timeout = setTimeout(() => {
  session.stop()
  process.exitCode = 1
  console.error('No final VALSEA transcript arrived within 20 seconds.')
}, 20_000)

let sent = false
const session = createValseaSession({
  apiKey,
  conversationId: 'live-valsea-smoke',
  source: 'replay',
  speaker: 'caller',
  onStatus(state, detail) {
    if (state !== 'live' || sent) return
    sent = true
    for (let offset = 0; offset < pcm.length; offset += 320) {
      session.sendFrame({
        sessionId: 'live-valsea-smoke',
        source: 'replay',
        trackId: 'fixture-caller',
        speaker: 'caller',
        sequence: offset / 320,
        capturedAtMs: (offset / 16),
        sampleRate: 16000,
        channels: 1,
        encoding: 'pcm_s16le',
        pcm: pcm.slice(offset, offset + 320),
      })
    }
    session.endUtterance()
    if (detail) console.log(detail)
  },
  onTranscript(segment) {
    if (segment.kind !== 'final') return
    clearTimeout(timeout)
    console.log(JSON.stringify({ kind: segment.kind, text: segment.text, confidence: segment.confidence }))
    session.stop()
  },
})
