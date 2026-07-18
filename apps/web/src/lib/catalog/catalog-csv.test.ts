import { describe, expect, it } from 'vitest'
import { validCatalogDraft } from './catalog-fixture'
import { applyCatalogCsv, dryRunCatalogCsv } from './catalog-csv'

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
      'kind,id,origin,destination,stops\n'
      + 'route,route-sg-bm,Sài Gòn,"Buôn Ma Thuột, Đắk Lắk",stop-sg:pickup|stop-dl:dropoff:450',
      draft,
    )
    const applied = applyCatalogCsv(result, draft)

    expect(result).toMatchObject({ validRows: 1, invalidRows: 0 })
    expect(applied.routes[1]?.destination).toBe('Buôn Ma Thuột, Đắk Lắk')
    expect(applied.routes[1]?.stops).toEqual([
      { stopId: 'stop-sg', role: 'pickup', sequence: 0, offsetMinutes: 0 },
      { stopId: 'stop-dl', role: 'dropoff', sequence: 1, offsetMinutes: 450 },
    ])
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

  it('imports branches, stops, seat classes and vehicles into the draft', () => {
    const draft = validCatalogDraft()
    const result = dryRunCatalogCsv([
      'kind,id,name,branchId,label,templateId,priceMultiplierBps',
      'branch,branch-dl,Văn phòng Đà Lạt,,,,',
      'stop,stop-bao-loc,Bảo Lộc,branch-dl,,,',
      'seatClass,class-vip,Giường VIP,,,,15000',
      'vehicle,vehicle-2,,,51B-999.99,tpl-34,',
    ].join('\n'), draft)
    const applied = applyCatalogCsv(result, draft)

    expect(result).toMatchObject({ validRows: 4, invalidRows: 0 })
    // The stop references a branch defined one row earlier in the same file.
    expect(applied.stops.at(-1)).toEqual({ id: 'stop-bao-loc', name: 'Bảo Lộc', branchId: 'branch-dl' })
    expect(applied.seatClasses.at(-1)?.priceMultiplierBps).toBe(15_000)
    expect(applied.vehicles.at(-1)).toMatchObject({ id: 'vehicle-2', templateId: 'tpl-34', active: true })
  })

  it('reports per-row errors for each entity kind', () => {
    const result = dryRunCatalogCsv([
      'kind,id,name,branchId,routeId,vehicleId,fareId,weekdays,departureTime,durationMinutes,activeFrom,priceVnd,seatClassId,templateId,label,stops',
      'stop,stop-x,Điểm lạ,branch-missing,,,,,,,,,,,,',
      'seatClass,,Không tên,,,,,,,,,,,,,',
      'vehicle,vehicle-x,,,,,,,,,,,,tpl-missing,Xe lạ,',
      'fare,fare-x,,,route-sg-dl,,,,,,,0,class-missing,,,',
      'schedule,sch-x,,,route-sg-dl,vehicle-1,fare-1,9,25:00,0,not-a-date,,,,,',
      'route,route-x,,,,,,,,,,,,,,stop-sg:pickup|stop-sg:boarding',
      'unknownKind,thing-x,,,,,,,,,,,,,,',
    ].join('\n'), validCatalogDraft())

    const errorsByRow = Object.fromEntries(result.rows.map((row) => [row.id || row.kind, row.errors]))

    expect(errorsByRow['stop-x']).toContain('UNKNOWN_BRANCH')
    expect(errorsByRow.seatClass).toEqual(expect.arrayContaining(['MISSING_ID']))
    expect(errorsByRow['vehicle-x']).toContain('UNKNOWN_TEMPLATE')
    expect(errorsByRow['fare-x']).toEqual(expect.arrayContaining(['INVALID_PRICE_VND', 'UNKNOWN_SEAT_CLASS']))
    expect(errorsByRow['sch-x']).toEqual(expect.arrayContaining([
      'INVALID_WEEKDAYS',
      'INVALID_DEPARTURE_TIME',
      'INVALID_DURATION_MINUTES',
      'INVALID_ACTIVE_FROM',
    ]))
    expect(errorsByRow['route-x']).toEqual(expect.arrayContaining([
      'INVALID_STOP_ROLE',
      'DUPLICATE_ROUTE_STOP',
      'MISSING_DROPOFF_STOP',
      'MISSING_ORIGIN',
    ]))
    expect(errorsByRow['thing-x']).toContain('UNKNOWN_KIND')
    expect(result.validRows).toBe(0)
  })

  it('imports a schedule and a trip with declared capacity', () => {
    const draft = validCatalogDraft()
    const result = dryRunCatalogCsv([
      'kind,id,routeId,vehicleId,fareId,weekdays,departureTime,durationMinutes,activeFrom,departureAt,arrivalAt,declaredCapacity',
      'schedule,sch-1,route-sg-dl,vehicle-1,fare-1,"1,5",22:00,450,2026-07-01T00:00:00Z,,,',
      'trip,trip-2,route-sg-dl,vehicle-1,fare-1,,,,,2026-07-21T15:00:00Z,2026-07-21T22:30:00Z,34',
    ].join('\n'), draft)
    const applied = applyCatalogCsv(result, draft)

    expect(result).toMatchObject({ validRows: 2, invalidRows: 0 })
    expect(applied.schedules.at(-1)).toMatchObject({ weekdays: [1, 5], departureTime: '22:00', durationMinutes: 450 })
    expect(applied.trips.at(-1)).toMatchObject({ id: 'trip-2', declaredCapacity: 34, scheduleId: null })
    expect(draft.schedules).toHaveLength(0)
  })

  it('rejects a fare whose effective window is inverted', () => {
    const result = dryRunCatalogCsv([
      'kind,id,routeId,priceVnd,effectiveFrom,effectiveTo',
      'fare,fare-2,route-sg-dl,400000,2026-08-01T00:00:00Z,2026-07-01T00:00:00Z',
    ].join('\n'), validCatalogDraft())

    expect(result.rows[0]?.errors).toContain('INVALID_FARE_WINDOW')
  })
})
