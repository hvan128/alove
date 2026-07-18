import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { CALL_SESSION_TTL_SECONDS, createCallSession, verifyCallSession } from './call-session'

describe('signed LiveKit call sessions', () => {
  beforeEach(() => {
    process.env.LIVEKIT_API_SECRET = 'test-livekit-secret'
  })

  afterEach(() => {
    delete process.env.LIVEKIT_API_SECRET
  })

  it('round-trips a server-issued room identity', () => {
    const now = Date.UTC(2026, 6, 18, 10, 0, 0)
    const issued = createCallSession(now)

    expect(verifyCallSession(issued.token, now)).toEqual(issued.session)
    expect(issued.session.identity).toMatch(/^customer-/u)
    expect(issued.session.expiresAt).toBe(Math.floor(now / 1000) + CALL_SESSION_TTL_SECONDS)
  })

  it('rejects tampered and expired capabilities', () => {
    const now = Date.UTC(2026, 6, 18, 10, 0, 0)
    const issued = createCallSession(now)

    expect(verifyCallSession(`${issued.token}x`, now)).toBeNull()
    expect(verifyCallSession(issued.token, now + (CALL_SESSION_TTL_SECONDS + 1) * 1000)).toBeNull()
  })
})
