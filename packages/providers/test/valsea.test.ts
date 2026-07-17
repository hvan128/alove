import { describe, expect, it } from 'vitest'
import { mapValseaTranscriptEvent } from '../src/valsea.js'

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
})
