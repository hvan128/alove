// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const webhook = vi.hoisted(() => ({
  configuration: vi.fn(),
  deliver: vi.fn(),
  list: vi.fn(),
}))

vi.mock('@/lib/booking-webhook', () => ({
  bookingWebhookConfigurationStatus: webhook.configuration,
  deliverBookingWebhook: webhook.deliver,
}))

vi.mock('@/lib/db/webhook-outbox-store', () => ({
  listDueBookingWebhookEventIds: webhook.list,
}))

import { GET } from './route'

const SECRET = 'cron-secret-that-is-at-least-thirty-two-bytes'

function request(secret = SECRET): Request {
  return new Request('http://localhost/api/booking/webhook/drain', {
    headers: { authorization: `Bearer ${secret}` },
  })
}

describe('GET /api/booking/webhook/drain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    webhook.configuration.mockReturnValue('enabled')
    webhook.list.mockResolvedValue([])
  })

  it('requires the dedicated cron bearer secret', async () => {
    const response = await GET(request('wrong-secret-that-is-at-least-32-bytes'))
    expect(response.status).toBe(401)
    expect(webhook.list).not.toHaveBeenCalled()
  })

  it('returns the explicit disabled state without scanning the outbox', async () => {
    webhook.configuration.mockReturnValue('disabled')
    const response = await GET(request())
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'disabled', processed: 0 })
    expect(webhook.list).not.toHaveBeenCalled()
  })

  it('drains due events without exposing event IDs and contains delivery errors', async () => {
    webhook.list.mockResolvedValue(['event-1', 'event-2', 'event-3'])
    webhook.deliver
      .mockResolvedValueOnce({ status: 'delivered', attempts: 1 })
      .mockResolvedValueOnce({ status: 'failed', attempts: 3 })
      .mockRejectedValueOnce(new Error('database unavailable'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const response = await GET(request())
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual({
      status: 'processed',
      processed: 3,
      counts: { delivered: 1, failed: 1, pending: 1 },
    })
    expect(webhook.list).toHaveBeenCalledWith(3)
    expect(JSON.stringify(body)).not.toContain('event-1')
  })
})
