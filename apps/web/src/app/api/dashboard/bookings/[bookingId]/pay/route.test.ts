import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDashboardSession } from '@/lib/dashboard-auth'

const { markBookingPaidByOperator } = vi.hoisted(() => ({ markBookingPaidByOperator: vi.fn() }))

vi.mock('@/lib/db/booking-store', () => ({ markBookingPaidByOperator }))

import { POST } from './route'

const KEY = 'test-dashboard-key-at-least-32-bytes'

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/dashboard/bookings/17/pay', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/dashboard/bookings/[bookingId]/pay', () => {
  afterEach(() => {
    delete process.env.DASHBOARD_ACCESS_KEY
    markBookingPaidByOperator.mockReset()
  })

  it('requires dashboard authentication', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    const response = await POST(request({ callId: 'call-001' }), {
      params: Promise.resolve({ bookingId: '17' }),
    })
    expect(response.status).toBe(401)
  })

  it('marks the exact booking paid with dashboard auth', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    markBookingPaidByOperator.mockResolvedValue({ paid: true })
    const response = await POST(
      request({ callId: 'call-001' }, { cookie: `alove-dashboard-session=${createDashboardSession()}` }),
      { params: Promise.resolve({ bookingId: '17' }) },
    )
    expect(response.status).toBe(200)
    expect(markBookingPaidByOperator).toHaveBeenCalledWith({ bookingId: 17, callId: 'call-001' })
  })

  it('rejects bookings that are no longer pending payment', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    markBookingPaidByOperator.mockResolvedValue({ paid: false })
    const response = await POST(request({ callId: 'call-001' }, { 'x-dashboard-key': KEY }), {
      params: Promise.resolve({ bookingId: '17' }),
    })
    expect(response.status).toBe(409)
  })
})
