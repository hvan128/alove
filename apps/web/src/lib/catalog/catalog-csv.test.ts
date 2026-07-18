import type { CatalogDraft } from '@ordervoice/contracts'
import { describe, expect, it } from 'vitest'
import { applyCatalogCsv, dryRunCatalogCsv } from './catalog-csv'

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

describe('catalog CSV import', () => {
  it('reports row errors and never mutates source draft', () => {
    const draft = validCatalogDraft()
    const result = dryRunCatalogCsv(
      'kind,id,routeId,departureAt,arrivalAt,vehicleId,fareId\ntrip,bad,missing,2026-07-20T22:00:00Z,broken,v1,f1',
      draft,
    )

    expect(result.rows[0]?.errors).toContain('INVALID_ARRIVAL_AT')
    expect(draft.trips).toHaveLength(1)
  })

  it('parses quoted commas and applies only valid rows to a clone', () => {
    const draft = validCatalogDraft()
    const result = dryRunCatalogCsv(
      'kind,id,origin,destination,stopIds\nroute,route-sg-bm,Sài Gòn,"Buôn Ma Thuột, Đắk Lắk",stop-sg',
      draft,
    )
    const applied = applyCatalogCsv(result, draft)

    expect(result).toMatchObject({ validRows: 1, invalidRows: 0 })
    expect(applied.routes[1]?.destination).toBe('Buôn Ma Thuột, Đắk Lắk')
    expect(applied.revision).toBe(draft.revision)
    expect(draft.routes).toHaveLength(1)
  })

  it('rejects unknown headers and duplicate identifiers', () => {
    const result = dryRunCatalogCsv(
      'kind,id,origin,destination,unexpected\nroute,route-sg-dl,Sài Gòn,Đà Lạt,nope',
      validCatalogDraft(),
    )

    expect(result.rows[0]?.errors).toEqual(expect.arrayContaining([
      'UNKNOWN_HEADER:unexpected',
      'DUPLICATE_ID',
    ]))
  })
})
