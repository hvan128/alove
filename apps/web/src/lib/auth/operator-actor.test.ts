import { describe, expect, it } from 'vitest'
import { getOperatorActor, requireOperatorRole } from './operator-actor'

describe('operator actor policy', () => {
  it('fails closed without an auth adapter or explicit demo mode', () => {
    expect(() => getOperatorActor({})).toThrow('OPERATOR_AUTH_UNCONFIGURED')
  })

  it('creates a demo admin only behind the explicit flag', () => {
    expect(getOperatorActor({ OPERATOR_DEMO_MODE: 'true' })).toEqual({
      id: 'demo-admin',
      role: 'admin',
      demo: true,
    })
  })

  it('rejects roles outside the allowed set', () => {
    expect(() => requireOperatorRole(
      { id: 'reader-1', role: 'read-only', demo: false },
      ['admin'],
    )).toThrow('FORBIDDEN')
  })
})
