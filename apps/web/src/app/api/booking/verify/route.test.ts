// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'

const bookingStore = vi.hoisted(() => ({
  findForVerification: vi.fn(),
}))
const rateLimitStore = vi.hoisted(() => ({
  consume: vi.fn(),
}))
const security = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  ip: vi.fn(() => '203.0.113.30'),
  key: vi.fn((kind: string, value: string) => `${kind}:${value}`),
}))

vi.mock('@/lib/db/client', () => ({
  isDbConfigured: vi.fn(() => true),
}))

vi.mock('@/lib/db/booking-store', () => ({
  findBookingSnapshotForVerification: bookingStore.findForVerification,
}))

vi.mock('@/lib/db/rate-limit-store', () => ({
  consumePublicRateLimit: rateLimitStore.consume,
}))

vi.mock('@/lib/booking-verification-security', () => ({
  isBookingVerificationConfigured: security.configured,
  trustedVerificationIp: security.ip,
  verificationRateKey: security.key,
}))

import { isDbConfigured } from '@/lib/db/client'
import { POST } from './route'

function confirmedSnapshot() {
  return {
    id: 'booking-1',
    conversationId: 'call-private',
    status: 'confirmed' as const,
    origin: 'Hà Nội',
    destination: 'Vinh',
    travelDateLabel: '20/07/2026',
    passengerCount: 1,
    selectedTrip: {
      id: 'trip-1',
      origin: 'Hà Nội',
      destination: 'Vinh',
      departureTime: '20:00',
      arrivalTime: '01:30',
      vehicleType: 'Limousine',
      priceVnd: 300_000,
      pickupPoint: 'Bến xe Nước Ngầm',
      dropoffPoint: 'Bến xe Vinh',
      seatNoun: 'ghế',
    },
    seats: ['A1'],
    passengerName: 'Nguyễn An',
    phone: '0909123456',
    totalFareVnd: 300_000,
    bookingCode: 'MA-260720-0001',
  }
}

function request(
  body: BodyInit | null,
  options: { ip?: string; headers?: HeadersInit } = {},
): Request {
  return new Request('http://localhost/api/booking/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': options.ip ?? '203.0.113.30',
      ...options.headers,
    },
    body,
  })
}

function jsonRequest(value: unknown, ip?: string): Request {
  return request(JSON.stringify(value), { ...(ip ? { ip } : {}) })
}

function expectNoStore(response: Response): void {
  expect(response.headers.get('cache-control')).toBe('no-store, max-age=0')
}

describe('POST /api/booking/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isDbConfigured).mockReturnValue(true)
    security.configured.mockReturnValue(true)
    rateLimitStore.consume.mockResolvedValue({ allowed: true, retryAfterSeconds: 600 })
    bookingStore.findForVerification.mockResolvedValue(null)
  })

  it('rate-limits the trusted IP plus normalized code, phone and pair factors', async () => {
    rateLimitStore.consume.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 37 })
    const ipBlocked = await POST(jsonRequest({
      code: 'MA-260720-0001',
      phone: '0909123456',
    }))
    expect(ipBlocked.status).toBe(429)
    expect(ipBlocked.headers.get('retry-after')).toBe('37')
    expectNoStore(ipBlocked)
    expect(security.key).toHaveBeenCalledWith('ip', '203.0.113.30')

    rateLimitStore.consume
      .mockReset()
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 600 })
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 600 })
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 600 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 19 })
    const pairBlocked = await POST(jsonRequest({
      code: 'ma-260720-0001',
      phone: '0909123456',
    }))
    expect(pairBlocked.status).toBe(429)
    expect(pairBlocked.headers.get('retry-after')).toBe('19')
    expectNoStore(pairBlocked)
    expect(security.key).toHaveBeenCalledWith('code', 'MA-260720-0001')
    expect(security.key).toHaveBeenCalledWith('phone', '0909123456')
    expect(security.key).toHaveBeenLastCalledWith(
      'pair',
      'MA-260720-0001\0' + '0909123456',
    )
    expect(bookingStore.findForVerification).not.toHaveBeenCalled()
  })

  it('caps both declared and actually streamed request bodies at 2 KiB', async () => {
    const declared = await POST(request('{}', {
      ip: '203.0.113.32',
      headers: { 'content-length': '2049' },
    }))
    expect(declared.status).toBe(413)
    await expect(declared.json()).resolves.toEqual({ error: 'payload_too_large' })
    expectNoStore(declared)

    const streamed = await POST(request('x'.repeat(2049), { ip: '203.0.113.33' }))
    expect(streamed.status).toBe(413)
    await expect(streamed.json()).resolves.toEqual({ error: 'payload_too_large' })
    expectNoStore(streamed)
    expect(bookingStore.findForVerification).not.toHaveBeenCalled()
  })

  it('uses the same generic miss for an unknown code and a mismatched phone', async () => {
    const unknownCode = await POST(jsonRequest(
      { code: 'MA-991231-9999', phone: '0909123456' },
      '203.0.113.34',
    ))
    const wrongPhone = await POST(jsonRequest(
      { code: 'MA-260720-0001', phone: '0911222333' },
      '203.0.113.35',
    ))

    expect(unknownCode.status).toBe(404)
    expect(wrongPhone.status).toBe(404)
    await expect(unknownCode.json()).resolves.toEqual({ verified: false, error: 'not_found' })
    await expect(wrongPhone.json()).resolves.toEqual({ verified: false, error: 'not_found' })
    expectNoStore(unknownCode)
    expectNoStore(wrongPhone)
  })

  it('fails explicitly when the database is unavailable', async () => {
    vi.mocked(isDbConfigured).mockReturnValue(false)
    const response = await POST(jsonRequest({ code: 'MA-1', phone: '0909123456' }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'verification_not_configured' })
    expectNoStore(response)
    expect(bookingStore.findForVerification).not.toHaveBeenCalled()
  })

  it('fails closed before rate limiting when verification security is not configured', async () => {
    security.configured.mockReturnValue(false)
    const response = await POST(jsonRequest({
      code: 'MA-260720-0001',
      phone: '0909123456',
    }))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({ error: 'verification_not_configured' })
    expectNoStore(response)
    expect(rateLimitStore.consume).not.toHaveBeenCalled()
    expect(bookingStore.findForVerification).not.toHaveBeenCalled()
  })

  it('normalizes the code and returns only the verified non-PII projection', async () => {
    bookingStore.findForVerification.mockResolvedValue(confirmedSnapshot())
    const response = await POST(jsonRequest({
      code: '  ma-260720-0001  ',
      phone: '0909123456',
    }))
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expectNoStore(response)
    expect(bookingStore.findForVerification).toHaveBeenCalledWith({
      code: 'MA-260720-0001',
      phone: '0909123456',
    })
    expect(body).toMatchObject({
      verified: true,
      booking: {
        schemaVersion: '1.0',
        bookingCode: 'MA-260720-0001',
        origin: 'Hà Nội',
        destination: 'Vinh',
      },
    })
    expect(JSON.stringify(body)).not.toContain('Nguyễn An')
    expect(JSON.stringify(body)).not.toContain('0909123456')
    expect(JSON.stringify(body)).not.toContain('call-private')
  })
})
