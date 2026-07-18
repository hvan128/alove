import { describe, expect, it } from 'vitest'
import {
  catalogDraftSchema,
  catalogScheduleSchema,
  fareRuleSchema,
  operatorActorSchema,
  routeSchema,
  seatClassSchema,
  vehicleTemplateSeatSchema,
} from '../src/catalog.js'

const draft = {
  id: 'catalog-v1',
  version: 1,
  status: 'draft',
  revision: 0,
  effectiveFrom: '2026-07-20T00:00:00.000Z',
  branches: [{ id: 'branch-sg', name: 'Sài Gòn' }],
  stops: [{ id: 'stop-sg', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' }],
  routes: [{
    id: 'route-sg-dl',
    origin: 'Sài Gòn',
    destination: 'Đà Lạt',
    stops: [{ stopId: 'stop-sg', role: 'both', sequence: 0, offsetMinutes: 0 }],
  }],
  seatClasses: [{ id: 'class-bed', name: 'Giường nằm', priceMultiplierBps: 10_000 }],
  vehicleTemplates: [{
    id: 'tpl-34',
    name: 'Giường nằm 34',
    floors: 1,
    seats: [{ code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat', seatClassId: 'class-bed' }],
  }],
  vehicles: [{ id: 'vehicle-1', label: '51B-123.45', templateId: 'tpl-34', active: true }],
  fares: [{ id: 'fare-1', routeId: 'route-sg-dl', priceVnd: 320000 }],
  schedules: [],
  trips: [{
    id: 'trip-1',
    routeId: 'route-sg-dl',
    vehicleId: 'vehicle-1',
    departureAt: '2026-07-20T15:00:00.000Z',
    arrivalAt: '2026-07-20T22:30:00.000Z',
    fareId: 'fare-1',
  }],
}

describe('catalog contracts', () => {
  it('accepts a draft covering every F-13 entity', () => {
    const result = catalogDraftSchema.parse(draft)

    expect(result.status).toBe('draft')
    expect(result.seatClasses[0]?.priceMultiplierBps).toBe(10_000)
    expect(result.routes[0]?.stops[0]?.role).toBe('both')
  })

  it('defaults optional F-13 fields so partial drafts stay parseable', () => {
    const result = catalogDraftSchema.parse(draft)

    expect(result.trips[0]?.declaredCapacity).toBeNull()
    expect(result.trips[0]?.scheduleId).toBeNull()
    expect(result.fares[0]?.seatClassId).toBeNull()
    expect(result.fares[0]?.effectiveFrom).toBeNull()
  })

  it('rejects an actor without an id', () => {
    expect(operatorActorSchema.safeParse({ id: '', role: 'admin', demo: true }).success).toBe(false)
  })

  it('rejects a route stop with an unknown role', () => {
    expect(routeSchema.safeParse({
      id: 'route-1',
      origin: 'A',
      destination: 'B',
      stops: [{ stopId: 'stop-1', role: 'boarding', sequence: 0 }],
    }).success).toBe(false)
  })

  it('rejects a seat class with a non-positive multiplier', () => {
    expect(seatClassSchema.safeParse({ id: 'c1', name: 'VIP', priceMultiplierBps: 0 }).success).toBe(false)
  })

  it('rejects a fare with a non-positive price', () => {
    expect(fareRuleSchema.safeParse({ id: 'f1', routeId: 'r1', priceVnd: 0 }).success).toBe(false)
  })

  it('leaves seat class null for non-sellable cells', () => {
    const aisle = vehicleTemplateSeatSchema.parse({
      code: 'X01', floor: 1, row: 0, column: 1, kind: 'aisle',
    })

    expect(aisle.seatClassId).toBeNull()
  })

  it('rejects a schedule with an out-of-range weekday or malformed time', () => {
    const base = {
      id: 'sch-1',
      routeId: 'route-sg-dl',
      vehicleId: 'vehicle-1',
      fareId: 'fare-1',
      weekdays: [1],
      departureTime: '22:00',
      durationMinutes: 450,
      activeFrom: '2026-07-20T00:00:00.000Z',
    }

    expect(catalogScheduleSchema.safeParse(base).success).toBe(true)
    expect(catalogScheduleSchema.safeParse({ ...base, weekdays: [7] }).success).toBe(false)
    expect(catalogScheduleSchema.safeParse({ ...base, weekdays: [] }).success).toBe(false)
    expect(catalogScheduleSchema.safeParse({ ...base, departureTime: '24:00' }).success).toBe(false)
    expect(catalogScheduleSchema.safeParse({ ...base, durationMinutes: 0 }).success).toBe(false)
  })
})
