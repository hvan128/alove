import { describe, expect, it } from 'vitest'
import type { RoomEvent } from '@ordervoice/contracts'
import { createSessionRepository } from './session-repository'

const finalEvent: RoomEvent = {
  version: 1,
  eventId: 'event-final-001',
  sessionCode: 'DEMO42',
  occurredAt: '2026-07-18T04:00:00.000Z',
  type: 'transcript.final',
  message: {
    id: 'message-final-001',
    role: 'caller',
    text: 'Tôi đi từ Sài Gòn đến Đà Lạt.',
    language: 'vi',
    translations: { en: 'I am going from Saigon to Da Lat.' },
    confidence: 0.96,
    startedAtMs: 100,
    endedAtMs: 1_200,
    channel: 'voice',
  },
}

describe('live session repository', () => {
  it('falls back to an explicit in-memory event log without DATABASE_URL', async () => {
    const repository = createSessionRepository({}, { memory: new Map() })

    const first = await repository.append(finalEvent)
    const duplicate = await repository.append(finalEvent)

    expect(repository.mode).toBe('memory')
    expect(first).toEqual({ stored: true, duplicate: false })
    expect(duplicate).toEqual({ stored: false, duplicate: true })
    expect(await repository.list('DEMO42')).toEqual([finalEvent])
  })

  it('preserves original transcript, translations and evidence snapshots by revision', async () => {
    const repository = createSessionRepository({}, { memory: new Map() })
    const snapshot = {
      version: 1,
      eventId: 'event-snapshot-002',
      sessionCode: 'DEMO42',
      occurredAt: '2026-07-18T04:00:02.000Z',
      type: 'booking.snapshot',
      revision: 2,
      booking: {
        id: 'booking-DEMO42', conversationId: 'DEMO42', status: 'collecting',
        origin: 'Sài Gòn', destination: 'Đà Lạt', travelDateLabel: '24/07', timeWindow: '22:00',
        passengerCount: 2, selectedTrip: null, seats: [], passengerName: null, phone: null,
        pickupPoint: null, dropoffPoint: null, vehiclePreference: null, paymentMethod: null, note: null,
        totalFareVnd: null, bookingCode: null, evidenceMessageIds: ['message-final-001'],
        fieldEvidence: { destination: [{
          id: 'evidence-destination-001', field: 'destination',
          messageId: 'message-final-001', quote: 'Đà Lạt', confidence: 0.96,
          source: 'caller_speech', capturedAt: '2026-07-18T04:00:00.000Z',
        }] },
        confirmedFields: ['origin'], reviewItems: [],
      },
    } satisfies RoomEvent

    await repository.append(finalEvent)
    await repository.append(snapshot)
    const events = await repository.list('DEMO42')

    expect(events[0]).toEqual(finalEvent)
    expect(events[1]).toEqual(snapshot)
    expect(events[0]?.type === 'transcript.final' && events[0].message.text).toContain('Sài Gòn')
    expect(events[1]?.type === 'booking.snapshot' && events[1].booking.fieldEvidence.destination?.[0]?.quote).toBe('Đà Lạt')
  })

  it('isolates normalized session codes', async () => {
    const repository = createSessionRepository({}, { memory: new Map() })
    await repository.append(finalEvent)

    await expect(repository.list('bad<script>')).rejects.toThrow('Mã phiên')
    expect(await repository.list('demo-42')).toEqual([finalEvent])
  })
})
