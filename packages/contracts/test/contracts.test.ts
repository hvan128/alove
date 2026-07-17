import { describe, expect, it } from 'vitest'
import {
  bookingDraftSchema,
  busDemoWorkspaceSchema,
  normalizedAudioFrameSchema,
  persistentTranscriptSegmentSchema,
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
