import type { CatalogDraft, OperatorActor } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import { validCatalogDraft } from './catalog-fixture'
import { createCatalogMemoryStore, createCatalogRepository } from './catalog-repository'

const admin: OperatorActor = { id: 'admin-1', role: 'admin', demo: false }
const now = '2026-07-18T10:00:00.000Z'


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
