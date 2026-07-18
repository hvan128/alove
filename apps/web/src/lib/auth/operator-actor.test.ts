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

  it('resolves every operations role from the demo role flag', () => {
    for (const role of ['admin', 'dispatcher', 'customer-care', 'read-only'] as const) {
      expect(getOperatorActor({ OPERATOR_DEMO_MODE: 'true', OPERATOR_DEMO_ROLE: role })).toEqual({
        id: `demo-${role}`,
        role,
        demo: true,
      })
    }
  })

  it('rejects an unknown demo role instead of falling back to admin', () => {
    expect(() => getOperatorActor({ OPERATOR_DEMO_MODE: 'true', OPERATOR_DEMO_ROLE: 'superuser' }))
      .toThrow('OPERATOR_ROLE_INVALID')
  })

  it('resolves an authenticated actor from identity-provider headers', () => {
    expect(getOperatorActor({}, new Headers({
      'x-operator-id': 'linh',
      'x-operator-role': 'dispatcher',
    }))).toEqual({ id: 'linh', role: 'dispatcher', demo: false })
  })

  it('keeps the staff directory authoritative over the header role', () => {
    expect(getOperatorActor(
      { OPERATOR_STAFF_DIRECTORY: 'linh:dispatcher,minh:customer-care' },
      new Headers({ 'x-operator-id': 'minh', 'x-operator-role': 'admin' }),
    )).toEqual({ id: 'minh', role: 'customer-care', demo: false })
  })

  it('rejects an identity outside the configured staff directory', () => {
    expect(() => getOperatorActor(
      { OPERATOR_STAFF_DIRECTORY: 'linh:dispatcher' },
      new Headers({ 'x-operator-id': 'ghost', 'x-operator-role': 'admin' }),
    )).toThrow('OPERATOR_UNKNOWN_IDENTITY')
  })

  it('ignores identity headers while demo mode is on so demo stays deterministic', () => {
    expect(getOperatorActor(
      { OPERATOR_DEMO_MODE: 'true' },
      new Headers({ 'x-operator-id': 'linh', 'x-operator-role': 'dispatcher' }),
    )).toEqual({ id: 'demo-admin', role: 'admin', demo: true })
  })
})
