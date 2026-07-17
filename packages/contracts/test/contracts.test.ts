import { describe, expect, it } from 'vitest'
import { normalizedAudioFrameSchema, persistentTranscriptSegmentSchema } from '../src/index.js'

describe('audio and transcript contracts', () => {
  it('rejects non-16kHz audio frames', () => {
    expect(() => normalizedAudioFrameSchema.parse({
      sessionId: 'session-1',
      source: 'browser',
      trackId: 'caller-1',
      speaker: 'caller',
      sequence: 0,
      capturedAtMs: 0,
      sampleRate: 8000,
      channels: 1,
      encoding: 'pcm_s16le',
      pcm: new Int16Array([0, 1])
    })).toThrow()
  })

  it('rejects provisional transcript segments at the persistence boundary', () => {
    const result = persistentTranscriptSegmentSchema.safeParse({
      id: 'segment-1',
      conversationId: 'conversation-1',
      kind: 'partial',
      speaker: 'caller',
      text: 'mười hai thùng',
      startedAtMs: 0,
      endedAtMs: 200,
      confidence: 0.94,
      source: 'browser'
    })

    expect(result.success).toBe(false)
  })
})
