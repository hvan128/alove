import { beforeEach, describe, expect, it } from 'vitest'
import { createOwnershipRepository, seededOwnership } from './ownership-repository'

const dispatcher = { id: 'linh', role: 'dispatcher' as const, demo: false }
const care = { id: 'minh', role: 'customer-care' as const, demo: false }
const at = '2026-07-18T10:00:00.000Z'
const later = '2026-07-18T10:05:00.000Z'

let memory: ReturnType<typeof seededOwnership>
const repository = () => createOwnershipRepository({}, memory)

beforeEach(() => {
  memory = seededOwnership()
})

describe('ownership repository', () => {
  it('falls back to memory without DATABASE_URL', () => {
    expect(repository().mode).toBe('memory')
  })

  it('returns an unassigned session for a code it has never seen', async () => {
    expect(await repository().get('NEW123')).toMatchObject({ sessionCode: 'NEW123', ownerId: null, delegation: 'staff' })
  })

  it('persists the owner after an accept', async () => {
    const repo = repository()
    await repo.accept('DEMO42', dispatcher, at)
    expect(await repo.get('DEMO42')).toMatchObject({ ownerId: 'linh', ownerRole: 'dispatcher', acceptedAt: at })
  })

  it('lets exactly one of two concurrent accepts win', async () => {
    const repo = repository()
    const results = await Promise.allSettled([
      repo.accept('DEMO42', dispatcher, at),
      repo.accept('DEMO42', care, at),
    ])
    const won = results.filter((result) => result.status === 'fulfilled')
    const lost = results.filter((result) => result.status === 'rejected')
    expect(won).toHaveLength(1)
    expect(lost).toHaveLength(1)
    expect((lost[0] as PromiseRejectedResult).reason).toHaveProperty('message', 'CALL_ALREADY_OWNED')
    // The stored owner must be whoever actually won, never a blend of both.
    const stored = await repo.get('DEMO42')
    expect([dispatcher.id, care.id]).toContain(stored.ownerId)
  })

  it('appends one audit event per transition', async () => {
    const repo = repository()
    await repo.accept('DEMO42', dispatcher, at)
    await repo.delegate('DEMO42', dispatcher, later)
    await repo.takeover('DEMO42', dispatcher, later, 'Agent hiểu sai điểm đón')
    const trail = await repo.listAudit({ limit: 10 })
    expect(trail.map((event) => event.eventType)).toEqual(['call.takeover', 'agent.delegated', 'call.accepted'])
    expect(trail[0]).toMatchObject({ actorId: 'linh', actorRole: 'dispatcher', reason: 'Agent hiểu sai điểm đón' })
  })

  it('orders the audit trail newest first and honours the limit', async () => {
    const repo = repository()
    await repo.accept('DEMO42', dispatcher, at)
    await repo.accept('TRIP91', care, later)
    const trail = await repo.listAudit({ limit: 1 })
    expect(trail).toHaveLength(1)
    expect(trail[0]).toMatchObject({ sessionCode: 'TRIP91', occurredAt: later })
  })

  it('scopes the audit trail to one session when asked', async () => {
    const repo = repository()
    await repo.accept('DEMO42', dispatcher, at)
    await repo.accept('TRIP91', care, later)
    expect(await repo.listAudit({ sessionCode: 'DEMO42' })).toHaveLength(1)
  })

  it('refuses to take over when the Agent never held authority', async () => {
    const repo = repository()
    await repo.accept('DEMO42', dispatcher, at)
    await expect(repo.takeover('DEMO42', dispatcher, later, 'x')).rejects.toThrow('AGENT_NOT_DELEGATED')
  })

  it('releases a session back to the queue', async () => {
    const repo = repository()
    await repo.accept('DEMO42', dispatcher, at)
    await repo.release('DEMO42', dispatcher, later)
    expect(await repo.get('DEMO42')).toMatchObject({ ownerId: null, delegation: 'staff' })
  })

  it('exposes ownership for many sessions so the dashboard avoids N queries', async () => {
    const repo = repository()
    await repo.accept('DEMO42', dispatcher, at)
    await repo.accept('TRIP91', care, later)
    const map = await repo.getMany(['DEMO42', 'TRIP91', 'NIGHT7'])
    expect(map.get('DEMO42')?.ownerId).toBe('linh')
    expect(map.get('TRIP91')?.ownerId).toBe('minh')
    expect(map.get('NIGHT7')?.ownerId).toBeNull()
  })
})
