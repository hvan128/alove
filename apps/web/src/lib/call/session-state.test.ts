import type { RoomEvent } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import {
  applyStaffEditToSession,
  createInitialCallSessionState,
  reduceCallSession,
} from './session-state'

const base = {
  version: 1 as const,
  sessionCode: 'DEMO42',
  occurredAt: '2026-07-18T04:00:00.000Z',
}

function finalEvent(
  text: string,
  eventId = 'event-final-001',
): Extract<RoomEvent, { type: 'transcript.final' }> {
  return {
    ...base,
    eventId,
    type: 'transcript.final',
    message: {
      id: `message-${eventId}`,
      role: 'caller',
      text,
      language: 'vi',
      translations: {},
      confidence: 0.97,
      startedAtMs: 0,
      endedAtMs: 1_000,
      channel: 'voice',
    },
  }
}

describe('call session reducer', () => {
  it('keeps partial text mutable and never fills the booking from it', () => {
    const initial = createInitialCallSessionState('DEMO42', 'local')
    const partial: RoomEvent = {
      ...base,
      eventId: 'event-partial-001',
      type: 'transcript.partial',
      message: {
        id: 'message-live',
        role: 'caller',
        text: 'Tôi đi từ Sài Gòn',
        language: 'vi',
        translations: {},
        confidence: null,
        startedAtMs: 0,
        endedAtMs: 300,
        channel: 'voice',
      },
    }

    const state = reduceCallSession(initial, partial)

    expect(state.partial?.text).toBe('Tôi đi từ Sài Gòn')
    expect(state.messages).toEqual([])
    expect(state.booking.origin).toBeNull()
    expect(state.revision).toBe(0)
  })

  it('commits caller final text once, fills supported fields, and refreshes the reply suggestion', () => {
    const initial = createInitialCallSessionState('DEMO42', 'local')
    const event = finalEvent('Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.')
    const once = reduceCallSession(initial, event)
    const duplicate = reduceCallSession(once, event)

    expect(once.partial).toBeNull()
    expect(once.messages).toHaveLength(1)
    expect(once.booking).toMatchObject({
      origin: 'Sài Gòn',
      destination: 'Đà Lạt',
      passengerCount: 2,
      timeWindow: '22:00',
    })
    expect(once.booking.fieldEvidence.destination?.[0]?.messageId).toBe('message-event-final-001')
    expect(once.suggestion.text).toMatch(/họ tên.*số điện thoại/iu)
    expect(once.revision).toBe(1)
    expect(duplicate).toBe(once)
  })

  it('does not extract booking facts from staff speech', () => {
    const initial = createInitialCallSessionState('DEMO42', 'local')
    const state = reduceCallSession(initial, {
      ...finalEvent('Sài Gòn đi Đà Lạt ngày 24/07, 2 vé.'),
      eventId: 'event-staff-001',
      message: {
        ...finalEvent('x').message,
        id: 'message-staff-001',
        role: 'staff',
        text: 'Sài Gòn đi Đà Lạt ngày 24/07, 2 vé.',
      },
    })

    expect(state.messages).toHaveLength(1)
    expect(state.booking.origin).toBeNull()
  })

  it('applies staff preferences and protects a manual edit', () => {
    const extracted = reduceCallSession(
      createInitialCallSessionState('DEMO42', 'local'),
      finalEvent('Tôi đi từ Sài Gòn đến Đà Lạt.'),
    )
    const preferred = reduceCallSession(extracted, {
      ...base,
      eventId: 'preferences-001',
      type: 'staff.preferences',
      mode: 'auto',
      transcriptLanguage: 'en',
    })
    const edited = applyStaffEditToSession(preferred, 'origin', 'Biên Hòa', {
      messageId: 'staff-edit-001',
      occurredAt: '2026-07-18T04:01:00.000Z',
    })
    const afterCallerRepeats = reduceCallSession(
      edited,
      finalEvent('Tôi đi từ Sài Gòn đến Đà Lạt.', 'event-final-002'),
    )

    expect(preferred.mode).toBe('auto')
    expect(preferred.transcriptLanguage).toBe('en')
    expect(afterCallerRepeats.booking.origin).toBe('Biên Hòa')
    expect(afterCallerRepeats.booking.confirmedFields).toContain('origin')
  })

  it('accepts only newer booking snapshots and records recoverable agent errors', () => {
    const initial = createInitialCallSessionState('DEMO42', 'livekit')
    const filled = reduceCallSession(initial, finalEvent('Tôi đi từ Sài Gòn đến Đà Lạt.'))
    const stale = reduceCallSession(filled, {
      ...base,
      eventId: 'snapshot-stale',
      type: 'booking.snapshot',
      revision: 0,
      booking: createInitialCallSessionState('DEMO42', 'local').booking,
    })
    const failed = reduceCallSession(stale, {
      ...base,
      eventId: 'agent-error-001',
      type: 'agent.error',
      code: 'VALSEA_DISCONNECTED',
      message: 'Mất kết nối VALSEA.',
      recoverable: true,
    })

    expect(stale.booking.destination).toBe('Đà Lạt')
    expect(failed.errors.at(-1)).toEqual({
      code: 'VALSEA_DISCONNECTED',
      message: 'Mất kết nối VALSEA.',
      recoverable: true,
    })
  })
})
