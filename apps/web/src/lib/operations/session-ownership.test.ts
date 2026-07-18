import type { SessionOwnership } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import {
  acceptCall,
  delegateToAgent,
  reassignCall,
  releaseCall,
  takeoverFromAgent,
  unassignedOwnership,
} from './session-ownership'

const dispatcher = { id: 'linh', role: 'dispatcher' as const, demo: false }
const care = { id: 'minh', role: 'customer-care' as const, demo: false }
const at = '2026-07-18T10:00:00.000Z'
const later = '2026-07-18T10:05:00.000Z'

const owned = (): SessionOwnership => acceptCall(unassignedOwnership('DEMO42'), { actor: dispatcher, at }).ownership

describe('session ownership state machine', () => {
  it('starts unassigned with staff holding reply authority', () => {
    const state = unassignedOwnership('DEMO42')
    expect(state).toMatchObject({ ownerId: null, ownerRole: null, delegation: 'staff', ownershipRevision: 0 })
  })

  it('records the accepting actor and emits one audit event', () => {
    const { ownership, event } = acceptCall(unassignedOwnership('DEMO42'), { actor: dispatcher, at })
    expect(ownership).toMatchObject({ ownerId: 'linh', ownerRole: 'dispatcher', acceptedAt: at, ownershipRevision: 1 })
    expect(event).toMatchObject({ eventType: 'call.accepted', actorId: 'linh', sessionCode: 'DEMO42', reason: null })
  })

  it('refuses a second accept so only one staff owns a session', () => {
    expect(() => acceptCall(owned(), { actor: care, at: later })).toThrow('CALL_ALREADY_OWNED')
  })

  it('treats re-accepting by the same owner as already owned rather than a silent no-op', () => {
    expect(() => acceptCall(owned(), { actor: dispatcher, at: later })).toThrow('CALL_ALREADY_OWNED')
  })

  it('reassigns an owned call to a new owner and keeps a reason', () => {
    const { ownership, event } = reassignCall(owned(), { actor: dispatcher, to: care, at: later, reason: 'Đổi ca trực' })
    expect(ownership).toMatchObject({ ownerId: 'minh', ownerRole: 'customer-care', ownershipRevision: 2 })
    expect(event).toMatchObject({ eventType: 'call.reassigned', reason: 'Đổi ca trực' })
  })

  it('refuses to reassign a call nobody owns', () => {
    expect(() => reassignCall(unassignedOwnership('DEMO42'), { actor: dispatcher, to: care, at, reason: 'x' }))
      .toThrow('CALL_NOT_OWNED')
  })

  it('releases a call back to the queue and returns authority to staff', () => {
    const delegated = delegateToAgent(owned(), { actor: dispatcher, at: later }).ownership
    const { ownership, event } = releaseCall(delegated, { actor: dispatcher, at: later })
    expect(ownership).toMatchObject({ ownerId: null, ownerRole: null, acceptedAt: null, delegation: 'staff' })
    expect(event.eventType).toBe('call.released')
  })

  it('delegates reply authority to the Agent only after a staff owns the call', () => {
    const { ownership, event } = delegateToAgent(owned(), { actor: dispatcher, at: later })
    expect(ownership).toMatchObject({ delegation: 'agent', delegatedAt: later, ownershipRevision: 2 })
    expect(event.eventType).toBe('agent.delegated')
    expect(() => delegateToAgent(unassignedOwnership('DEMO42'), { actor: dispatcher, at })).toThrow('CALL_NOT_OWNED')
  })

  it('keeps the owner when authority moves to the Agent', () => {
    expect(delegateToAgent(owned(), { actor: dispatcher, at: later }).ownership.ownerId).toBe('linh')
  })

  it('requires a reason to take authority back from the Agent', () => {
    const delegated = delegateToAgent(owned(), { actor: dispatcher, at: later }).ownership
    expect(() => takeoverFromAgent(delegated, { actor: dispatcher, at: later, reason: '  ' }))
      .toThrow('TAKEOVER_REASON_REQUIRED')
  })

  it('stores the takeover reason and returns authority to staff', () => {
    const delegated = delegateToAgent(owned(), { actor: dispatcher, at: later }).ownership
    const { ownership, event } = takeoverFromAgent(delegated, {
      actor: dispatcher,
      at: later,
      reason: 'Agent hiểu sai điểm đón',
    })
    expect(ownership).toMatchObject({
      delegation: 'staff',
      takeoverReason: 'Agent hiểu sai điểm đón',
      takenOverAt: later,
    })
    expect(event).toMatchObject({ eventType: 'call.takeover', reason: 'Agent hiểu sai điểm đón' })
  })

  it('refuses a takeover when the Agent does not hold authority', () => {
    expect(() => takeoverFromAgent(owned(), { actor: dispatcher, at: later, reason: 'x' }))
      .toThrow('AGENT_NOT_DELEGATED')
  })

  it('never mutates the state it was given', () => {
    const before = owned()
    const snapshot = structuredClone(before)
    delegateToAgent(before, { actor: dispatcher, at: later })
    expect(before).toEqual(snapshot)
  })
})
