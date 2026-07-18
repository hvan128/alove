import { describe, expect, it } from 'vitest'
import {
  operationsAuditEventSchema,
  operationsEventTypeSchema,
  sessionDelegationSchema,
  sessionOwnershipSchema,
} from '../src/operations'

describe('operations contracts', () => {
  it('models delegation as who currently holds reply authority', () => {
    expect(sessionDelegationSchema.options).toEqual(['staff', 'agent'])
  })

  it('covers every ownership and delegation transition in the audit vocabulary', () => {
    expect(operationsEventTypeSchema.options).toEqual([
      'call.accepted',
      'call.reassigned',
      'call.released',
      'agent.delegated',
      'call.takeover',
    ])
  })

  it('accepts an unassigned session', () => {
    const ownership = sessionOwnershipSchema.parse({
      sessionCode: 'DEMO42',
      ownerId: null,
      ownerRole: null,
      acceptedAt: null,
      delegation: 'staff',
      delegatedAt: null,
      takeoverReason: null,
      takenOverAt: null,
      ownershipRevision: 0,
    })
    expect(ownership.ownerId).toBeNull()
    expect(ownership.delegation).toBe('staff')
  })

  it('rejects an owner role without an owner id', () => {
    expect(() => sessionOwnershipSchema.parse({
      sessionCode: 'DEMO42',
      ownerId: null,
      ownerRole: 'dispatcher',
      acceptedAt: null,
      delegation: 'staff',
      delegatedAt: null,
      takeoverReason: null,
      takenOverAt: null,
      ownershipRevision: 0,
    })).toThrow()
  })

  it('requires a non-empty reason on an audited takeover', () => {
    const base = {
      id: 'audit-1',
      sessionCode: 'DEMO42',
      eventType: 'call.takeover' as const,
      actorId: 'linh',
      actorRole: 'dispatcher' as const,
      payload: {},
      correlationId: 'corr-1',
      occurredAt: '2026-07-18T10:00:00.000Z',
    }
    expect(() => operationsAuditEventSchema.parse({ ...base, reason: '   ' })).toThrow()
    expect(operationsAuditEventSchema.parse({ ...base, reason: 'Khách yêu cầu gặp người thật' }).reason)
      .toBe('Khách yêu cầu gặp người thật')
  })

  it('allows a null reason for events that do not need one', () => {
    expect(operationsAuditEventSchema.parse({
      id: 'audit-2',
      sessionCode: 'DEMO42',
      eventType: 'call.accepted',
      actorId: 'linh',
      actorRole: 'dispatcher',
      reason: null,
      payload: {},
      correlationId: 'corr-2',
      occurredAt: '2026-07-18T10:00:00.000Z',
    }).reason).toBeNull()
  })
})
