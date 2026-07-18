import type { OperatorRole } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import { canPerform, listPermittedActions, requirePermission } from './operator-permissions'

const actor = (role: OperatorRole) => ({ id: `staff-${role}`, role, demo: false })

describe('operations permission matrix', () => {
  it('lets every operations role read the dashboard and audit trail', () => {
    for (const role of ['admin', 'dispatcher', 'customer-care', 'read-only'] as const) {
      expect(canPerform(role, 'operations.view')).toBe(true)
      expect(canPerform(role, 'audit.view')).toBe(true)
    }
  })

  it('never lets read-only mutate a session', () => {
    for (const action of ['call.accept', 'call.delegate', 'call.takeover', 'call.reassign', 'call.release'] as const) {
      expect(canPerform('read-only', action)).toBe(false)
    }
  })

  it('reserves reassignment for admin and dispatcher', () => {
    expect(canPerform('admin', 'call.reassign')).toBe(true)
    expect(canPerform('dispatcher', 'call.reassign')).toBe(true)
    expect(canPerform('customer-care', 'call.reassign')).toBe(false)
  })

  it('lets customer-care accept, delegate and take over a call', () => {
    expect(canPerform('customer-care', 'call.accept')).toBe(true)
    expect(canPerform('customer-care', 'call.delegate')).toBe(true)
    expect(canPerform('customer-care', 'call.takeover')).toBe(true)
  })

  it('throws a stable FORBIDDEN error for a denied action', () => {
    expect(() => requirePermission(actor('read-only'), 'call.accept')).toThrow('FORBIDDEN')
    expect(() => requirePermission(actor('dispatcher'), 'call.accept')).not.toThrow()
  })

  it('reports the permitted actions so the UI hides what the server would reject', () => {
    expect(listPermittedActions('read-only')).toEqual(['operations.view', 'audit.view'])
    expect(listPermittedActions('admin')).toContain('call.reassign')
  })
})
