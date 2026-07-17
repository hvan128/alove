import { describe, expect, it } from 'vitest'
import { createBrowserAudioFrame } from '../src/media.js'

describe('browser media gateway frame', () => {
  it('turns little-endian binary PCM into the normalized 16kHz caller contract', () => {
    const frame = createBrowserAudioFrame(Buffer.from([0x00, 0x00, 0xff, 0x7f]), {
      conversationId: 'conversation-1',
      source: 'browser',
      trackId: 'browser-mic',
      sequence: 2,
      capturedAtMs: 40,
    })

    expect(frame).toMatchObject({
      sessionId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_s16le',
      sequence: 2,
    })
    expect([...frame.pcm]).toEqual([0, 32767])
  })
})
