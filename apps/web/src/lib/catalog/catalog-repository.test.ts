import type { CatalogDraft, OperatorActor } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import { createCatalogMemoryStore, createCatalogRepository } from './catalog-repository'

const admin: OperatorActor = { id: 'admin-1', role: 'admin', demo: false }
const now = '2026-07-18T10:00:00.000Z'

function validCatalogDraft(): CatalogDraft {
  return {
    id: 'catalog-v1',
    version: 1,
    revision: 0,
    status: 'draft',
    effectiveFrom: '2026-07-20T00:00:00.000Z',
    branches: [{ id: 'branch-sg', name: 'Sài Gòn' }],
    stops: [{ id: 'stop-sg', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' }],
    routes: [{ id: 'route-sg-dl', origin: 'Sài Gòn', destination: 'Đà Lạt', stopIds: ['stop-sg'] }],
    vehicleTemplates: [{
      id: 'tpl-34',
      name: 'Giường nằm 34',
      floors: 1,
      seats: [{ code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat' }],
    }],
    vehicles: [{ id: 'vehicle-1', label: '51B-123.45', templateId: 'tpl-34', active: true }],
    fares: [{ id: 'fare-1', routeId: 'route-sg-dl', priceVnd: 320000 }],
    trips: [{
      id: 'trip-1',
      routeId: 'route-sg-dl',
      vehicleId: 'vehicle-1',
      departureAt: '2026-07-20T15:00:00.000Z',
      arrivalAt: '2026-07-20T22:30:00.000Z',
      fareId: 'fare-1',
    }],
  }
}

describe('catalog repository', () => {
  it('publishes once and rejects a stale revision', async () => {
    const repository = createCatalogRepository({}, { memory: createCatalogMemoryStore() })
    const draft = await repository.createDraft(validCatalogDraft(), admin)
    const published = await repository.publish(draft.id, draft.revision, admin, now)

    expect(published.status).toBe('published')
    await expect(repository.publish(draft.id, draft.revision, admin, now))
      .rejects.toThrow('CATALOG_VERSION_CONFLICT')
  })

  it('deep-clones reads and increments draft revisions', async () => {
    const repository = createCatalogRepository({}, { memory: createCatalogMemoryStore() })
    const created = await repository.createDraft(validCatalogDraft(), admin)
    const read = await repository.getVersion(created.id)
    read!.branches[0]!.name = 'Mutated outside repository'

    const saved = await repository.saveDraft({
      ...validCatalogDraft(),
      branches: [{ id: 'branch-sg', name: 'Chi nhánh Sài Gòn' }],
    }, created.revision, admin)

    expect(saved.revision).toBe(1)
    expect((await repository.getVersion(created.id))?.branches[0]?.name).toBe('Chi nhánh Sài Gòn')
  })

  it('validates a draft without publishing it', async () => {
    const repository = createCatalogRepository({}, { memory: createCatalogMemoryStore() })
    const created = await repository.createDraft(validCatalogDraft(), admin)
    const result = await repository.validate(created.id, created.revision, admin)

    expect(result.issues).toEqual([])
    expect(result.version).toMatchObject({ status: 'validated', revision: 1 })
    expect(await repository.getPublished(now)).toBeNull()
  })
})
