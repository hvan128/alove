import type { CatalogDraft, OperatorActor } from '@ordervoice/contracts'
import { afterEach, describe, expect, it } from 'vitest'
import { GET } from '@/app/api/catalog/versions/route'
import { createCatalogMemoryStore, createCatalogRepository } from './catalog-repository'
import { publishVersion } from './catalog-http'

const originalDemoMode = process.env.OPERATOR_DEMO_MODE
const admin: OperatorActor = { id: 'admin-1', role: 'admin', demo: false }

afterEach(() => {
  if (originalDemoMode === undefined) delete process.env.OPERATOR_DEMO_MODE
  else process.env.OPERATOR_DEMO_MODE = originalDemoMode
})

function validCatalogDraft(): CatalogDraft {
  return {
    id: 'catalog-v1', version: 1, revision: 0, status: 'draft',
    effectiveFrom: '2026-07-20T00:00:00.000Z',
    branches: [{ id: 'branch-sg', name: 'Sài Gòn' }],
    stops: [{ id: 'stop-sg', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' }],
    routes: [{ id: 'route-sg-dl', origin: 'Sài Gòn', destination: 'Đà Lạt', stopIds: ['stop-sg'] }],
    vehicleTemplates: [{ id: 'tpl-34', name: 'Giường nằm 34', floors: 1, seats: [] }],
    vehicles: [{ id: 'vehicle-1', label: '51B-123.45', templateId: 'tpl-34', active: true }],
    fares: [{ id: 'fare-1', routeId: 'route-sg-dl', priceVnd: 320000 }],
    trips: [{ id: 'trip-1', routeId: 'route-sg-dl', vehicleId: 'vehicle-1', departureAt: '2026-07-20T15:00:00.000Z', arrivalAt: '2026-07-20T22:30:00.000Z', fareId: 'fare-1' }],
  }
}

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
      { getActor: () => admin, getRepository: () => repository },
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'CATALOG_VERSION_CONFLICT' })
  })
})
