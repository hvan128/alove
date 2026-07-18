import type { CatalogDraft } from '@ordervoice/contracts'

/**
 * Reference draft shared by the catalog tests. Mirrors `packages/core/test/fixtures/catalog.ts`
 * so a contract change breaks both layers together instead of silently diverging.
 */
const base: CatalogDraft = {
  id: 'catalog-v1',
  version: 1,
  revision: 0,
  status: 'draft',
  effectiveFrom: '2026-07-20T00:00:00.000Z',
  branches: [{ id: 'branch-sg', name: 'Sài Gòn' }],
  stops: [
    { id: 'stop-sg', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' },
    { id: 'stop-dl', name: 'Bến xe liên tỉnh Đà Lạt', branchId: 'branch-sg' },
  ],
  routes: [{
    id: 'route-sg-dl',
    origin: 'Sài Gòn',
    destination: 'Đà Lạt',
    stops: [
      { stopId: 'stop-sg', role: 'pickup', sequence: 0, offsetMinutes: 0 },
      { stopId: 'stop-dl', role: 'dropoff', sequence: 1, offsetMinutes: 450 },
    ],
  }],
  seatClasses: [{ id: 'class-bed', name: 'Giường nằm', priceMultiplierBps: 10_000 }],
  vehicleTemplates: [{
    id: 'tpl-34',
    name: 'Giường nằm 34',
    floors: 1,
    seats: [{ code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat', seatClassId: 'class-bed' }],
  }],
  vehicles: [{ id: 'vehicle-1', label: '51B-123.45', templateId: 'tpl-34', active: true }],
  fares: [{
    id: 'fare-1',
    routeId: 'route-sg-dl',
    priceVnd: 320_000,
    seatClassId: null,
    effectiveFrom: null,
    effectiveTo: null,
  }],
  schedules: [],
  trips: [{
    id: 'trip-1',
    routeId: 'route-sg-dl',
    vehicleId: 'vehicle-1',
    departureAt: '2026-07-20T15:00:00.000Z',
    arrivalAt: '2026-07-20T22:30:00.000Z',
    fareId: 'fare-1',
    declaredCapacity: null,
    scheduleId: null,
  }],
}

export function validCatalogDraft(overrides: Partial<CatalogDraft> = {}): CatalogDraft {
  return structuredClone({ ...base, ...overrides })
}
