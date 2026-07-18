// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  checkDashboardRequest,
  createDashboardSession,
  dashboardAccessKey,
  keyMatches,
  verifyDashboardSession,
} from './dashboard-auth'

const ACCESS_KEY = 'dashboard-test-key-at-least-32-bytes'

describe('dashboard authentication', () => {
  beforeEach(() => {
    process.env.DASHBOARD_ACCESS_KEY = ACCESS_KEY
  })

  afterEach(() => {
    delete process.env.DASHBOARD_ACCESS_KEY
  })

  it('stores a signed, expiring session instead of the raw access key', () => {
    const now = Date.UTC(2026, 6, 18, 10, 0, 0)
    const session = createDashboardSession(now)

    expect(session).not.toContain(ACCESS_KEY)
    expect(verifyDashboardSession(session, now)).toBe(true)
    expect(verifyDashboardSession(session, now + 12 * 60 * 60 * 1000 + 1)).toBe(false)
  })

  it('rejects tampered sessions and short configured keys', () => {
    const session = createDashboardSession()
    expect(verifyDashboardSession(`${session}x`)).toBe(false)

    process.env.DASHBOARD_ACCESS_KEY = 'too-short'
    expect(dashboardAccessKey()).toBeNull()
    expect(keyMatches('too-short')).toBe(false)
  })

  it('rejects a malformed cookie without turning the API request into a 500', () => {
    const request = new Request('http://localhost/api/dashboard/calls', {
      headers: { cookie: 'alove-dashboard-session=%E0%A4%A' },
    })
    expect(checkDashboardRequest(request)).toBe(false)
  })
})
