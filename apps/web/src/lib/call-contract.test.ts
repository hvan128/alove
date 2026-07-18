import { describe, expect, it } from 'vitest'

import {
  agentEventSchema,
  BOOKING_SNAPSHOT_SCHEMA_VERSION,
  bookingSnapshotSchema,
  createBookingSnapshotExport,
  createEmptyBooking,
  serializeBookingSnapshot,
  SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS,
  SEMANTIC_ANNOTATION_ITEMS_MAX,
  SEMANTIC_ANNOTATION_TEXT_MAX_CHARS,
} from './call-contract'

describe('Alove call contracts', () => {
  it('accepts an empty authoritative booking snapshot', () => {
    expect(bookingSnapshotSchema.parse(createEmptyBooking('call-1')).status).toBe('collecting')
  })

  it('rejects a confirmed snapshot without server facts', () => {
    const parsed = bookingSnapshotSchema.safeParse({
      ...createEmptyBooking('call-1'),
      status: 'confirmed',
    })
    expect(parsed.success).toBe(false)
  })

  it('rejects a confirmed snapshot whose total does not match the trip price', () => {
    const parsed = bookingSnapshotSchema.safeParse({
      ...createEmptyBooking('call-1'),
      status: 'confirmed',
      origin: 'Hà Nội',
      destination: 'Vinh',
      travelDateLabel: '20/07/2026',
      passengerCount: 2,
      selectedTrip: {
        id: 'trip-1',
        origin: 'Hà Nội',
        destination: 'Vinh',
        departureTime: '20:00',
        arrivalTime: '01:30',
        vehicleType: 'Limousine',
        priceVnd: 300_000,
        pickupPoint: 'Bến xe Nước Ngầm',
        dropoffPoint: 'Bến xe Vinh',
        seatNoun: 'ghế',
      },
      seats: ['A1', 'A2'],
      passengerName: 'Nguyễn An',
      phone: '0909123456',
      totalFareVnd: 1,
      bookingCode: 'MA-260720-0001',
    })
    expect(parsed.success).toBe(false)
  })

  it('exports versioned JSON that directly parses as a booking snapshot', () => {
    const snapshot = bookingSnapshotSchema.parse({
      ...createEmptyBooking('call-export'),
      status: 'confirmed',
      origin: 'Hà Nội',
      destination: 'Vinh',
      travelDateLabel: '20/07/2026',
      passengerCount: 1,
      selectedTrip: {
        id: 'trip-export',
        origin: 'Hà Nội',
        destination: 'Vinh',
        departureTime: '20:00',
        arrivalTime: '01:30',
        vehicleType: 'Limousine',
        priceVnd: 300_000,
        pickupPoint: 'Bến xe Nước Ngầm',
        dropoffPoint: 'Bến xe Vinh',
        seatNoun: 'ghế',
      },
      seats: ['A1'],
      passengerName: 'Nguyễn An',
      phone: '0909123456',
      totalFareVnd: 300_000,
      bookingCode: 'MA-260720-0001',
    })

    expect(createBookingSnapshotExport(snapshot).schemaVersion)
      .toBe(BOOKING_SNAPSHOT_SCHEMA_VERSION)
    const decoded: unknown = JSON.parse(serializeBookingSnapshot(snapshot))
    const exported = bookingSnapshotSchema.parse(decoded)

    expect(exported.schemaVersion).toBe('1.0')
    expect(exported).toMatchObject({
      conversationId: 'call-export',
      bookingCode: 'MA-260720-0001',
      status: 'confirmed',
    })
  })

  it('requires a call-bound, ordered envelope for agent events', () => {
    expect(agentEventSchema.safeParse({ type: 'call.end' }).success).toBe(false)
    expect(agentEventSchema.safeParse({
      type: 'call.end',
      callId: 'call-1',
      eventId: 'event-1',
      sequence: 1,
    }).success).toBe(true)
  })

  it('accepts a complete non-additive latency event and rejects a false summary', () => {
    const event = {
      type: 'latency.turn',
      callId: 'call-1',
      eventId: 'event-latency-1',
      sequence: 2,
      latency: {
        speechId: 'speech-1',
        measuredAt: '2026-07-18T12:00:00.000Z',
        slowestStageSeconds: 0.74,
        endOfUtteranceSeconds: 0.52,
        transcriptionSeconds: 0.31,
        llmTtftSeconds: 0.74,
        ttsTtfbSeconds: 0.18,
      },
    }

    expect(agentEventSchema.parse(event)).toEqual(event)
    expect(agentEventSchema.safeParse({
      ...event,
      latency: { ...event.latency, slowestStageSeconds: 1.44 },
    }).success).toBe(false)
    expect(agentEventSchema.safeParse({
      ...event,
      latency: { ...event.latency, ttsTtfbSeconds: -1 },
    }).success).toBe(false)
    expect(agentEventSchema.safeParse({
      ...event,
      latency: {
        ...event.latency,
        slowestStageSeconds: 0.8,
        endOfUtteranceSeconds: 0.5,
        transcriptionSeconds: 0.8,
      },
    }).success).toBe(false)
  })

  it('accepts timestamped semantic evidence with honest empty arrays', () => {
    const event = {
      type: 'semantic.annotation',
      callId: 'call-1',
      eventId: 'event-2',
      sequence: 2,
      timestamp: '2026-07-18T12:00:00.000Z',
      sourceTranscript: 'toi muon di da lat',
      correctedText: 'Tôi muốn đi Đà Lạt.',
      tags: [],
      annotations: [],
    }

    expect(agentEventSchema.parse(event)).toEqual(event)
  })

  it('rejects semantic evidence without a valid timestamp or explicit arrays', () => {
    const event = {
      type: 'semantic.annotation',
      callId: 'call-1',
      eventId: 'event-2',
      sequence: 2,
      timestamp: 'not-a-timestamp',
      sourceTranscript: 'Tôi muốn đi Đà Lạt.',
    }

    expect(agentEventSchema.safeParse(event).success).toBe(false)
    expect(agentEventSchema.safeParse({
      ...event,
      timestamp: '2026-07-18T12:00:00.000Z',
      tags: [],
      annotations: ['Đà Lạt'],
    }).success).toBe(true)
  })

  it('accepts semantic evidence exactly at event output limits', () => {
    const event = {
      type: 'semantic.annotation',
      callId: 'call-1',
      eventId: 'event-boundary',
      sequence: 3,
      timestamp: '2026-07-18T12:00:00.000Z',
      sourceTranscript: 's'.repeat(SEMANTIC_ANNOTATION_TEXT_MAX_CHARS),
      correctedText: 'c'.repeat(SEMANTIC_ANNOTATION_TEXT_MAX_CHARS),
      tags: Array.from(
        { length: SEMANTIC_ANNOTATION_ITEMS_MAX },
        () => 't'.repeat(SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS),
      ),
      annotations: Array.from(
        { length: SEMANTIC_ANNOTATION_ITEMS_MAX },
        () => 'a'.repeat(SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS),
      ),
    }

    expect(agentEventSchema.safeParse(event).success).toBe(true)
  })

  it('counts semantic text and display limits by Unicode code point', () => {
    const emoji = '🚌'
    const event = {
      type: 'semantic.annotation',
      callId: 'call-1',
      eventId: 'event-unicode-boundary',
      sequence: 4,
      timestamp: '2026-07-18T12:00:00.000Z',
      sourceTranscript: emoji.repeat(SEMANTIC_ANNOTATION_TEXT_MAX_CHARS),
      correctedText: emoji.repeat(SEMANTIC_ANNOTATION_TEXT_MAX_CHARS),
      tags: [emoji.repeat(SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS)],
      annotations: [emoji.repeat(SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS)],
    }

    expect(agentEventSchema.safeParse(event).success).toBe(true)
    expect(agentEventSchema.safeParse({
      ...event,
      sourceTranscript: emoji.repeat(SEMANTIC_ANNOTATION_TEXT_MAX_CHARS + 1),
    }).success).toBe(false)
    expect(agentEventSchema.safeParse({
      ...event,
      tags: [emoji.repeat(SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS + 1)],
    }).success).toBe(false)
  })

  it('rejects semantic evidence beyond text, item, or display limits', () => {
    const event = {
      type: 'semantic.annotation',
      callId: 'call-1',
      eventId: 'event-oversized',
      sequence: 5,
      timestamp: '2026-07-18T12:00:00.000Z',
      sourceTranscript: 'source',
      correctedText: 'corrected',
      tags: ['tag'],
      annotations: ['annotation'],
    }
    const tooLongText = 'x'.repeat(SEMANTIC_ANNOTATION_TEXT_MAX_CHARS + 1)
    const tooLongDisplay = 'x'.repeat(SEMANTIC_ANNOTATION_DISPLAY_MAX_CHARS + 1)
    const tooManyItems = Array.from(
      { length: SEMANTIC_ANNOTATION_ITEMS_MAX + 1 },
      () => 'value',
    )

    expect(agentEventSchema.safeParse({ ...event, sourceTranscript: tooLongText }).success).toBe(false)
    expect(agentEventSchema.safeParse({ ...event, correctedText: tooLongText }).success).toBe(false)
    expect(agentEventSchema.safeParse({ ...event, tags: [tooLongDisplay] }).success).toBe(false)
    expect(agentEventSchema.safeParse({ ...event, annotations: [tooLongDisplay] }).success).toBe(false)
    expect(agentEventSchema.safeParse({ ...event, tags: tooManyItems }).success).toBe(false)
    expect(agentEventSchema.safeParse({ ...event, annotations: tooManyItems }).success).toBe(false)
  })
})
