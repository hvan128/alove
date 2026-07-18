import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { BookingDraft } from '@ordervoice/contracts'
import { POST } from './route'

const SECRET = 'test-agent-secret'
const CONVERSATION = 'vedi-test-001'

function request(body: unknown, auth: string | null = `Bearer ${SECRET}`): Request {
  return new Request('http://localhost/api/booking/advance', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
    body: JSON.stringify(body),
  })
}

async function advance(draft: BookingDraft | null, text: string): Promise<{ draft: BookingDraft; reply: string }> {
  const res = await POST(request({ conversationId: CONVERSATION, draft, text }))
  expect(res.status).toBe(200)
  return (await res.json()) as { draft: BookingDraft; reply: string }
}

describe('POST /api/booking/advance', () => {
  beforeEach(() => {
    process.env.AGENT_WEBHOOK_SECRET = SECRET
  })
  afterEach(() => {
    process.env.AGENT_WEBHOOK_SECRET = SECRET
  })

  it('returns 503 when the agent secret is not configured', async () => {
    delete process.env.AGENT_WEBHOOK_SECRET
    const res = await POST(request({ conversationId: CONVERSATION, draft: null, text: 'xin chào' }))
    expect(res.status).toBe(503)
  })

  it('rejects a missing or wrong bearer token', async () => {
    expect((await POST(request({ conversationId: CONVERSATION, draft: null, text: 'xin chào' }, null))).status).toBe(401)
    expect((await POST(request({ conversationId: CONVERSATION, draft: null, text: 'x' }, 'Bearer nope'))).status).toBe(401)
  })

  it('rejects an invalid body', async () => {
    const res = await POST(request({ conversationId: CONVERSATION, draft: null }))
    expect(res.status).toBe(400)
  })

  it('drives the deterministic booking flow through to a confirmed ticket', async () => {
    // First turn: full trip request with origin/destination/date/passenger count.
    const first = await advance(null, 'Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.')
    expect(first.draft.origin).toBe('Sài Gòn')
    expect(first.draft.destination).toBe('Đà Lạt')
    expect(first.draft.passengerCount).toBe(2)
    expect(first.draft.selectedTrip).not.toBeNull()
    expect(first.draft.status).toBe('trip_proposed')
    expect(first.reply.length).toBeGreaterThan(0)

    // Passenger details → the agent reads the booking back for confirmation.
    const withPassenger = await advance(first.draft, 'Tôi là Nguyễn Minh Anh, số điện thoại 0909123456.')
    expect(withPassenger.draft.passengerName).toBe('Nguyễn Minh Anh')
    expect(withPassenger.draft.phone).toBe('0909123456')
    expect(withPassenger.draft.status).toBe('awaiting_confirmation')

    // Explicit confirmation → deterministic ticket code + seats.
    const confirmed = await advance(withPassenger.draft, 'Tôi xác nhận đặt vé.')
    expect(confirmed.draft.status).toBe('confirmed')
    expect(confirmed.draft.bookingCode).toBeTruthy()
    expect(confirmed.draft.seats).toHaveLength(2)
    expect(confirmed.reply).toContain(confirmed.draft.bookingCode as string)
  })
})
