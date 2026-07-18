import type { OperationsAuditEvent, OperatorActor, SessionOwnership } from '@ordervoice/contracts'
import { busCalls, getDb, operationsAuditEvents } from '@ordervoice/db'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import {
  acceptCall,
  delegateToAgent,
  reassignCall,
  releaseCall,
  takeoverFromAgent,
  unassignedOwnership,
} from './session-ownership'

export type AuditQuery = { sessionCode?: string; limit?: number }

export type OwnershipRepository = {
  mode: 'memory' | 'neon'
  get(sessionCode: string): Promise<SessionOwnership>
  getMany(sessionCodes: string[]): Promise<Map<string, SessionOwnership>>
  accept(sessionCode: string, actor: OperatorActor, at: string): Promise<SessionOwnership>
  reassign(sessionCode: string, actor: OperatorActor, to: OperatorActor, at: string, reason: string): Promise<SessionOwnership>
  release(sessionCode: string, actor: OperatorActor, at: string): Promise<SessionOwnership>
  delegate(sessionCode: string, actor: OperatorActor, at: string): Promise<SessionOwnership>
  takeover(sessionCode: string, actor: OperatorActor, at: string, reason: string): Promise<SessionOwnership>
  listAudit(query?: AuditQuery): Promise<OperationsAuditEvent[]>
}

export type OwnershipMemoryState = {
  ownership: Map<string, SessionOwnership>
  audit: OperationsAuditEvent[]
}

export function seededOwnership(): OwnershipMemoryState {
  return { ownership: new Map(), audit: [] }
}

// Pinned to globalThis rather than a module constant: the dashboard reads this
// store from a server component while the command routes write to it from route
// handlers, and Next.js compiles those into separate module instances in dev.
// A plain module-level store would give each side its own copy, so an accepted
// call would never show an owner on the page that triggered it.
const globalStore = globalThis as typeof globalThis & { __vediOwnershipMemory?: OwnershipMemoryState }
const sharedMemory: OwnershipMemoryState = globalStore.__vediOwnershipMemory ??= seededOwnership()

const DEFAULT_AUDIT_LIMIT = 20

export function createOwnershipRepository(
  environment: Record<string, string | undefined> = process.env,
  memory: OwnershipMemoryState = sharedMemory,
): OwnershipRepository {
  return environment.DATABASE_URL?.trim()
    ? createNeonOwnershipRepository()
    : createMemoryOwnershipRepository(memory)
}

function createMemoryOwnershipRepository(memory: OwnershipMemoryState): OwnershipRepository {
  const read = (sessionCode: string) => memory.ownership.get(sessionCode) ?? unassignedOwnership(sessionCode)

  const commit = (ownership: SessionOwnership, event: OperationsAuditEvent) => {
    memory.ownership.set(ownership.sessionCode, ownership)
    memory.audit.push(event)
    return structuredClone(ownership)
  }

  return {
    mode: 'memory',
    async get(sessionCode) {
      return structuredClone(read(sessionCode))
    },
    async getMany(sessionCodes) {
      return new Map(sessionCodes.map((code) => [code, structuredClone(read(code))]))
    },
    async accept(sessionCode, actor, at) {
      const { ownership, event } = acceptCall(read(sessionCode), { actor, at })
      return commit(ownership, event)
    },
    async reassign(sessionCode, actor, to, at, reason) {
      const { ownership, event } = reassignCall(read(sessionCode), { actor, to, at, reason })
      return commit(ownership, event)
    },
    async release(sessionCode, actor, at) {
      const { ownership, event } = releaseCall(read(sessionCode), { actor, at })
      return commit(ownership, event)
    },
    async delegate(sessionCode, actor, at) {
      const { ownership, event } = delegateToAgent(read(sessionCode), { actor, at })
      return commit(ownership, event)
    },
    async takeover(sessionCode, actor, at, reason) {
      const { ownership, event } = takeoverFromAgent(read(sessionCode), { actor, at, reason })
      return commit(ownership, event)
    },
    async listAudit(query = {}) {
      return memory.audit
        .filter((event) => !query.sessionCode || event.sessionCode === query.sessionCode)
        .slice()
        .sort(compareAuditNewestFirst)
        .slice(0, query.limit ?? DEFAULT_AUDIT_LIMIT)
        .map((event) => structuredClone(event))
    },
  }
}

function createNeonOwnershipRepository(): OwnershipRepository {
  const database = getDb()

  const read = async (sessionCode: string): Promise<SessionOwnership> => {
    const [row] = await database.select().from(busCalls).where(eq(busCalls.id, sessionCode)).limit(1)
    return row ? toOwnership(row) : unassignedOwnership(sessionCode)
  }

  const write = async (ownership: SessionOwnership, event: OperationsAuditEvent): Promise<SessionOwnership> => {
    await database.update(busCalls).set(toRow(ownership)).where(eq(busCalls.id, ownership.sessionCode))
    await appendAudit(event)
    return ownership
  }

  const appendAudit = async (event: OperationsAuditEvent) => {
    await database.insert(operationsAuditEvents).values({
      id: event.id,
      sessionCode: event.sessionCode,
      eventType: event.eventType,
      actorId: event.actorId,
      actorRole: event.actorRole,
      reason: event.reason,
      payload: event.payload,
      correlationId: event.correlationId,
      createdAt: new Date(event.occurredAt),
    }).onConflictDoNothing()
  }

  return {
    mode: 'neon',
    get: read,
    async getMany(sessionCodes) {
      if (sessionCodes.length === 0) return new Map()
      const rows = await database.select().from(busCalls).where(inArray(busCalls.id, sessionCodes))
      const found = new Map(rows.map((row) => [row.id, toOwnership(row)]))
      return new Map(sessionCodes.map((code) => [code, found.get(code) ?? unassignedOwnership(code)]))
    },
    async accept(sessionCode, actor, at) {
      const { ownership, event } = acceptCall(await read(sessionCode), { actor, at })
      // Claiming ownership is the one transition two dispatchers genuinely race
      // for, so the winner is decided by the database rather than by the read
      // above: the guard only matches while the row is still unowned.
      const claimed = await database
        .update(busCalls)
        .set(toRow(ownership))
        .where(and(eq(busCalls.id, sessionCode), isNull(busCalls.ownerId)))
        .returning({ id: busCalls.id })
      if (claimed.length === 0) throw new Error('CALL_ALREADY_OWNED')
      await appendAudit(event)
      return ownership
    },
    async reassign(sessionCode, actor, to, at, reason) {
      const { ownership, event } = reassignCall(await read(sessionCode), { actor, to, at, reason })
      return write(ownership, event)
    },
    async release(sessionCode, actor, at) {
      const { ownership, event } = releaseCall(await read(sessionCode), { actor, at })
      return write(ownership, event)
    },
    async delegate(sessionCode, actor, at) {
      const { ownership, event } = delegateToAgent(await read(sessionCode), { actor, at })
      return write(ownership, event)
    },
    async takeover(sessionCode, actor, at, reason) {
      const { ownership, event } = takeoverFromAgent(await read(sessionCode), { actor, at, reason })
      return write(ownership, event)
    },
    async listAudit(query = {}) {
      const rows = await database
        .select()
        .from(operationsAuditEvents)
        .where(query.sessionCode ? eq(operationsAuditEvents.sessionCode, query.sessionCode) : undefined)
        .orderBy(desc(operationsAuditEvents.createdAt))
        .limit(query.limit ?? DEFAULT_AUDIT_LIMIT)
      return rows.map((row) => ({
        id: row.id,
        sessionCode: row.sessionCode,
        eventType: row.eventType as OperationsAuditEvent['eventType'],
        actorId: row.actorId,
        actorRole: row.actorRole as OperationsAuditEvent['actorRole'],
        reason: row.reason,
        payload: (row.payload ?? {}) as OperationsAuditEvent['payload'],
        correlationId: row.correlationId,
        occurredAt: row.createdAt.toISOString(),
      }))
    },
  }
}

type BusCallRow = typeof busCalls.$inferSelect

function toOwnership(row: BusCallRow): SessionOwnership {
  return {
    sessionCode: row.id,
    ownerId: row.ownerId,
    ownerRole: row.ownerRole as SessionOwnership['ownerRole'],
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    delegation: row.delegation === 'agent' ? 'agent' : 'staff',
    delegatedAt: row.delegatedAt?.toISOString() ?? null,
    takeoverReason: row.takeoverReason,
    takenOverAt: row.takenOverAt?.toISOString() ?? null,
    ownershipRevision: row.ownershipRevision,
  }
}

function toRow(ownership: SessionOwnership) {
  return {
    ownerId: ownership.ownerId,
    ownerRole: ownership.ownerRole,
    acceptedAt: ownership.acceptedAt ? new Date(ownership.acceptedAt) : null,
    delegation: ownership.delegation,
    delegatedAt: ownership.delegatedAt ? new Date(ownership.delegatedAt) : null,
    takeoverReason: ownership.takeoverReason,
    takenOverAt: ownership.takenOverAt ? new Date(ownership.takenOverAt) : null,
    ownershipRevision: ownership.ownershipRevision,
    updatedAt: new Date(),
  }
}

function compareAuditNewestFirst(left: OperationsAuditEvent, right: OperationsAuditEvent): number {
  const byTime = Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
  // Same-millisecond transitions are common in tests and in fast staff actions,
  // so fall back to revision order to keep the trail deterministic.
  return byTime !== 0 ? byTime : revisionOf(right) - revisionOf(left)
}

function revisionOf(event: OperationsAuditEvent): number {
  const revision = event.payload?.ownershipRevision
  return typeof revision === 'number' ? revision : 0
}
