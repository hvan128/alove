import { describe, expect, it } from 'vitest'
import {
  deriveTemplateCapacity,
  expandSchedule,
  forkCatalogVersion,
  publishCatalogDraft,
  resolveFareForTrip,
  retireCatalogVersion,
  validateCatalogDraft,
} from '../src/catalog.js'
import { validCatalogDraft } from './fixtures/catalog.js'

const admin = { id: 'admin-1', role: 'admin' as const, demo: false }
const codesFor = (draft: Parameters<typeof validateCatalogDraft>[0]): string[] =>
  validateCatalogDraft(draft).map((issue) => issue.code)

describe('catalog rules', () => {
  it('accepts the reference draft with no issues', () => {
    expect(validateCatalogDraft(validCatalogDraft())).toEqual([])
  })

  it('rejects duplicate seat codes and broken references', () => {
    const draft = validCatalogDraft({
      vehicleTemplates: [{
        ...validCatalogDraft().vehicleTemplates[0]!,
        seats: [
          { code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat', seatClassId: 'class-bed' },
          { code: 'A01', floor: 1, row: 1, column: 2, kind: 'seat', seatClassId: 'class-bed' },
        ],
      }],
      trips: [{ ...validCatalogDraft().trips[0]!, vehicleId: 'missing' }],
    })

    const codes = codesFor(draft)
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

describe('điểm đón/trả', () => {
  it('rejects an unknown, duplicated or role-incomplete stop list', () => {
    const route = validCatalogDraft().routes[0]!

    expect(codesFor(validCatalogDraft({
      routes: [{ ...route, stops: [{ stopId: 'missing', role: 'both', sequence: 0, offsetMinutes: 0 }] }],
    }))).toContain('UNKNOWN_STOP')

    expect(codesFor(validCatalogDraft({
      routes: [{
        ...route,
        stops: [
          { stopId: 'stop-sg', role: 'pickup', sequence: 0, offsetMinutes: 0 },
          { stopId: 'stop-sg', role: 'dropoff', sequence: 1, offsetMinutes: 10 },
        ],
      }],
    }))).toContain('DUPLICATE_ROUTE_STOP')

    expect(codesFor(validCatalogDraft({
      routes: [{ ...route, stops: [{ stopId: 'stop-sg', role: 'pickup', sequence: 0, offsetMinutes: 0 }] }],
    }))).toContain('MISSING_DROPOFF_STOP')
  })

  it('rejects a stop pointing at an unknown branch', () => {
    expect(codesFor(validCatalogDraft({
      stops: [{ id: 'stop-sg', name: 'Bến xe', branchId: 'missing' }],
    }))).toContain('UNKNOWN_BRANCH')
  })
})

describe('loại ghế và sức chứa', () => {
  it('counts capacity from sellable cells only', () => {
    expect(deriveTemplateCapacity({
      id: 'tpl', name: 'Mẫu', floors: 1,
      seats: [
        { code: 'A01', floor: 1, row: 0, column: 0, kind: 'seat', seatClassId: 'class-bed' },
        { code: 'B01', floor: 1, row: 0, column: 1, kind: 'double-bed', seatClassId: 'class-bed' },
        { code: 'X01', floor: 1, row: 0, column: 2, kind: 'aisle', seatClassId: null },
        { code: 'D01', floor: 1, row: 0, column: 3, kind: 'driver', seatClassId: null },
        { code: 'Z01', floor: 1, row: 0, column: 4, kind: 'blocked', seatClassId: null },
      ],
    })).toBe(2)
  })

  it('requires a seat class on sellable cells and rejects unknown ones', () => {
    const template = validCatalogDraft().vehicleTemplates[0]!

    expect(codesFor(validCatalogDraft({
      vehicleTemplates: [{
        ...template,
        seats: [{ code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat', seatClassId: null }],
      }],
    }))).toContain('SEAT_CLASS_REQUIRED')

    expect(codesFor(validCatalogDraft({
      vehicleTemplates: [{
        ...template,
        seats: [{ code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat', seatClassId: 'missing' }],
      }],
    }))).toContain('UNKNOWN_SEAT_CLASS')
  })

  it('flags a declared capacity that disagrees with the seat map', () => {
    const trip = validCatalogDraft().trips[0]!

    expect(codesFor(validCatalogDraft({ trips: [{ ...trip, declaredCapacity: 34 }] })))
      .toContain('CAPACITY_MISMATCH')
    expect(codesFor(validCatalogDraft({ trips: [{ ...trip, declaredCapacity: 2 }] })))
      .not.toContain('CAPACITY_MISMATCH')
  })

  it('flags a template with no sellable seat', () => {
    expect(codesFor(validCatalogDraft({
      vehicleTemplates: [{
        id: 'tpl-34', name: 'Rỗng', floors: 1,
        seats: [{ code: 'X01', floor: 1, row: 0, column: 0, kind: 'aisle', seatClassId: null }],
      }],
    }))).toContain('EMPTY_TEMPLATE_CAPACITY')
  })
})

describe('giá theo loại ghế và ngày hiệu lực', () => {
  it('rejects an inverted window and overlapping windows for one route/class pair', () => {
    const fare = validCatalogDraft().fares[0]!

    expect(codesFor(validCatalogDraft({
      fares: [{ ...fare, effectiveFrom: '2026-08-01T00:00:00.000Z', effectiveTo: '2026-07-01T00:00:00.000Z' }],
    }))).toContain('INVALID_FARE_WINDOW')

    expect(codesFor(validCatalogDraft({
      fares: [
        { ...fare, id: 'fare-a', effectiveFrom: '2026-07-01T00:00:00.000Z', effectiveTo: '2026-08-01T00:00:00.000Z' },
        { ...fare, id: 'fare-b', effectiveFrom: '2026-07-15T00:00:00.000Z', effectiveTo: '2026-09-01T00:00:00.000Z' },
      ],
    }))).toContain('FARE_EFFECTIVE_OVERLAP')
  })

  it('allows adjacent windows and separate seat classes on one route', () => {
    const fare = validCatalogDraft().fares[0]!

    expect(codesFor(validCatalogDraft({
      fares: [
        { ...fare, id: 'fare-a', effectiveFrom: null, effectiveTo: '2026-08-01T00:00:00.000Z' },
        { ...fare, id: 'fare-b', effectiveFrom: '2026-08-01T00:00:00.000Z', effectiveTo: null },
        { ...fare, id: 'fare-c', seatClassId: 'class-bed' },
      ],
    }))).not.toContain('FARE_EFFECTIVE_OVERLAP')
  })

  it('applies the seat-class multiplier to the effective route fare', () => {
    const draft = validCatalogDraft({
      seatClasses: [
        { id: 'class-bed', name: 'Giường nằm', priceMultiplierBps: 10_000 },
        { id: 'class-vip', name: 'VIP', priceMultiplierBps: 15_000 },
      ],
    })
    const trip = draft.trips[0]!

    expect(resolveFareForTrip(draft, trip, 'class-bed')?.priceVnd).toBe(320_000)
    expect(resolveFareForTrip(draft, trip, 'class-vip')?.priceVnd).toBe(480_000)
  })

  it('prefers a class-specific fare and honours the effective window', () => {
    const draft = validCatalogDraft({
      fares: [
        { id: 'fare-base', routeId: 'route-sg-dl', priceVnd: 320_000, seatClassId: null, effectiveFrom: null, effectiveTo: null },
        { id: 'fare-bed', routeId: 'route-sg-dl', priceVnd: 400_000, seatClassId: 'class-bed', effectiveFrom: '2026-07-01T00:00:00.000Z', effectiveTo: null },
      ],
    })
    const trip = draft.trips[0]!

    expect(resolveFareForTrip(draft, trip, 'class-bed')?.fare.id).toBe('fare-bed')
    // Before the class window opens, only the route-wide rule is in effect.
    expect(resolveFareForTrip(draft, trip, 'class-bed', '2026-06-01T00:00:00.000Z')?.fare.id).toBe('fare-base')
  })
})

describe('lịch chạy', () => {
  const schedule = {
    id: 'sch-sg-dl',
    routeId: 'route-sg-dl',
    vehicleId: 'vehicle-1',
    fareId: 'fare-1',
    weekdays: [1, 5],
    departureTime: '22:00',
    durationMinutes: 450,
    activeFrom: '2026-07-01T00:00:00.000Z',
    activeTo: null,
  }

  it('expands only matching weekdays inside the window', () => {
    // 2026-07-20 is a Monday; 2026-07-24 is a Friday.
    const trips = expandSchedule(schedule, '2026-07-20T00:00:00.000Z', '2026-07-27T00:00:00.000Z')

    expect(trips.map((trip) => trip.departureAt)).toEqual([
      '2026-07-20T22:00:00.000Z',
      '2026-07-24T22:00:00.000Z',
    ])
    expect(trips[0]).toMatchObject({
      arrivalAt: '2026-07-21T05:30:00.000Z',
      scheduleId: 'sch-sg-dl',
      routeId: 'route-sg-dl',
    })
  })

  it('is deterministic and returns nothing for an inverted or inactive range', () => {
    const first = expandSchedule(schedule, '2026-07-20T00:00:00.000Z', '2026-07-27T00:00:00.000Z')
    const second = expandSchedule(schedule, '2026-07-20T00:00:00.000Z', '2026-07-27T00:00:00.000Z')

    expect(first).toEqual(second)
    expect(expandSchedule(schedule, '2026-07-27T00:00:00.000Z', '2026-07-20T00:00:00.000Z')).toEqual([])
    expect(expandSchedule(
      { ...schedule, activeTo: '2026-07-10T00:00:00.000Z' },
      '2026-07-20T00:00:00.000Z',
      '2026-07-27T00:00:00.000Z',
    )).toEqual([])
  })

  it('rejects a schedule with broken references or an inverted window', () => {
    expect(codesFor(validCatalogDraft({ schedules: [{ ...schedule, routeId: 'missing' }] })))
      .toContain('BROKEN_SCHEDULE_REFERENCE')
    expect(codesFor(validCatalogDraft({
      schedules: [{ ...schedule, activeTo: '2026-06-01T00:00:00.000Z' }],
    }))).toContain('INVALID_SCHEDULE_WINDOW')
  })

  it('accepts generated trips that point back at their schedule', () => {
    const trips = expandSchedule(schedule, '2026-07-20T00:00:00.000Z', '2026-07-21T00:00:00.000Z')

    expect(codesFor(validCatalogDraft({ schedules: [schedule], trips }))).toEqual([])
  })
})

describe('duplicate entity ids', () => {
  it('flags a repeated id in any collection', () => {
    const branch = { id: 'branch-sg', name: 'Sài Gòn' }

    expect(codesFor(validCatalogDraft({ branches: [branch, branch] })))
      .toContain('DUPLICATE_ENTITY_ID')
  })
})
