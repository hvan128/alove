import type { OperatorActor } from '@ordervoice/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { validCatalogDraft } from './catalog-fixture'
import { GET } from '@/app/api/catalog/versions/route'
import { createCatalogMemoryStore, createCatalogRepository } from './catalog-repository'
import { getSyncStatus, publishVersion, triggerSync } from './catalog-http'

const originalDemoMode = process.env.OPERATOR_DEMO_MODE
const admin: OperatorActor = { id: 'admin-1', role: 'admin', demo: false }

afterEach(() => {
  if (originalDemoMode === undefined) delete process.env.OPERATOR_DEMO_MODE
  else process.env.OPERATOR_DEMO_MODE = originalDemoMode
})


describe('catalog HTTP boundary', () => {
  it('returns 503 when operator auth is not configured', async () => {
    delete process.env.OPERATOR_DEMO_MODE
    const response = await GET(new Request('http://test/api/catalog/versions'))

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ error: 'OPERATOR_AUTH_UNCONFIGURED' })
  })

  it('maps stale publish to 409', async () => {
    const repository = createCatalogRepository({}, { memory: createCatalogMemoryStore() })
    const draft = await repository.createDraft(validCatalogDraft(), admin)
    await repository.publish(draft.id, draft.revision, admin, '2026-07-18T10:00:00.000Z')

    const response = await publishVersion(
      new Request('http://test/api/catalog/versions/catalog-v1/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: 0 }),
      }),
      { params: Promise.resolve({ versionId: 'catalog-v1' }) },
      { getActor: () => admin, getRepository: () => repository, getEnv: () => ({}) },
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'CATALOG_VERSION_CONFLICT' })
  })

  it('refuses live sync as 503 until a contract and reconciliation exist', async () => {
    const response = await triggerSync(
      new Request('http://test/api/catalog/sync', { method: 'POST' }),
      { getActor: () => admin, getRepository: () => repository(), getEnv: () => ({}) },
    )

    expect(response.status).toBe(503)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'LIVE_SYNC_NOT_CONTRACTED' })
  })

  it('reports contracted sync as unavailable rather than pretending it ran', async () => {
    const response = await triggerSync(
      new Request('http://test/api/catalog/sync', { method: 'POST' }),
      {
        getActor: () => admin,
        getRepository: () => repository(),
        getEnv: () => ({
          CATALOG_LIVE_SYNC_CONTRACT_ID: 'operator-x-v1',
          CATALOG_LIVE_SYNC_RECONCILIATION_PASSED: 'true',
        }),
      },
    )

    expect(response.status).toBe(501)
    expect(await response.json()).toEqual({ error: 'LIVE_SYNC_ADAPTER_UNAVAILABLE' })
  })

  it('forbids a dispatcher from triggering sync', async () => {
    const response = await triggerSync(
      new Request('http://test/api/catalog/sync', { method: 'POST' }),
      {
        getActor: () => ({ id: 'dispatcher-1', role: 'dispatcher', demo: false }),
        getRepository: () => repository(),
        getEnv: () => ({
          CATALOG_LIVE_SYNC_CONTRACT_ID: 'operator-x-v1',
          CATALOG_LIVE_SYNC_RECONCILIATION_PASSED: 'true',
        }),
      },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({ error: 'FORBIDDEN' })
  })

  it('exposes read-only sync status without enabling anything', async () => {
    const response = await getSyncStatus(
      new Request('http://test/api/catalog/sync'),
      {
        getActor: () => ({ id: 'viewer-1', role: 'read-only', demo: false }),
        getRepository: () => repository(),
        getEnv: () => ({ CATALOG_LIVE_SYNC_CONTRACT_ID: 'operator-x-v1' }),
      },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ enabled: false, reason: 'RECONCILIATION_NOT_PASSED' })
  })
})

function repository() {
  return createCatalogRepository({}, { memory: createCatalogMemoryStore() })
}
