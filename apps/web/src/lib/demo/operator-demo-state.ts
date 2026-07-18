import type { CatalogVersion } from '@ordervoice/contracts'

export const DEMO_TRIP_ID = 'SG-DL-2200'
export const DEMO_SEAT_CODES = [
  ...Array.from({ length: 17 }, (_, index) => `A${String(index + 1).padStart(2, '0')}`),
  ...Array.from({ length: 17 }, (_, index) => `B${String(index + 1).padStart(2, '0')}`),
]

export function createOperatorDemoCatalog(): CatalogVersion {
  return {
    id: 'demo-catalog-v1',
    version: 1,
    revision: 0,
    status: 'draft',
    effectiveFrom: '2026-07-18T00:00:00.000Z',
    publishedAt: null,
    publishedBy: null,
    branches: [
      { id: 'branch-sg', name: 'Văn phòng Sài Gòn' },
      { id: 'branch-dl', name: 'Văn phòng Đà Lạt' },
    ],
    stops: [
      { id: 'stop-mien-dong', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' },
      { id: 'stop-da-lat', name: 'Bến xe liên tỉnh Đà Lạt', branchId: 'branch-dl' },
    ],
    routes: [{
      id: 'route-sg-dl',
      origin: 'Sài Gòn',
      destination: 'Đà Lạt',
      stops: [
        { stopId: 'stop-mien-dong', role: 'pickup', sequence: 0, offsetMinutes: 0 },
        { stopId: 'stop-da-lat', role: 'dropoff', sequence: 1, offsetMinutes: 450 },
      ],
    }],
    seatClasses: [
      { id: 'class-bed-single', name: 'Giường đơn', priceMultiplierBps: 10_000 },
      { id: 'class-bed-vip', name: 'Giường VIP', priceMultiplierBps: 13_000 },
    ],
    vehicleTemplates: [{
      id: 'template-34',
      name: 'Giường nằm 34 chỗ',
      floors: 1,
      seats: DEMO_SEAT_CODES.map((code, index) => ({
        code,
        floor: 1,
        row: index % 17,
        column: index < 17 ? 0 : 2,
        kind: 'seat' as const,
        // Front rows sell as VIP; the rest are standard single beds.
        seatClassId: index % 17 < 3 ? 'class-bed-vip' : 'class-bed-single',
      })),
    }],
    vehicles: [{ id: 'vehicle-demo-01', label: 'Xe 01 · 34 chỗ', templateId: 'template-34', active: true }],
    fares: [{
      id: 'fare-sg-dl',
      routeId: 'route-sg-dl',
      priceVnd: 320_000,
      seatClassId: null,
      effectiveFrom: null,
      effectiveTo: null,
    }],
    schedules: [{
      id: 'schedule-sg-dl-2200',
      routeId: 'route-sg-dl',
      vehicleId: 'vehicle-demo-01',
      fareId: 'fare-sg-dl',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      departureTime: '15:00',
      durationMinutes: 450,
      activeFrom: '2026-07-18T00:00:00.000Z',
      activeTo: null,
    }],
    trips: [{
      id: DEMO_TRIP_ID,
      routeId: 'route-sg-dl',
      vehicleId: 'vehicle-demo-01',
      fareId: 'fare-sg-dl',
      departureAt: '2026-07-18T15:00:00.000Z',
      arrivalAt: '2026-07-18T22:30:00.000Z',
      declaredCapacity: DEMO_SEAT_CODES.length,
      scheduleId: 'schedule-sg-dl-2200',
    }],
  }
}
