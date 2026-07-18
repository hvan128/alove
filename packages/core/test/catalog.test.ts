import { describe, expect, it } from 'vitest'
import {
  forkCatalogVersion,
  publishCatalogDraft,
  retireCatalogVersion,
  validateCatalogDraft,
} from '../src/catalog.js'
import { validCatalogDraft } from './fixtures/catalog.js'

const admin = { id: 'admin-1', role: 'admin' as const, demo: false }

describe('catalog rules', () => {
  it('rejects duplicate seat codes and broken references', () => {
    const draft = validCatalogDraft({
      vehicleTemplates: [{
        ...validCatalogDraft().vehicleTemplates[0]!,
        seats: [
          { code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat' },
          { code: 'A01', floor: 1, row: 1, column: 2, kind: 'seat' },
        ],
      }],
      trips: [{ ...validCatalogDraft().trips[0]!, vehicleId: 'missing' }],
    })

    const codes = validateCatalogDraft(draft).map((issue) => issue.code)
    expect(codes).toContain('DUPLICATE_SEAT_CODE')
    expect(codes).toContain('BROKEN_TRIP_REFERENCE')
  })

  it('publishes a snapshot only for admin', () => {
    const result = publishCatalogDraft(validCatalogDraft(), admin, '2026-07-18T10:00:00.000Z')

    expect(result.status).toBe('published')
    expect(result.publishedBy).toBe('admin-1')
    expect(() => publishCatalogDraft(
      validCatalogDraft(),
      { id: 'dispatcher-1', role: 'dispatcher', demo: false },
      '2026-07-18T10:00:00.000Z',
    )).toThrow('FORBIDDEN')
  })

  it('forks a published version as a fresh draft', () => {
    const published = publishCatalogDraft(validCatalogDraft(), admin, '2026-07-18T10:00:00.000Z')

    expect(forkCatalogVersion(published, 'catalog-v2')).toMatchObject({
      id: 'catalog-v2',
      version: 2,
      revision: 0,
      status: 'draft',
    })
  })

  it('retires only a published version as admin', () => {
    const published = publishCatalogDraft(validCatalogDraft(), admin, '2026-07-18T10:00:00.000Z')

    expect(retireCatalogVersion(published, admin)).toMatchObject({ status: 'retired', revision: 1 })
    expect(() => retireCatalogVersion({ ...published, status: 'retired' }, admin)).toThrow('CATALOG_STATE_CONFLICT')
  })
})
