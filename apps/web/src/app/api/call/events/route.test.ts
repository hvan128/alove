import { beforeEach, describe, expect, it, vi } from 'vitest'

const stores = vi.hoisted(() => ({
  booking: vi.fn(),
  ended: vi.fn(),
  started: vi.fn(),
  transcript: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  isDbConfigured: vi.fn(() => true),
}))

vi.mock('@/lib/db/call-store', () => ({
  recordBookingUpdated: stores.booking,
  recordCallEnded: stores.ended,
  recordCallStarted: stores.started,
  recordTranscriptFinal: stores.transcript,
}))

import { createEmptyBooking } from '@/lib/call-contract'
import { isDbConfigured } from '@/lib/db/client'
import { POST } from './route'

const SECRET = 'test-agent-secret-at-least-32-bytes'

function request(body: unknown, auth: string | null = `Bearer ${SECRET}`): Request {
  return new Request('http://localhost/api/call/events', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/call/events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isDbConfigured).mockReturnValue(true)
    process.env.AGENT_WEBHOOK_SECRET = SECRET
  })

  it('requires a configured secret and matching bearer token', async () => {
    delete process.env.AGENT_WEBHOOK_SECRET
    expect((await POST(request({ conversationId: 'c1', type: 'call.started' }))).status).toBe(503)

    process.env.AGENT_WEBHOOK_SECRET = SECRET
    expect((await POST(request({ conversationId: 'c1', type: 'call.started' }, null))).status).toBe(401)
    expect((await POST(request({ conversationId: 'c1', type: 'call.started' }, 'Bearer nope'))).status).toBe(401)
  })

  it('returns 503 instead of accepting an event when the database is absent', async () => {
    vi.mocked(isDbConfigured).mockReturnValue(false)
    const response = await POST(request({ conversationId: 'c1', type: 'call.started' }))
    expect(response.status).toBe(503)
    expect(stores.started).not.toHaveBeenCalled()
  })

  it('persists lifecycle and final transcript events', async () => {
    const started = await POST(request({
      conversationId: 'c1',
      type: 'call.started',
      channel: 'phone',
      callerNumber: '+84901234567',
    }))
    expect(started.status).toBe(200)
    expect(stores.started).toHaveBeenCalledWith('c1', 'phone', '+84901234567')

    const event = {
      conversationId: 'c1',
      type: 'transcript.final',
      eventId: 'turn-user-1',
      sequence: 1,
      role: 'customer',
      text: 'Tôi muốn đặt một vé.',
    } as const
    expect((await POST(request(event))).status).toBe(200)
    expect(stores.transcript).toHaveBeenCalledWith(event)

    expect((await POST(request({ conversationId: 'c1', type: 'call.ended' }))).status).toBe(200)
    expect(stores.ended).toHaveBeenCalledWith('c1')
  })

  it('validates booking ownership and forwards a valid snapshot', async () => {
    const booking = createEmptyBooking('c1')
    const event = {
      conversationId: 'c1',
      type: 'booking.updated',
      eventId: 'booking-1',
      sequence: 2,
      booking,
    } as const

    expect((await POST(request(event))).status).toBe(200)
    expect(stores.booking).toHaveBeenCalledWith(event)

    const wrongCall = { ...event, booking: { ...booking, conversationId: 'other' } }
    expect((await POST(request(wrongCall))).status).toBe(400)
  })

  it('rejects partial transcripts and malformed persisted events', async () => {
    expect((await POST(request({ conversationId: 'c1', type: 'transcript.partial' }))).status).toBe(400)
    expect((await POST(request({
      conversationId: 'c1',
      type: 'transcript.final',
      eventId: 'turn-1',
      sequence: 0,
      role: 'customer',
      text: 'x',
    }))).status).toBe(400)
  })
})
