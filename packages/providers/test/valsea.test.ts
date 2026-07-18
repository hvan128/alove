import { describe, expect, it } from 'vitest'
import {
  createValseaAudioAppendMessage,
  createValseaCommitMessage,
  createValseaConnectionConfig,
  createValseaSessionStartMessage,
  createValseaStopMessage,
  mapValseaServerEvent,
  mapValseaTranscriptEvent,
} from '../src/valsea.js'

describe('VALSEA realtime event adapter', () => {
  it('builds the official authenticated realtime connection and Vietnamese session start', () => {
    expect(createValseaConnectionConfig('valsea-test-key')).toEqual({
      url: 'wss://api.valsea.ai/v1/realtime',
      headers: { Authorization: 'Bearer valsea-test-key' },
    })
    expect(createValseaSessionStartMessage()).toEqual({
      type: 'session.start',
      model: 'valsea-rtt',
      language: 'vietnamese',
      hint_text: expect.stringContaining('điểm đón'),
      enable_correction: true,
      diarize: false,
    })
  })

  it('serializes append, commit, and stop with current message names', () => {
    expect(createValseaAudioAppendMessage(new Int16Array([1, -2]))).toEqual({
      type: 'audio.append',
      audio: 'AQD+/w==',
    })
    expect(createValseaCommitMessage()).toEqual({ type: 'audio.commit' })
    expect(createValseaStopMessage()).toEqual({ type: 'session.stop' })
  })

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

  it('maps the current top-level transcript shape and timestamp', () => {
    const mapped = mapValseaTranscriptEvent({
      type: 'transcript.partial',
      text: 'Tôi muốn đặt hai vé',
      isFinal: false,
      timestampMs: 780,
    }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })

    expect(mapped).toMatchObject({
      kind: 'partial',
      text: 'Tôi muốn đặt hai vé',
      startedAtMs: 0,
      endedAtMs: 780,
    })
  })

  it('maps ready and provider errors without fabricating transcript text', () => {
    expect(mapValseaServerEvent({ type: 'session.ready', sessionId: 'rtt-001' }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })).toEqual({ kind: 'ready', sessionId: 'rtt-001' })

    expect(mapValseaServerEvent({
      type: 'error',
      code: 'INVALID_MESSAGE',
      message: 'Failed to parse message',
    }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })).toEqual({
      kind: 'error',
      code: 'INVALID_MESSAGE',
      message: 'Failed to parse message',
    })

    expect(mapValseaTranscriptEvent({
      type: 'transcript.final',
      timestampMs: 900,
    }, {
      conversationId: 'conversation-1',
      source: 'browser',
      speaker: 'caller',
    })).toBeNull()
  })
})
