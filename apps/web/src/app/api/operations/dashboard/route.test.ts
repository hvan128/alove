import { describe, expect, it } from 'vitest'
import { createOperationsRepository, seededOperations } from '@/lib/operations/operations-repository'
import { getOperationsDashboard } from './route'

describe('operations dashboard API', () => {
  it('requires an operator and prevents response caching', async () => {
    const response = await getOperationsDashboard({
      getActor: () => ({ id: 'staff-1', role: 'customer-care', demo: false }),
      getRepository: () => createOperationsRepository({}, seededOperations()),
      now: () => '2026-07-18T10:00:00.000Z',
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ mode: 'memory', metrics: { queuedCalls: 4 } })
  })

  it('fails closed when operator auth is not configured', async () => {
    const response = await getOperationsDashboard({
      getActor: () => { throw new Error('OPERATOR_AUTH_UNCONFIGURED') },
      getRepository: () => createOperationsRepository({}, seededOperations()),
      now: () => '2026-07-18T10:00:00.000Z',
    })

    expect(response.status).toBe(503)
  })
})
