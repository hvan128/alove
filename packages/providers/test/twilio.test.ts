import { describe, expect, it } from 'vitest'
import { parseTwilioMedia } from '../src/twilio.js'

describe('Twilio Media Streams adapter', () => {
  it('normalizes an inbound mu-law packet into caller PCM16 at 16kHz', () => {
    const frame = parseTwilioMedia({
      event: 'media',
      streamSid: 'MZ123',
      media: {
        track: 'inbound',
        chunk: '4',
        timestamp: '160',
        payload: Buffer.from([0xff, 0x7f]).toString('base64'),
      },
    }, 'conversation-1')

    expect(frame).toMatchObject({
      sessionId: 'conversation-1',
      source: 'telephony',
      trackId: 'MZ123:inbound',
      speaker: 'caller',
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm_s16le',
      sequence: 4,
      capturedAtMs: 160,
    })
    expect(frame.pcm).toHaveLength(4)
  })
})
