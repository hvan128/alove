import { beforeEach, describe, expect, it } from 'vitest'

import { clientKey, rateLimit, resetRateLimitForTests } from './rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimitForTests()
  })

  it('allows requests up to the limit and blocks the one after', () => {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      expect(rateLimit('ip', 3, 60_000, 1_000).allowed).toBe(true)
    }
    expect(rateLimit('ip', 3, 60_000, 1_000).allowed).toBe(false)
  })

  it('reports how long the caller must wait', () => {
    rateLimit('ip', 1, 60_000, 1_000)
    const blocked = rateLimit('ip', 1, 60_000, 31_000)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(30)
  })

  it('starts a fresh window once the old one expires', () => {
    rateLimit('ip', 1, 60_000, 1_000)
    expect(rateLimit('ip', 1, 60_000, 1_000).allowed).toBe(false)
    expect(rateLimit('ip', 1, 60_000, 61_001).allowed).toBe(true)
  })

  it('keeps separate budgets per key, so one attacker cannot lock everyone out', () => {
    rateLimit('attacker', 1, 60_000, 1_000)
    expect(rateLimit('attacker', 1, 60_000, 1_000).allowed).toBe(false)
    expect(rateLimit('passenger', 1, 60_000, 1_000).allowed).toBe(true)
  })
})

describe('clientKey', () => {
  function req(headers: Record<string, string>): Request {
    return new Request('http://localhost/api/ticket/lookup', { method: 'POST', headers })
  }

  it('takes the left-most forwarded address, which is the real client', () => {
    expect(clientKey(req({ 'x-forwarded-for': '203.0.113.9, 70.41.3.18' }))).toBe('203.0.113.9')
  })

  it('falls back to x-real-ip, then to a shared bucket', () => {
    expect(clientKey(req({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
    expect(clientKey(req({}))).toBe('unknown')
  })

  it('does not let a blank forwarded header escape into its own bucket', () => {
    expect(clientKey(req({ 'x-forwarded-for': '   ' }))).toBe('unknown')
  })
})
