import { describe, expect, it } from 'vitest'
import {
  bookingFieldEvidenceSchema,
  bookingFieldKeySchema,
  bookingDraftSchema,
  busDemoWorkspaceSchema,
  normalizedAudioFrameSchema,
  persistentTranscriptSegmentSchema,
  realtimeEventSchema,
  staffCommandSchema,
} from '../src/index.js'

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

describe('bus ticket demo contracts', () => {
  const trip = {
    id: 'SG-DL-2200',
    origin: 'Sài Gòn',
    destination: 'Đà Lạt',
    departureTime: '22:00',
    arrivalTime: '05:30',
    vehicleType: 'Giường nằm 34 chỗ',
    priceVnd: 320_000,
    pickupPoint: 'Bến xe Miền Đông mới',
    dropoffPoint: 'Bến xe liên tỉnh Đà Lạt',
    availableSeats: ['A05', 'A06', 'A07'],
  }

  const draft = {
    id: 'booking-call-demo-001',
    conversationId: 'call-demo-001',
    status: 'trip_proposed' as const,
    origin: 'Sài Gòn',
    destination: 'Đà Lạt',
    travelDateLabel: 'Tối thứ Sáu, 24/07',
    timeWindow: 'Buổi tối',
    passengerCount: 2,
    selectedTrip: trip,
    seats: [],
    passengerName: null,
    phone: null,
    totalFareVnd: 640_000,
    bookingCode: null,
    evidenceMessageIds: ['message-customer-001'],
  }

  it('parses a typed two-sided bus call workspace', () => {
    const workspace = busDemoWorkspaceSchema.parse({
      conversationId: 'call-demo-001',
      callStatus: 'connected',
      mode: 'auto',
      isDemo: true,
      startedAt: '2026-07-18T04:00:00.000Z',
      endedAt: null,
      messages: [{
        id: 'message-customer-001',
        conversationId: 'call-demo-001',
        role: 'customer',
        text: 'Tôi muốn đặt 2 vé đi Đà Lạt tối thứ Sáu.',
        createdAt: '2026-07-18T04:00:01.000Z',
        channel: 'voice',
        final: true,
      }],
      booking: draft,
    })

    expect(workspace.booking.status).toBe('trip_proposed')
    expect(workspace.booking.selectedTrip?.id).toBe('SG-DL-2200')
  })

  it('rejects a confirmed booking without a booking code', () => {
    expect(() => bookingDraftSchema.parse({
      ...draft,
      status: 'confirmed',
      passengerName: 'Nguyễn Minh Anh',
      phone: '0909123456',
      seats: ['A05', 'A06'],
      bookingCode: null,
    })).toThrow()
  })
})

describe('staff live-call contracts', () => {
  const envelope = {
    version: 1 as const,
    eventId: 'event-001',
    sessionCode: 'DEMO42',
    occurredAt: '2026-07-18T04:00:01.000Z',
  }

  it('defines every field the employee needs to complete a booking', () => {
    expect(bookingFieldKeySchema.options).toEqual([
      'origin',
      'destination',
      'travelDateLabel',
      'timeWindow',
      'passengerCount',
      'passengerName',
      'phone',
      'pickupPoint',
      'dropoffPoint',
      'selectedTrip',
      'seats',
      'vehiclePreference',
      'paymentMethod',
      'note',
    ])

    const parsed = bookingDraftSchema.parse({
      id: 'booking-demo42',
      conversationId: 'DEMO42',
      status: 'collecting',
      origin: 'Sài Gòn',
      destination: 'Đà Lạt',
      travelDateLabel: '24/07/2026',
      timeWindow: '22:00',
      passengerCount: 2,
      selectedTrip: null,
      seats: [],
      passengerName: null,
      phone: null,
      pickupPoint: 'Bến xe Miền Đông mới',
      dropoffPoint: null,
      vehiclePreference: 'Giường nằm',
      paymentMethod: null,
      note: null,
      totalFareVnd: null,
      bookingCode: null,
      evidenceMessageIds: ['message-001'],
      fieldEvidence: {
        origin: [{
          id: 'evidence-001',
          field: 'origin',
          messageId: 'message-001',
          quote: 'đi từ Sài Gòn',
          confidence: 0.98,
          source: 'caller_speech',
          capturedAt: '2026-07-18T04:00:01.000Z',
        }],
      },
      confirmedFields: [],
      reviewItems: [],
    })

    expect(parsed.pickupPoint).toBe('Bến xe Miền Đông mới')
    expect(parsed.fieldEvidence.origin?.[0]?.quote).toBe('đi từ Sài Gòn')
  })

  it('rejects invalid evidence confidence and mismatched field keys', () => {
    expect(() => bookingFieldEvidenceSchema.parse({
      id: 'evidence-001',
      field: 'phone',
      messageId: 'message-001',
      quote: '0909123456',
      confidence: 1.2,
      source: 'caller_speech',
      capturedAt: '2026-07-18T04:00:01.000Z',
    })).toThrow()

    expect(() => bookingDraftSchema.parse({
      id: 'booking-demo42',
      conversationId: 'DEMO42',
      status: 'collecting',
      origin: null,
      destination: null,
      travelDateLabel: null,
      timeWindow: null,
      passengerCount: null,
      selectedTrip: null,
      seats: [],
      passengerName: null,
      phone: null,
      totalFareVnd: null,
      bookingCode: null,
      evidenceMessageIds: [],
      fieldEvidence: { unsupported: [] },
    })).toThrow()
  })

  it('parses partial and final transcript events without confusing their guarantees', () => {
    const partial = realtimeEventSchema.parse({
      ...envelope,
      type: 'transcript.partial',
      message: {
        id: 'message-live',
        role: 'caller',
        text: 'tôi muốn đi từ',
        language: 'vi',
        confidence: null,
        startedAtMs: 0,
        endedAtMs: 420,
      },
    })
    const final = realtimeEventSchema.parse({
      ...envelope,
      eventId: 'event-002',
      type: 'transcript.final',
      message: {
        id: 'message-001',
        role: 'caller',
        text: 'Tôi muốn đi từ Sài Gòn đến Đà Lạt.',
        language: 'vi',
        translations: { en: 'I want to travel from Saigon to Da Lat.' },
        confidence: 0.97,
        startedAtMs: 0,
        endedAtMs: 1_200,
        channel: 'voice',
      },
    })

    expect(partial.type).toBe('transcript.partial')
    expect(final.type).toBe('transcript.final')
    if (final.type !== 'transcript.final') throw new Error('Expected a final transcript event.')
    expect(final.message.translations.en).toContain('Da Lat')
  })

  it('parses status, snapshot, suggestion, and agent error events', () => {
    expect(realtimeEventSchema.parse({
      ...envelope,
      type: 'session.status',
      transport: 'livekit',
      state: 'connected',
      callerPresent: true,
      valsea: 'live',
      agent: 'ready',
      detail: null,
    }).type).toBe('session.status')

    expect(realtimeEventSchema.parse({
      ...envelope,
      type: 'reply.suggested',
      suggestion: {
        id: 'suggestion-001',
        text: 'Anh cho em xin ngày đi và số lượng vé ạ?',
        reason: 'missing_fields',
        missingFields: ['travelDateLabel', 'passengerCount'],
        speakable: true,
      },
    }).type).toBe('reply.suggested')

    expect(realtimeEventSchema.parse({
      ...envelope,
      type: 'agent.error',
      code: 'VALSEA_DISCONNECTED',
      message: 'Không thể giữ kết nối nhận dạng giọng nói.',
      recoverable: true,
    }).type).toBe('agent.error')
  })

  it('accepts staff preferences and approved speech but rejects invalid modes', () => {
    const preferences = staffCommandSchema.parse({
      ...envelope,
      type: 'staff.preferences',
      mode: 'human',
      transcriptLanguage: 'original',
    })
    if (preferences.type !== 'staff.preferences') throw new Error('Expected staff preferences.')
    expect(preferences.mode).toBe('human')

    expect(staffCommandSchema.parse({
      ...envelope,
      eventId: 'event-003',
      type: 'staff.speak',
      text: 'Anh cho em xin số điện thoại người đi ạ.',
    }).type).toBe('staff.speak')

    expect(() => staffCommandSchema.parse({
      ...envelope,
      type: 'staff.preferences',
      mode: 'robot',
      transcriptLanguage: 'vi',
    })).toThrow()
  })
})
