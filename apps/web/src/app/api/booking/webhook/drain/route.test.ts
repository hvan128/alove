// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const webhook = vi.hoisted(() => ({
  configuration: vi.fn(),
  deliver: vi.fn(),
  list: vi.fn(),
  reconcile: vi.fn(),
  countAbandoned: vi.fn(),
}))
const reportIssue = vi.hoisted(() => vi.fn())

vi.mock('@/lib/booking-webhook', () => ({
  bookingWebhookConfigurationStatus: webhook.configuration,
  deliverBookingWebhook: webhook.deliver,
}))

vi.mock('@/lib/db/webhook-outbox-store', () => ({
  countAbandonedBookingWebhooks: webhook.countAbandoned,
  listDueBookingWebhookEventIds: webhook.list,
  reconcileStaleBookingWebhookAttempts: webhook.reconcile,
}))

vi.mock('@/lib/observability', () => ({ reportIssue }))

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
    webhook.reconcile.mockResolvedValue(0)
    webhook.countAbandoned.mockResolvedValue(0)
  })

  it('reports abandoned events, which no retry path will ever pick up again', async () => {
    webhook.countAbandoned.mockResolvedValue(2)

    const response = await GET(request())

    expect(await response.json()).toMatchObject({ abandoned: 2 })
    expect(reportIssue).toHaveBeenCalledWith(
      '[alove] booking webhook outbox has abandoned events',
      expect.objectContaining({ level: 'error', context: { abandoned: 2, reason: 'no_retry_path_remaining' } }),
    )
  })

  it('stays quiet when the outbox has nothing abandoned', async () => {
    await GET(request())

    expect(reportIssue).not.toHaveBeenCalled()
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
      abandoned: 0,
    })
    expect(webhook.list).toHaveBeenCalledWith(3)
    expect(webhook.reconcile).toHaveBeenCalledOnce()
    expect(JSON.stringify(body)).not.toContain('event-1')
  })

  it('starts due deliveries concurrently so one slow event cannot consume the whole cron window', async () => {
    webhook.list.mockResolvedValue(['event-1', 'event-2', 'event-3'])
    const releases: Array<(value: { status: 'delivered'; attempts: number }) => void> = []
    webhook.deliver.mockImplementation(() => new Promise((resolve) => releases.push(resolve)))

    const responsePromise = GET(request())
    await vi.waitFor(() => expect(webhook.deliver).toHaveBeenCalledTimes(3))
    for (const release of releases) release({ status: 'delivered', attempts: 1 })

    const response = await responsePromise
    await expect(response.json()).resolves.toEqual({
      status: 'processed',
      processed: 3,
      counts: { delivered: 3, failed: 0, pending: 0 },
      abandoned: 0,
    })
  })
})
