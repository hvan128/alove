import { afterEach, describe, expect, it } from 'vitest'

import { createDashboardSession } from '@/lib/dashboard-auth'
import { GET } from './route'

const KEY = 'test-dashboard-key-at-least-32-bytes'

function request(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/dashboard/calls', { headers })
}

describe('GET /api/dashboard/calls', () => {
  afterEach(() => {
    delete process.env.DASHBOARD_ACCESS_KEY
  })

  it('is closed by default when no access key is configured', async () => {
    const res = await GET(request({ 'x-dashboard-key': 'anything' }))
    expect(res.status).toBe(401)
  })

  it('rejects a wrong key and accepts the right one via header', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    expect((await GET(request({ 'x-dashboard-key': 'wrong' }))).status).toBe(401)
    expect((await GET(request())).status).toBe(401)

    const ok = await GET(request({ 'x-dashboard-key': KEY }))
    expect(ok.status).toBe(200)
    // No DATABASE_URL in tests → explicit "not configured" payload, not a crash.
    expect(await ok.json()).toEqual({ configured: false, calls: [] })
  })

  it('accepts the key via cookie', async () => {
    process.env.DASHBOARD_ACCESS_KEY = KEY
    const res = await GET(request({ cookie: `alove-dashboard-session=${createDashboardSession()}` }))
    expect(res.status).toBe(200)
  })

  it('rejects a short access key outright', async () => {
    process.env.DASHBOARD_ACCESS_KEY = 'short'
    const res = await GET(request({ 'x-dashboard-key': 'short' }))
    expect(res.status).toBe(401)
  })
})
