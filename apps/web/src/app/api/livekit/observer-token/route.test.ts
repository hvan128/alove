// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const DASHBOARD_KEY = 'test-dashboard-key-at-least-32-bytes'

describe('POST /api/livekit/observer-token', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.LIVEKIT_URL = 'wss://test.livekit.cloud'
    process.env.LIVEKIT_API_KEY = 'test-key'
    process.env.LIVEKIT_API_SECRET = 'test-secret-at-least-32-bytes-long'
    process.env.DASHBOARD_ACCESS_KEY = DASHBOARD_KEY
  })

  afterEach(() => {
    delete process.env.LIVEKIT_URL
    delete process.env.LIVEKIT_API_KEY
    delete process.env.LIVEKIT_API_SECRET
    delete process.env.DASHBOARD_ACCESS_KEY
  })

  it('does not mint a subscribe token without dashboard authentication', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/livekit/observer-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ conversationId: 'call-1' }),
    })
    expect((await POST(request as never)).status).toBe(401)
  })

  it('mints a dashboard-only observer token', async () => {
    const { POST } = await import('./route')
    const request = new Request('http://localhost/api/livekit/observer-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dashboard-key': DASHBOARD_KEY },
      body: JSON.stringify({ conversationId: 'call-1' }),
    })
    const response = await POST(request as never)
    expect(response.status).toBe(200)
    expect((await response.json()).roomName).toBe('booking-call-1')
  })
})
