import type {
  OperationsAuditEvent,
  OperationsEventType,
  OperatorActor,
  SessionOwnership,
} from '@ordervoice/contracts'

// Pure ownership rules for a call session. No I/O and no clock: the caller
// supplies `at` and the repository decides how to persist the result, so the
// same rules run identically in the memory demo and against PostgreSQL.
//
// The invariant this module exists to protect: one staff owner at a time, and
// the Agent never holds reply authority without an audited grant from that
// owner (F-01, F-02).

type Transition = { ownership: SessionOwnership; event: OperationsAuditEvent }

type BaseCommand = {
  actor: OperatorActor
  at: string
  /** Ties this transition to the request that caused it for audit correlation. */
  correlationId?: string
}

export function unassignedOwnership(sessionCode: string): SessionOwnership {
  return {
    sessionCode,
    ownerId: null,
    ownerRole: null,
    acceptedAt: null,
    delegation: 'staff',
    delegatedAt: null,
    takeoverReason: null,
    takenOverAt: null,
    ownershipRevision: 0,
  }
}

export function acceptCall(current: SessionOwnership, command: BaseCommand): Transition {
  // Deliberately rejects a re-accept by the current owner too. A silent no-op
  // would hide a double-click race behind a success and leave the dashboard
  // claiming an accept that never moved anything.
  if (current.ownerId !== null) throw new Error('CALL_ALREADY_OWNED')
  return transition(current, command, 'call.accepted', null, {
    ownerId: command.actor.id,
    ownerRole: command.actor.role,
    acceptedAt: command.at,
  })
}

export function reassignCall(
  current: SessionOwnership,
  command: BaseCommand & { to: OperatorActor; reason: string },
): Transition {
  if (current.ownerId === null) throw new Error('CALL_NOT_OWNED')
  return transition(current, command, 'call.reassigned', requireReason(command.reason, 'REASSIGN_REASON_REQUIRED'), {
    ownerId: command.to.id,
    ownerRole: command.to.role,
    acceptedAt: command.at,
  })
}

export function releaseCall(current: SessionOwnership, command: BaseCommand): Transition {
  if (current.ownerId === null) throw new Error('CALL_NOT_OWNED')
  // Releasing returns the session to the queue, so reply authority must fall
  // back to staff — an Agent left speaking on an unowned call has no human
  // able to revoke it.
  return transition(current, command, 'call.released', null, {
    ownerId: null,
    ownerRole: null,
    acceptedAt: null,
    delegation: 'staff',
    delegatedAt: null,
  })
}

export function delegateToAgent(current: SessionOwnership, command: BaseCommand): Transition {
  if (current.ownerId === null) throw new Error('CALL_NOT_OWNED')
  if (current.delegation === 'agent') throw new Error('AGENT_ALREADY_DELEGATED')
  return transition(current, command, 'agent.delegated', null, {
    delegation: 'agent',
    delegatedAt: command.at,
  })
}

export function takeoverFromAgent(
  current: SessionOwnership,
  command: BaseCommand & { reason: string },
): Transition {
  if (current.delegation !== 'agent') throw new Error('AGENT_NOT_DELEGATED')
  const reason = requireReason(command.reason, 'TAKEOVER_REASON_REQUIRED')
  return transition(current, command, 'call.takeover', reason, {
    delegation: 'staff',
    delegatedAt: null,
    takeoverReason: reason,
    takenOverAt: command.at,
  })
}

function requireReason(value: string, code: string): string {
  const reason = value.trim()
  if (!reason) throw new Error(code)
  return reason
}

function transition(
  current: SessionOwnership,
  command: BaseCommand,
  eventType: OperationsEventType,
  reason: string | null,
  patch: Partial<SessionOwnership>,
): Transition {
  const ownership: SessionOwnership = {
    ...current,
    ...patch,
    ownershipRevision: current.ownershipRevision + 1,
  }
  return {
    ownership,
    event: {
      id: `ops-${current.sessionCode}-${ownership.ownershipRevision}`,
      sessionCode: current.sessionCode,
      eventType,
      actorId: command.actor.id,
      actorRole: command.actor.role,
      reason,
      payload: { ownershipRevision: ownership.ownershipRevision },
      correlationId: command.correlationId ?? `ops-${current.sessionCode}-${ownership.ownershipRevision}`,
      occurredAt: command.at,
    },
  }
}
