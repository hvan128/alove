import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDashboardSession } from '@/lib/dashboard-auth'

const { cancelBooking } = vi.hoisted(() => ({ cancelBooking: vi.fn() }))

vi.mock('@/lib/db/booking-store', () => ({ cancelBooking }))

import { POST } from './route'

const KEY = 'test-dashboard-key-at-least-32-bytes'

function request(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/dashboard/bookings/17/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/dashboard/bookings/[bookingId]/cancel', () => {
  afterEach(() => {
    delete process.env.DASHBOARD_ACCESS_KEY
    cancelBooking.mockReset()
  })

  it('requires dashboard authentication', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    const response = await POST(request({ callId: 'call-001' }), {
      params: Promise.resolve({ bookingId: '17' }),
    })
    expect(response.status).toBe(401)
    expect(cancelBooking).not.toHaveBeenCalled()
  })

  it('rejects an invalid booking ID or body', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    const response = await POST(request({ callId: '' }, { 'x-dashboard-key': KEY }), {
      params: Promise.resolve({ bookingId: 'invalid' }),
    })
    expect(response.status).toBe(400)
    expect(cancelBooking).not.toHaveBeenCalled()
  })

  it('cancels the exact pending booking with dashboard auth', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    cancelBooking.mockResolvedValue({ cancelled: true, code: 'MA-001', seatCodes: ['A01'] })
    const response = await POST(
      request({ callId: 'call-001' }, { cookie: `alove-dashboard-session=${createDashboardSession()}` }),
      { params: Promise.resolve({ bookingId: '17' }) },
    )
    expect(response.status).toBe(200)
    expect(cancelBooking).toHaveBeenCalledWith({ callId: 'call-001', bookingId: 17, pendingOnly: true })
  })

  it('does not treat paid, cancelled or missing bookings as a successful cancellation', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    cancelBooking.mockResolvedValue({ cancelled: false })
    const response = await POST(request({ callId: 'call-001' }, { 'x-dashboard-key': KEY }), {
      params: Promise.resolve({ bookingId: '17' }),
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'booking_not_cancellable' })
  })
})
