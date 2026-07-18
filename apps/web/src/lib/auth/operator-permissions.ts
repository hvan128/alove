import type { OperatorActor, OperatorRole } from '@ordervoice/contracts'

export type OperationsAction =
  | 'operations.view'
  | 'audit.view'
  | 'call.accept'
  | 'call.delegate'
  | 'call.takeover'
  | 'call.release'
  | 'call.reassign'

// Server-side policy for the operations surface, per the approved design §9.
// Hiding navigation is not authorization — every command route re-checks here.
const PERMISSIONS: Record<OperatorRole, readonly OperationsAction[]> = {
  admin: ['operations.view', 'audit.view', 'call.accept', 'call.delegate', 'call.takeover', 'call.release', 'call.reassign'],
  dispatcher: ['operations.view', 'audit.view', 'call.accept', 'call.delegate', 'call.takeover', 'call.release', 'call.reassign'],
  'customer-care': ['operations.view', 'audit.view', 'call.accept', 'call.delegate', 'call.takeover', 'call.release'],
  'read-only': ['operations.view', 'audit.view'],
}

export function canPerform(role: OperatorRole, action: OperationsAction): boolean {
  return PERMISSIONS[role].includes(action)
}

export function requirePermission(actor: OperatorActor, action: OperationsAction): void {
  if (!canPerform(actor.role, action)) throw new Error('FORBIDDEN')
}

export function listPermittedActions(role: OperatorRole): OperationsAction[] {
  return [...PERMISSIONS[role]]
}
