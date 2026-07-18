import { beforeEach, describe, expect, it, vi } from 'vitest'

const stores = vi.hoisted(() => ({
  cancel: vi.fn(),
  confirm: vi.fn(),
  explicit: vi.fn((text: string) => text === 'Tôi xác nhận đặt vé.'),
  find: vi.fn(),
  hold: vi.fn(),
  next: vi.fn(),
  search: vi.fn(),
  suggest: vi.fn(),
  webhook: vi.fn(),
  webhookConfig: vi.fn(),
}))

vi.mock('@/lib/db/client', () => ({
  isDbConfigured: vi.fn(() => true),
}))

vi.mock('@/lib/db/booking-store', () => ({
  cancelBooking: stores.cancel,
  confirmBooking: stores.confirm,
  findBookings: stores.find,
  holdSeats: stores.hold,
  isExplicitBookingConfirmation: stores.explicit,
  nextDeparturesOnRoute: stores.next,
  searchTrips: stores.search,
  suggestRoutes: stores.suggest,
}))

vi.mock('@/lib/booking-webhook', () => ({
  bookingWebhookConfigurationStatus: stores.webhookConfig,
  deliverBookingWebhook: stores.webhook,
}))

import { isDbConfigured } from '@/lib/db/client'
import { POST as cancel } from './cancel/route'
import { POST as confirm } from './confirm/route'
import { POST as hold } from './hold/route'
import { POST as lookup } from './lookup/route'
import { POST as search } from './search/route'

const SECRET = 'test-agent-secret-at-least-32-bytes'

function request(path: string, body: unknown): Request {
  return new Request(`http://localhost/api/booking/${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${SECRET}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('active booking routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isDbConfigured).mockReturnValue(true)
    stores.cancel.mockResolvedValue({ cancelled: false })
    stores.confirm.mockResolvedValue(null)
    stores.find.mockResolvedValue([])
    stores.hold.mockResolvedValue(null)
    stores.webhook.mockResolvedValue({ status: 'disabled', attempts: 0 })
    stores.webhookConfig.mockReturnValue('disabled')
    process.env.AGENT_WEBHOOK_SECRET = SECRET
  })

  it('requires an explicit deterministic confirmation utterance', async () => {
    const base = {
      conversationId: 'call-1',
      tripId: 'trip-1',
      passengerName: 'Nguyễn An',
      phone: '0909123456',
    }

    expect((await confirm(request('confirm', { ...base, confirmationText: 'không xác nhận' }))).status).toBe(400)
    expect(stores.confirm).not.toHaveBeenCalled()

    const valid = { ...base, confirmationText: 'Tôi xác nhận đặt vé.' }
    expect((await confirm(request('confirm', valid))).status).toBe(200)
    expect(stores.confirm).toHaveBeenCalledWith({
      callId: 'call-1',
      tripId: 'trip-1',
      passengerName: 'Nguyễn An',
      phone: '0909123456',
      confirmationText: 'Tôi xác nhận đặt vé.',
      enqueueWebhook: false,
    })
  })

  it('delivers the confirmed ticket webhook once and exposes its bounded status', async () => {
    stores.webhookConfig.mockReturnValue('enabled')
    stores.confirm.mockResolvedValue({
      code: 'MA-260718-0001',
      seatCodes: ['A01'],
      totalVnd: 300_000,
      departureLabel: '18/07 20:00',
      pickupPoint: 'Bến xe Nước Ngầm',
      webhookEventId: 'booking.confirmed.v1:MA-260718-0001',
    })
    stores.webhook.mockResolvedValue({ status: 'delivered', attempts: 2 })

    const response = await confirm(request('confirm', {
      conversationId: 'call-1',
      tripId: 'trip-1',
      passengerName: 'Nguyễn An',
      phone: '0909123456',
      confirmationText: 'Tôi xác nhận đặt vé.',
    }))

    expect(stores.webhook).toHaveBeenCalledTimes(1)
    expect(stores.confirm).toHaveBeenCalledWith(expect.objectContaining({ enqueueWebhook: true }))
    expect(stores.webhook).toHaveBeenCalledWith('booking.confirmed.v1:MA-260718-0001')
    await expect(response.json()).resolves.toMatchObject({
      confirmed: true,
      code: 'MA-260718-0001',
      webhook: { status: 'delivered', attempts: 2 },
    })
  })

  it('keeps an authoritative confirmation successful when delivery infrastructure rejects', async () => {
    stores.webhookConfig.mockReturnValue('enabled')
    stores.confirm.mockResolvedValue({
      code: 'MA-260718-0001',
      seatCodes: ['A01'],
      totalVnd: 300_000,
      departureLabel: '18/07 20:00',
      pickupPoint: 'Bến xe Nước Ngầm',
      webhookEventId: 'booking.confirmed.v1:MA-260718-0001',
    })
    stores.webhook.mockRejectedValue(new Error('outbox temporarily unavailable'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const response = await confirm(request('confirm', {
      conversationId: 'call-1',
      tripId: 'trip-1',
      passengerName: 'Nguyễn An',
      phone: '0909123456',
      confirmationText: 'Tôi xác nhận đặt vé.',
    }))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      confirmed: true,
      webhook: { status: 'pending', attempts: 0 },
    })
  })

  it('requires both booking code and phone for previous-call lookup', async () => {
    expect((await lookup(request('lookup', { code: 'MA-260718-0001' }))).status).toBe(400)
    expect((await lookup(request('lookup', { phone: '0909123456' }))).status).toBe(400)

    const credentials = { code: 'MA-260718-0001', phone: '0909123456' }
    expect((await lookup(request('lookup', credentials))).status).toBe(200)
    expect(stores.find).toHaveBeenCalledWith(credentials)
  })

  it('allows same-call cancellation without credentials and old-booking cancellation with both', async () => {
    expect((await cancel(request('cancel', { conversationId: 'call-1', code: 'MA-260718-0001' }))).status).toBe(400)

    expect((await cancel(request('cancel', { conversationId: 'call-1' }))).status).toBe(200)
    expect(stores.cancel).toHaveBeenLastCalledWith({ callId: 'call-1', code: null, phone: null })

    expect((await cancel(request('cancel', {
      conversationId: 'call-2',
      code: 'MA-260718-0001',
      phone: '0909123456',
    }))).status).toBe(200)
    expect(stores.cancel).toHaveBeenLastCalledWith({
      callId: 'call-2',
      code: 'MA-260718-0001',
      phone: '0909123456',
    })
  })

  it('returns 503 instead of a fake no-seat result when storage is absent', async () => {
    vi.mocked(isDbConfigured).mockReturnValue(false)
    const response = await hold(request('hold', {
      conversationId: 'call-1',
      tripId: 'trip-1',
      passengers: 1,
    }))
    expect(response.status).toBe(503)
    expect(stores.hold).not.toHaveBeenCalled()
  })

  it('rejects impossible calendar dates before querying inventory', async () => {
    const response = await search(request('search', {
      origin: 'Hà Nội',
      destination: 'Vinh',
      date: '2026-02-31',
      passengers: 1,
    }))
    expect(response.status).toBe(400)
    expect(stores.search).not.toHaveBeenCalled()
  })
})
