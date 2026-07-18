// @vitest-environment node

import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const outbox = vi.hoisted(() => ({
  claim: vi.fn(),
  delivered: vi.fn(),
  failed: vi.fn(),
  get: vi.fn(),
  reconcile: vi.fn(),
}))

vi.mock('./db/webhook-outbox-store', () => ({
  claimBookingWebhookAttempt: outbox.claim,
  getBookingWebhookState: outbox.get,
  reconcileStaleBookingWebhookAttempts: outbox.reconcile,
  recordBookingWebhookDelivered: outbox.delivered,
  recordBookingWebhookFailed: outbox.failed,
}))

import {
  bookingWebhookConfigurationStatus,
  bookingWebhookEventSchema,
  deliverBookingWebhook,
  isPrivateWebhookAddress,
  signBookingWebhook,
  type BookingWebhookEvent,
} from './booking-webhook'

const SECRET = 'webhook-secret-that-is-at-least-thirty-two-bytes'
const EVENT_ID = 'booking.confirmed.v1:MA-260720-0001'

function event(): BookingWebhookEvent {
  return bookingWebhookEventSchema.parse({
    schemaVersion: '1.0',
    type: 'booking.confirmed',
    eventId: EVENT_ID,
    booking: {
      conversationId: 'call-1',
      tripId: 'trip-1',
      bookingCode: 'MA-260720-0001',
      passengerName: 'Nguyễn An',
      phone: '0909123456',
      seats: ['A1'],
      totalFareVnd: 300_000,
      departureLabel: '20/07 20:00',
      pickupPoint: 'Bến xe Nước Ngầm',
    },
  })
}

function enableWebhook(): void {
  vi.stubEnv('BOOKING_WEBHOOK_URL', 'https://hooks.example/booking')
  vi.stubEnv('BOOKING_WEBHOOK_SECRET', SECRET)
  vi.stubEnv('BOOKING_WEBHOOK_ALLOWED_HOSTS', 'hooks.example')
  vi.stubEnv('CRON_SECRET', 'cron-secret-that-is-at-least-thirty-two-bytes')
}

const publicDns = async () => [{ address: '93.184.216.34', family: 4 }]

describe('durable booking confirmation webhook delivery', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('BOOKING_WEBHOOK_URL', '')
    vi.stubEnv('BOOKING_WEBHOOK_SECRET', '')
    vi.stubEnv('BOOKING_WEBHOOK_ALLOWED_HOSTS', '')
    vi.stubEnv('CRON_SECRET', '')
    vi.clearAllMocks()
    outbox.get.mockResolvedValue(null)
    outbox.delivered.mockResolvedValue(undefined)
    outbox.failed.mockResolvedValue(undefined)
    outbox.reconcile.mockResolvedValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('is disabled only when all webhook settings are absent', async () => {
    expect(bookingWebhookConfigurationStatus()).toBe('disabled')
    const fetchImpl = vi.fn()

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
    })).resolves.toEqual({ status: 'disabled', attempts: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(outbox.get).not.toHaveBeenCalled()
  })

  it.each([
    ['URL only', 'https://hooks.example/booking', '', 'hooks.example'],
    ['secret only', '', SECRET, 'hooks.example'],
    ['short secret', 'https://hooks.example/booking', 'too-short', 'hooks.example'],
    ['missing allowlist', 'https://hooks.example/booking', SECRET, ''],
    ['host outside allowlist', 'https://hooks.example/booking', SECRET, 'other.example'],
    ['insecure remote URL', 'http://hooks.example/booking', SECRET, 'hooks.example'],
    ['URL credentials', 'https://user:pass@hooks.example/booking', SECRET, 'hooks.example'],
  ])('fails closed for a misconfigured %s', async (_label, url, secret, hosts) => {
    vi.stubEnv('BOOKING_WEBHOOK_URL', url)
    vi.stubEnv('BOOKING_WEBHOOK_SECRET', secret)
    vi.stubEnv('BOOKING_WEBHOOK_ALLOWED_HOSTS', hosts)
    vi.stubEnv('CRON_SECRET', 'cron-secret-that-is-at-least-thirty-two-bytes')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(bookingWebhookConfigurationStatus()).toBe('misconfigured')
    const fetchImpl = vi.fn()

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
    })).resolves.toEqual({ status: 'misconfigured', attempts: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(outbox.claim).not.toHaveBeenCalled()
  })

  it('requires the durable cron drainer secret before enabling delivery', () => {
    vi.stubEnv('BOOKING_WEBHOOK_URL', 'https://hooks.example/booking')
    vi.stubEnv('BOOKING_WEBHOOK_SECRET', SECRET)
    vi.stubEnv('BOOKING_WEBHOOK_ALLOWED_HOSTS', 'hooks.example')
    vi.stubEnv('CRON_SECRET', '')

    expect(bookingWebhookConfigurationStatus()).toBe('misconfigured')
  })

  it('uses deterministic event identity, timestamped HMAC, and idempotency headers', async () => {
    enableWebhook()
    const payload = event()
    outbox.claim.mockResolvedValue({ payload, attempts: 1 })
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const now = () => 1_725_000_000_000

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
      now,
      random: () => 0,
      resolveHost: publicDns,
    })).resolves.toEqual({ status: 'delivered', attempts: 1 })

    const [, init] = fetchImpl.mock.calls[0] as [URL, RequestInit]
    const body = JSON.stringify(payload)
    const timestamp = '1725000000'
    const headers = new Headers(init.headers)
    expect(init.body).toBe(body)
    expect(headers.get('idempotency-key')).toBe(EVENT_ID)
    expect(headers.get('x-alove-timestamp')).toBe(timestamp)
    expect(headers.get('x-alove-signature')).toBe(
      `sha256=${createHmac('sha256', SECRET).update(`${timestamp}.${body}`).digest('hex')}`,
    )
    expect(signBookingWebhook(body, timestamp, SECRET))
      .toBe(headers.get('x-alove-signature'))
    expect(outbox.delivered).toHaveBeenCalledWith(EVENT_ID)
  })

  it('retries only transient HTTP failures within three durable claims', async () => {
    enableWebhook()
    outbox.claim
      .mockResolvedValueOnce({ payload: event(), attempts: 1 })
      .mockResolvedValueOnce({ payload: event(), attempts: 2 })
      .mockResolvedValueOnce({ payload: event(), attempts: 3 })
    const sleep = vi.fn().mockResolvedValue(undefined)
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
      sleep,
      random: () => 0,
      resolveHost: publicDns,
    })).resolves.toEqual({ status: 'delivered', attempts: 3 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[1_000], [2_000]])
    expect(outbox.failed.mock.calls).toEqual([
      [EVENT_ID, 'transient_http'],
      [EVENT_ID, 'transient_http'],
    ])

    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    outbox.claim.mockReset().mockResolvedValue({ payload: event(), attempts: 1 })
    const permanentFetch = vi.fn().mockResolvedValue(new Response(null, { status: 400 }))
    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: permanentFetch as typeof fetch,
      random: () => 0,
      resolveHost: publicDns,
    })).resolves.toEqual({ status: 'failed', attempts: 1 })
    expect(permanentFetch).toHaveBeenCalledTimes(1)
    expect(outbox.failed).toHaveBeenLastCalledWith(EVENT_ID, 'permanent_http')
  })

  it('bounds network-error retries and rejects private resolved destinations', async () => {
    enableWebhook()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    outbox.claim
      .mockResolvedValueOnce({ payload: event(), attempts: 1 })
      .mockResolvedValueOnce({ payload: event(), attempts: 2 })
      .mockResolvedValueOnce({ payload: event(), attempts: 3 })
    outbox.get.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'failed', attempts: 3 })
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'))

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
      sleep: vi.fn().mockResolvedValue(undefined),
      random: () => 0,
      resolveHost: publicDns,
    })).resolves.toEqual({ status: 'failed', attempts: 3 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(outbox.failed).toHaveBeenCalledTimes(3)

    expect(isPrivateWebhookAddress('127.0.0.1')).toBe(true)
    expect(isPrivateWebhookAddress('10.0.0.1')).toBe(true)
    expect(isPrivateWebhookAddress('::1')).toBe(true)
    expect(isPrivateWebhookAddress('203.0.113.20')).toBe(true)
    expect(isPrivateWebhookAddress('::ffff:c0a8:1')).toBe(true)
    expect(isPrivateWebhookAddress('2001:db8::1')).toBe(true)
    expect(isPrivateWebhookAddress('93.184.216.34')).toBe(false)
  })

  it('retries transient DNS failures but permanently rejects private resolution', async () => {
    enableWebhook()
    outbox.claim
      .mockResolvedValueOnce({ payload: event(), attempts: 1 })
      .mockResolvedValueOnce({ payload: event(), attempts: 2 })
      .mockResolvedValueOnce({ payload: event(), attempts: 3 })
    const resolveHost = vi.fn()
      .mockRejectedValueOnce(new Error('EAI_AGAIN'))
      .mockRejectedValueOnce(new Error('EAI_AGAIN'))
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
      sleep: vi.fn().mockResolvedValue(undefined),
      random: () => 0,
      resolveHost,
    })).resolves.toEqual({ status: 'delivered', attempts: 3 })
    expect(outbox.failed.mock.calls.slice(-2)).toEqual([
      [EVENT_ID, 'dns_error'],
      [EVENT_ID, 'dns_error'],
    ])
    expect(fetchImpl).toHaveBeenCalledOnce()

    outbox.claim.mockReset().mockResolvedValue({ payload: event(), attempts: 1 })
    const privateFetch = vi.fn()
    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: privateFetch as typeof fetch,
      random: () => 0,
      resolveHost: async () => [{ address: '169.254.169.254', family: 4 }],
    })).resolves.toEqual({ status: 'failed', attempts: 1 })
    expect(privateFetch).not.toHaveBeenCalled()
    expect(outbox.failed).toHaveBeenLastCalledWith(EVENT_ID, 'destination_rejected')
  })

  it('includes DNS resolution in the bounded per-attempt timeout', async () => {
    enableWebhook()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    outbox.claim
      .mockResolvedValueOnce({ payload: event(), attempts: 1 })
      .mockResolvedValueOnce({ payload: event(), attempts: 2 })
      .mockResolvedValueOnce({ payload: event(), attempts: 3 })
    outbox.get.mockResolvedValueOnce(null).mockResolvedValueOnce({ status: 'failed', attempts: 3 })
    const fetchImpl = vi.fn()
    const neverResolvingDns = vi.fn(() => new Promise<Array<{ address: string; family: number }>>(() => undefined))

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
      sleep: vi.fn().mockResolvedValue(undefined),
      timeoutMs: 100,
      random: () => 0,
      resolveHost: neverResolvingDns,
    })).resolves.toEqual({ status: 'failed', attempts: 3 })

    expect(neverResolvingDns).toHaveBeenCalledTimes(3)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(outbox.failed.mock.calls.slice(-3)).toEqual([
      [EVENT_ID, 'dns_error'],
      [EVENT_ID, 'dns_error'],
      [EVENT_ID, 'dns_error'],
    ])
  })

  it('returns an already-delivered state without another claim or request', async () => {
    enableWebhook()
    outbox.get.mockResolvedValue({ status: 'delivered', attempts: 2 })
    const fetchImpl = vi.fn()

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
      resolveHost: publicDns,
    })).resolves.toEqual({ status: 'delivered', attempts: 2 })
    expect(outbox.claim).not.toHaveBeenCalled()
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('does not reclaim a terminal failed event on a later confirmation', async () => {
    enableWebhook()
    outbox.get.mockResolvedValue({ status: 'failed', attempts: 1 })
    outbox.claim.mockResolvedValue(null)
    const fetchImpl = vi.fn()

    await expect(deliverBookingWebhook(EVENT_ID, {
      fetchImpl: fetchImpl as typeof fetch,
      resolveHost: publicDns,
    })).resolves.toEqual({ status: 'failed', attempts: 1 })
    expect(outbox.claim).toHaveBeenCalledOnce()
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
