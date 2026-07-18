// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resetRateLimitsForTests } from '@/lib/rate-limit'

describe('POST /api/livekit/token', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.LIVEKIT_URL = 'wss://test.livekit.cloud'
    process.env.LIVEKIT_API_KEY = 'test-key'
    process.env.LIVEKIT_API_SECRET = 'test-secret-at-least-32-bytes-long'
    resetRateLimitsForTests()
  })

  afterEach(() => {
    delete process.env.LIVEKIT_URL
    delete process.env.LIVEKIT_API_KEY
    delete process.env.LIVEKIT_API_SECRET
  })

  it('ignores caller-selected room, role, and identity', async () => {
    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
      body: JSON.stringify({ conversationId: 'victim', role: 'observer', identity: 'staff-victim' }),
    })

    const res = await POST(req as never)
    const body = await res.json() as {
      conversationId: string
      roomName: string
      sessionToken: string
      token: string
    }

    expect(res.status).toBe(200)
    expect(body.conversationId).not.toBe('victim')
    expect(body.roomName).toBe(`booking-${body.conversationId}`)
    expect(body.sessionToken).toBeTruthy()
    expect(body.token).toBeTruthy()
  })

  it('rate-limits anonymous room creation per forwarded IP', async () => {
    const { POST } = await import('./route')
    const request = () => new Request('http://localhost/api/livekit/token', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.11' },
    })

    for (let index = 0; index < 8; index += 1) {
      expect((await POST(request() as never)).status).toBe(200)
    }
    expect((await POST(request() as never)).status).toBe(429)
  })
})
