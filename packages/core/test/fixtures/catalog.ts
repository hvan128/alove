import type { CatalogDraft } from '@ordervoice/contracts'

const base: CatalogDraft = {
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

export function validCatalogDraft(overrides: Partial<CatalogDraft> = {}): CatalogDraft {
  return structuredClone({ ...base, ...overrides })
}
