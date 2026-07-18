import { z } from 'zod'
import { operatorRoleSchema } from './catalog'

/**
 * Who currently holds reply authority on a session. Staff is the default and
 * the safe state: the Agent only speaks after an explicit delegation (F-02).
 * This is distinct from `callModeSchema`, which describes the transport-level
 * human/auto toggle rather than an audited grant of authority.
 */
export const sessionDelegationSchema = z.enum(['staff', 'agent'])

/** Every ownership or delegation transition that must leave an audit trace. */
export const operationsEventTypeSchema = z.enum([
  'call.accepted',
  'call.reassigned',
  'call.released',
  'agent.delegated',
  'call.takeover',
])

const reasonSchema = z.string().trim().min(1)

export const sessionOwnershipSchema = z.object({
  sessionCode: z.string().min(1),
  ownerId: z.string().min(1).nullable(),
  ownerRole: operatorRoleSchema.nullable(),
  acceptedAt: z.string().datetime().nullable(),
  delegation: sessionDelegationSchema,
  delegatedAt: z.string().datetime().nullable(),
  takeoverReason: z.string().min(1).nullable(),
  takenOverAt: z.string().datetime().nullable(),
  ownershipRevision: z.number().int().nonnegative(),
}).strict().superRefine((ownership, context) => {
  // Owner id and role move together; a role without an id would let the read
  // model render an owner the server cannot actually name.
  if ((ownership.ownerId === null) !== (ownership.ownerRole === null)) {
    context.addIssue({
      code: 'custom',
      path: ['ownerRole'],
      message: 'Owner id and owner role must be set together.',
    })
  }
  if (ownership.ownerId === null && ownership.delegation === 'agent') {
    context.addIssue({
      code: 'custom',
      path: ['delegation'],
      message: 'An unowned session cannot delegate reply authority to the Agent.',
    })
  }
})

export const operationsAuditEventSchema = z.object({
  id: z.string().min(1),
  sessionCode: z.string().min(1),
  eventType: operationsEventTypeSchema,
  actorId: z.string().min(1),
  actorRole: operatorRoleSchema,
  /** Required for takeover and reassignment; null where the action speaks for itself. */
  reason: reasonSchema.nullable(),
  payload: z.record(z.string(), z.unknown()).default({}),
  correlationId: z.string().min(1),
  occurredAt: z.string().datetime(),
}).strict().superRefine((event, context) => {
  if (event.eventType === 'call.takeover' && !event.reason) {
    context.addIssue({
      code: 'custom',
      path: ['reason'],
      message: 'A takeover must record why authority was pulled back.',
    })
  }
})

export type SessionDelegation = z.infer<typeof sessionDelegationSchema>
export type OperationsEventType = z.infer<typeof operationsEventTypeSchema>
export type SessionOwnership = z.infer<typeof sessionOwnershipSchema>
export type OperationsAuditEvent = z.infer<typeof operationsAuditEventSchema>
