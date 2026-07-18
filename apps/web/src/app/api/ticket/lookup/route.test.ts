import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomerTicket } from '@/lib/db/booking-store'

import { resetRateLimitForTests } from '@/lib/rate-limit'
import { findTicketForCustomer } from '@/lib/db/booking-store'
import { POST } from './route'

vi.mock('@/lib/db/booking-store', () => ({ findTicketForCustomer: vi.fn() }))

const lookup = vi.mocked(findTicketForCustomer)

const TICKET: CustomerTicket = {
  code: 'VD-260725-0042',
  passengerName: 'Nguyễn Minh Anh',
  phoneMasked: '0909 *** 456',
  seatCodes: ['A05'],
  totalVnd: 320_000,
  status: 'paid',
  departureAt: '2026-07-25T15:00:00.000Z',
  arrivalAt: '2026-07-25T22:30:00.000Z',
  originCity: 'Sài Gòn',
  destinationCity: 'Đà Lạt',
  vehicleType: 'Giường nằm 34 chỗ',
  pickupPoint: 'Bến xe Miền Đông',
  dropoffPoint: 'Bến xe Đà Lạt',
}

// Each test gets its own address so one test's attempts cannot exhaust another's.
let nextIp = 0
function request(body: unknown, ip = `10.0.0.${(nextIp += 1)}`): Request {
  return new Request('http://localhost/api/ticket/lookup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/ticket/lookup', () => {
  beforeEach(() => {
    resetRateLimitForTests()
    lookup.mockReset()
  })

  it('returns the ticket when the code and last four digits match', async () => {
    lookup.mockResolvedValue(TICKET)
    const res = await POST(request({ code: 'VD-260725-0042', phoneLast4: '3456' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ticket: TICKET })
  })

  it('needs no shared secret, unlike every agent route', async () => {
    lookup.mockResolvedValue(TICKET)
    // No authorization header at all.
    expect((await POST(request({ code: 'VD-260725-0042', phoneLast4: '3456' }))).status).toBe(200)
  })

  it('rejects a last4 that is not exactly four digits', async () => {
    for (const phoneLast4 of ['123', '12345', 'abcd', '']) {
      const res = await POST(request({ code: 'VD-260725-0042', phoneLast4 }))
      expect(res.status).toBe(400)
    }
    expect(lookup).not.toHaveBeenCalled()
  })

  it('answers 404 for an unknown ticket without saying which half was wrong', async () => {
    lookup.mockResolvedValue(null)
    const res = await POST(request({ code: 'VD-260725-0042', phoneLast4: '0000' }))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('throttles a guesser and tells them when to come back', async () => {
    lookup.mockResolvedValue(null)
    const ip = '203.0.113.77'
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      expect((await POST(request({ code: 'VD-260725-0042', phoneLast4: '0000' }, ip))).status).toBe(404)
    }
    const blocked = await POST(request({ code: 'VD-260725-0042', phoneLast4: '0000' }, ip))
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('does not let one guesser throttle a different passenger', async () => {
    lookup.mockResolvedValue(null)
    for (let attempt = 1; attempt <= 11; attempt += 1) {
      await POST(request({ code: 'VD-260725-0042', phoneLast4: '0000' }, '203.0.113.78'))
    }
    lookup.mockResolvedValue(TICKET)
    expect((await POST(request({ code: 'VD-260725-0042', phoneLast4: '3456' }, '198.51.100.5'))).status).toBe(200)
  })

  it('turns a database failure into 503 rather than leaking driver internals', async () => {
    lookup.mockRejectedValue(new Error('relation "bookings" does not exist'))
    const res = await POST(request({ code: 'VD-260725-0042', phoneLast4: '3456' }))
    expect(res.status).toBe(503)
    expect(JSON.stringify(await res.json())).not.toContain('bookings')
  })

  it('survives a body that is not JSON at all', async () => {
    const res = await POST(new Request('http://localhost/api/ticket/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9' },
      body: 'not json',
    }))
    expect(res.status).toBe(400)
  })
})
