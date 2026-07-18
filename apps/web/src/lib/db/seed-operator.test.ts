// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { createSeedPlan, parseCsvLine } from '../../../scripts/seed-operator'

const canonicalFiles = {
  operatorRows: [{ id: 'mai-anh', name: 'Mai Anh', hotline: '' }],
  routeRows: [{
    id: 'MA-R01',
    operator_id: 'mai-anh',
    origin_city: 'Hà Nội',
    destination_city: 'Vinh',
    duration_minutes: '330',
    pickup_point: 'Nước Ngầm',
    dropoff_point: 'Bến xe Vinh',
  }],
  vehicleRows: [{
    id: 'VT-2',
    name: 'Cabin 2 chỗ',
    price_vnd: '500000',
    stated_capacity: '2',
  }],
  seatMapRows: [
    { vehicle_type_id: 'VT-2', code: 'A01', deck: 'lower' },
    { vehicle_type_id: 'VT-2', code: 'A02', deck: '' },
  ],
  scheduleRows: [{
    route_id: 'MA-R01',
    vehicle_type_id: 'VT-2',
    departure_time: '06:00',
    price_vnd: '450000',
  }],
}

describe('operator seed plan', () => {
  it('expands the canonical schedule with explicit schedule prices and seat maps', () => {
    const dates = ['2026-07-18', '2026-07-19']
    const plan = createSeedPlan(canonicalFiles, 2, (offset) => dates[offset]!)

    expect(plan.routes).toEqual([
      expect.objectContaining({ id: 'MA-R01', active: 'yes', durationMinutes: 330 }),
    ])
    expect(plan.trips).toHaveLength(2)
    expect(plan.trips[0]).toEqual({
      trip: expect.objectContaining({
        id: 'MA-R01-VT-2-2026-07-18-0600',
        priceVnd: 450000,
        active: 'yes',
      }),
      seats: [
        { tripId: 'MA-R01-VT-2-2026-07-18-0600', code: 'A01', deck: 'lower' },
        { tripId: 'MA-R01-VT-2-2026-07-18-0600', code: 'A02', deck: null },
      ],
    })
  })

  it('requires the final sale price on every schedule row', () => {
    expect(() => createSeedPlan({
      ...canonicalFiles,
      scheduleRows: [{ ...canonicalFiles.scheduleRows[0]!, price_vnd: '' }],
    }, 1)).toThrow('schedules.csv: thiếu price_vnd')

    expect(() => createSeedPlan({
      ...canonicalFiles,
      scheduleRows: [{ ...canonicalFiles.scheduleRows[0]!, price_vnd: '0' }],
    }, 1)).toThrow('schedules.csv dòng 2: price_vnd: phải là số nguyên dương')
  })

  it('rejects a seat map that references a non-canonical vehicle type before writing', () => {
    expect(() => createSeedPlan({
      ...canonicalFiles,
      seatMapRows: canonicalFiles.seatMapRows.map((row) => ({ ...row, vehicle_type_id: 'UNKNOWN' })),
    }, 1)).toThrow('seat_maps.csv dòng 2: vehicle_type_id không tồn tại')
  })

  it('parses quoted commas and escaped quotes in operator facts', () => {
    expect(parseCsvLine('mai-anh,"Mai Anh, Nghệ An","Hotline ""VIP"""')).toEqual([
      'mai-anh',
      'Mai Anh, Nghệ An',
      'Hotline "VIP"',
    ])
  })
})
