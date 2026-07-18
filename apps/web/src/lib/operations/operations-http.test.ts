import type { OperatorActor } from '@ordervoice/contracts'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  acceptCallRequest,
  delegateCallRequest,
  listAuditRequest,
  reassignCallRequest,
  releaseCallRequest,
  takeoverCallRequest,
} from './operations-http'
import { createOwnershipRepository, seededOwnership } from './ownership-repository'

const dispatcher: OperatorActor = { id: 'linh', role: 'dispatcher', demo: false }
const care: OperatorActor = { id: 'minh', role: 'customer-care', demo: false }
const reader: OperatorActor = { id: 'quan', role: 'read-only', demo: false }

let memory: ReturnType<typeof seededOwnership>
let repository: ReturnType<typeof createOwnershipRepository>

const deps = (actor: OperatorActor) => ({
  getActor: () => actor,
  getRepository: () => repository,
  now: () => '2026-07-18T10:00:00.000Z',
})

const context = (sessionCode: string) => ({ params: Promise.resolve({ sessionCode }) })
const post = (body: unknown) => new Request('http://localhost/x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  memory = seededOwnership()
  repository = createOwnershipRepository({}, memory)
})

describe('operations command HTTP boundary', () => {
  it('accepts a call and returns the stored owner', async () => {
    const response = await acceptCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ ownerId: 'linh', ownerRole: 'dispatcher' })
  })

  it('refuses every mutation for a read-only operator', async () => {
    for (const call of [
      () => acceptCallRequest(post({}), context('DEMO42'), deps(reader)),
      () => delegateCallRequest(post({}), context('DEMO42'), deps(reader)),
      () => takeoverCallRequest(post({ reason: 'x' }), context('DEMO42'), deps(reader)),
      () => releaseCallRequest(post({}), context('DEMO42'), deps(reader)),
      () => reassignCallRequest(post({ toId: 'minh', toRole: 'customer-care', reason: 'x' }), context('DEMO42'), deps(reader)),
    ]) {
      const response = await call()
      expect(response.status).toBe(403)
      expect(await response.json()).toMatchObject({ error: 'FORBIDDEN' })
    }
  })

  it('lets a read-only operator read the audit trail', async () => {
    await acceptCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    const response = await listAuditRequest(new Request('http://localhost/audit'), deps(reader))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ events: [{ eventType: 'call.accepted' }] })
  })

  it('reserves reassignment for dispatcher and admin', async () => {
    await acceptCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    const response = await reassignCallRequest(
      post({ toId: 'minh', toRole: 'customer-care', reason: 'Đổi ca' }),
      context('DEMO42'),
      deps(care),
    )
    expect(response.status).toBe(403)
  })

  it('maps a lost accept race to 409 rather than a silent success', async () => {
    await acceptCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    const response = await acceptCallRequest(post({}), context('DEMO42'), deps(care))
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ error: 'CALL_ALREADY_OWNED' })
  })

  it('rejects a takeover with no reason as 422 so the dashboard always has one to show', async () => {
    await acceptCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    await delegateCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    const response = await takeoverCallRequest(post({ reason: '   ' }), context('DEMO42'), deps(dispatcher))
    expect(response.status).toBe(422)
    expect(await response.json()).toMatchObject({ error: 'TAKEOVER_REASON_REQUIRED' })
  })

  it('records the takeover reason on a valid takeover', async () => {
    await acceptCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    await delegateCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    const response = await takeoverCallRequest(
      post({ reason: 'Agent hiểu sai điểm đón' }),
      context('DEMO42'),
      deps(dispatcher),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ delegation: 'staff', takeoverReason: 'Agent hiểu sai điểm đón' })
  })

  it('fails closed when operator auth is not configured', async () => {
    const response = await acceptCallRequest(post({}), context('DEMO42'), {
      ...deps(dispatcher),
      getActor: () => { throw new Error('OPERATOR_AUTH_UNCONFIGURED') },
    })
    expect(response.status).toBe(503)
  })

  it('rejects a malformed session code before touching the repository', async () => {
    const response = await acceptCallRequest(post({}), context('no'), deps(dispatcher))
    expect(response.status).toBe(400)
    expect(memory.audit).toHaveLength(0)
  })

  it('scopes the audit trail by session when asked', async () => {
    await acceptCallRequest(post({}), context('DEMO42'), deps(dispatcher))
    await acceptCallRequest(post({}), context('TRIP91'), deps(care))
    const response = await listAuditRequest(
      new Request('http://localhost/audit?session=DEMO42'),
      deps(dispatcher),
    )
    const body = await response.json()
    expect(body.events).toHaveLength(1)
    expect(body.events[0]).toMatchObject({ sessionCode: 'DEMO42' })
  })
})
