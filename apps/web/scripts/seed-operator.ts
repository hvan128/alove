/**
 * Nạp dữ liệu nhà xe từ thư mục CSV vào Neon.
 *
 *   pnpm --dir apps/web seed:operator ../../data/mai-anh-seed [số-ngày]
 *
 * CSV là nguồn canonical cho các operator có trong operators.csv. Chạy lại sẽ
 * re-activate dữ liệu còn tồn tại, đóng dữ liệu tương lai đã bị gỡ và chỉ dọn
 * ghế không còn ownership; active hold và ghế booked luôn được giữ nguyên.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { and, eq, notInArray, sql } from 'drizzle-orm'
import type { BatchItem } from 'drizzle-orm/batch'

import { getDb, type Db } from '../src/lib/db/client'
import { operators, routes, seats, trips } from '../src/lib/db/schema'

const TZ_OFFSET = '+07:00' // giờ Việt Nam
const TRIP_INSERT_CHUNK_SIZE = 250
const SEAT_BATCH_TRIPS = 20

type CsvRow = Record<string, string>

type SeedFiles = {
  operatorRows: CsvRow[]
  routeRows: CsvRow[]
  vehicleRows: CsvRow[]
  seatMapRows: CsvRow[]
  scheduleRows: CsvRow[]
}

export type PlannedTrip = {
  trip: typeof trips.$inferInsert
  seats: Array<typeof seats.$inferInsert>
}

export type SeedPlan = {
  operators: Array<typeof operators.$inferInsert>
  routes: Array<typeof routes.$inferInsert>
  trips: PlannedTrip[]
}

function readCsv(dir: string, name: string): Record<string, string>[] {
  const raw = readFileSync(join(dir, name), 'utf8').trim()
  const [head, ...lines] = raw.split(/\r?\n/)
  if (!head) throw new Error(`${name}: file rỗng`)
  const cols = parseCsvLine(head).map((c) => c.trim())
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cells = parseCsvLine(line)
      if (cells.length !== cols.length) {
        throw new Error(`${name}: sai số cột ở dòng ${line}`)
      }
      return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]))
    })
}

/** CSV row parser with quoted commas and escaped quotes; seed files do not allow multiline cells. */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (char === ',' && !quoted) {
      cells.push(value)
      value = ''
    } else {
      value += char
    }
  }
  if (quoted) throw new Error(`CSV có dấu nháy chưa đóng: ${line}`)
  cells.push(value)
  return cells
}

function vietnamDate(offsetDays: number): string {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function tripId(routeId: string, vehicleTypeId: string, date: string, time: string): string {
  return `${routeId}-${vehicleTypeId}-${date}-${time.replace(':', '')}`
}

function validateRows(
  file: string,
  rows: Record<string, string>[],
  required: string[],
  uniqueKey: (row: Record<string, string>) => string,
): void {
  if (rows.length === 0) throw new Error(`${file}: phải có ít nhất một dòng dữ liệu`)
  const seen = new Set<string>()
  rows.forEach((row, index) => {
    for (const column of required) {
      if (!row[column]) throw new Error(`${file}: thiếu ${column} ở dòng ${index + 2}`)
    }
    const key = uniqueKey(row)
    if (seen.has(key)) throw new Error(`${file}: khóa bị trùng ở dòng ${index + 2}: ${key}`)
    seen.add(key)
  })
}

function positiveInteger(value: string, label: string): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label}: phải là số nguyên dương`)
  }
  return parsed
}

export function createSeedPlan(
  files: SeedFiles,
  days: number,
  dateForOffset: (offsetDays: number) => string = vietnamDate,
): SeedPlan {
  if (!Number.isSafeInteger(days) || days < 1 || days > 90) {
    throw new Error('Số ngày seed phải là số nguyên từ 1 đến 90.')
  }
  const { operatorRows, routeRows, vehicleRows, seatMapRows, scheduleRows } = files

  validateRows('operators.csv', operatorRows, ['id', 'name'], (row) => row.id!)
  validateRows(
    'routes.csv',
    routeRows,
    ['id', 'operator_id', 'origin_city', 'destination_city', 'duration_minutes', 'pickup_point', 'dropoff_point'],
    (row) => row.id!,
  )
  validateRows(
    'vehicle_types.csv',
    vehicleRows,
    ['id', 'name', 'price_vnd', 'stated_capacity'],
    (row) => row.id!,
  )
  validateRows('seat_maps.csv', seatMapRows, ['vehicle_type_id', 'code'], (row) => `${row.vehicle_type_id}:${row.code}`)
  validateRows(
    'schedules.csv',
    scheduleRows,
    ['route_id', 'vehicle_type_id', 'departure_time', 'price_vnd'],
    (row) => `${row.route_id}:${row.vehicle_type_id}:${row.departure_time}`,
  )

  routeRows.forEach((row, index) => positiveInteger(row.duration_minutes!, `routes.csv dòng ${index + 2}: duration_minutes`))
  vehicleRows.forEach((row, index) => {
    positiveInteger(row.price_vnd!, `vehicle_types.csv dòng ${index + 2}: price_vnd`)
    positiveInteger(row.stated_capacity!, `vehicle_types.csv dòng ${index + 2}: stated_capacity`)
  })
  const operatorIds = new Set(operatorRows.map((row) => row.id))
  const routeIds = new Set(routeRows.map((row) => row.id))
  const vehicleIds = new Set(vehicleRows.map((row) => row.id))
  routeRows.forEach((row, index) => {
    if (!operatorIds.has(row.operator_id)) {
      throw new Error(`routes.csv dòng ${index + 2}: operator_id không tồn tại`)
    }
  })
  seatMapRows.forEach((row, index) => {
    if (!vehicleIds.has(row.vehicle_type_id)) {
      throw new Error(`seat_maps.csv dòng ${index + 2}: vehicle_type_id không tồn tại`)
    }
    if (row.deck && row.deck !== 'lower' && row.deck !== 'upper') {
      throw new Error(`seat_maps.csv dòng ${index + 2}: deck phải là lower, upper hoặc để trống`)
    }
  })
  scheduleRows.forEach((row, index) => {
    if (!routeIds.has(row.route_id)) {
      throw new Error(`schedules.csv dòng ${index + 2}: route_id không tồn tại`)
    }
    if (!vehicleIds.has(row.vehicle_type_id)) {
      throw new Error(`schedules.csv dòng ${index + 2}: vehicle_type_id không tồn tại`)
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/u.test(row.departure_time!)) {
      throw new Error(`schedules.csv dòng ${index + 2}: departure_time không hợp lệ`)
    }
    positiveInteger(row.price_vnd!, `schedules.csv dòng ${index + 2}: price_vnd`)
  })

  const vehicleById = new Map(vehicleRows.map((v) => [v.id!, v]))
  const routeById = new Map(routeRows.map((r) => [r.id!, r]))
  const seatsByVehicle = new Map<string, CsvRow[]>()
  for (const s of seatMapRows) {
    const list = seatsByVehicle.get(s.vehicle_type_id!) ?? []
    list.push(s)
    seatsByVehicle.set(s.vehicle_type_id!, list)
  }
  for (const vehicle of vehicleRows) {
    const actual = seatsByVehicle.get(vehicle.id!)?.length ?? 0
    const expected = positiveInteger(vehicle.stated_capacity!, `${vehicle.id}: stated_capacity`)
    if (actual !== expected) {
      throw new Error(`${vehicle.id}: sơ đồ có ${actual} chỗ nhưng stated_capacity là ${expected}`)
    }
  }

  const plannedTrips: PlannedTrip[] = []

  for (let offset = 0; offset < days; offset += 1) {
    const date = dateForOffset(offset)

    for (const sched of scheduleRows) {
      const route = routeById.get(sched.route_id!)!
      const vehicle = vehicleById.get(sched.vehicle_type_id!)!

      const departureAt = new Date(`${date}T${sched.departure_time}:00${TZ_OFFSET}`)
      if (Number.isNaN(departureAt.getTime())) {
        throw new Error(`Không tạo được thời gian khởi hành từ ${date} ${sched.departure_time}`)
      }
      const duration = Number(route.duration_minutes)
      const arrivalAt = new Date(departureAt.getTime() + duration * 60_000)
      const id = tripId(route.id!, vehicle.id!, date, sched.departure_time!)

      plannedTrips.push({
        trip: {
          id,
          routeId: route.id!,
          departureAt,
          arrivalAt,
          vehicleType: vehicle.name!,
          priceVnd: Number(sched.price_vnd),
          pickupPoint: route.pickup_point!,
          dropoffPoint: route.dropoff_point!,
          active: 'yes',
        },
        seats: (seatsByVehicle.get(vehicle.id!) ?? []).map((seat) => ({
          tripId: id,
          code: seat.code!,
          deck: (seat.deck || null) as 'lower' | 'upper' | null,
        })),
      })
    }
  }

  return {
    operators: operatorRows.map((row) => ({
      id: row.id!,
      name: row.name!,
      hotline: row.hotline || null,
    })),
    routes: routeRows.map((row) => ({
      id: row.id!,
      operatorId: row.operator_id!,
      originCity: row.origin_city!,
      destinationCity: row.destination_city!,
      durationMinutes: Number(row.duration_minutes),
      active: 'yes',
    })),
    trips: plannedTrips,
  }
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

async function runBatch(db: Db, statements: BatchItem<'pg'>[]): Promise<unknown[]> {
  if (statements.length === 0) return []
  return db.batch(statements as [BatchItem<'pg'>, ...BatchItem<'pg'>[]]) as Promise<unknown[]>
}

async function persistPlan(db: Db, plan: SeedPlan): Promise<{
  syncedSeats: number
  removedSeats: number
  deactivatedTrips: number
  deactivatedRoutes: number
}> {
  // Operator + route share a Neon HTTP transaction so route foreign keys never
  // observe a half-written catalog. `excluded` lets one multi-row statement
  // update every row with its own canonical values.
  await db.batch([
    db.insert(operators).values(plan.operators).onConflictDoUpdate({
      target: operators.id,
      set: {
        name: sql`excluded.name`,
        hotline: sql`excluded.hotline`,
      },
    }),
    db.insert(routes).values(plan.routes).onConflictDoUpdate({
      target: routes.id,
      set: {
        operatorId: sql`excluded.operator_id`,
        originCity: sql`excluded.origin_city`,
        destinationCity: sql`excluded.destination_city`,
        durationMinutes: sql`excluded.duration_minutes`,
        active: 'yes',
      },
    }),
  ])

  for (const tripChunk of chunks(plan.trips, TRIP_INSERT_CHUNK_SIZE)) {
    await db.insert(trips).values(tripChunk.map(({ trip }) => trip)).onConflictDoUpdate({
      target: trips.id,
      set: {
        routeId: sql`excluded.route_id`,
        departureAt: sql`excluded.departure_at`,
        arrivalAt: sql`excluded.arrival_at`,
        vehicleType: sql`excluded.vehicle_type`,
        priceVnd: sql`excluded.price_vnd`,
        pickupPoint: sql`excluded.pickup_point`,
        dropoffPoint: sql`excluded.dropoff_point`,
        active: 'yes',
      },
    })
  }

  let syncedSeats = 0
  let removedSeats = 0
  for (const tripChunk of chunks(plan.trips, SEAT_BATCH_TRIPS)) {
    const statements: BatchItem<'pg'>[] = []
    for (const planned of tripChunk) {
      const codes = planned.seats.map((seat) => seat.code)
      statements.push(
        db.insert(seats).values(planned.seats).onConflictDoUpdate({
          target: [seats.tripId, seats.code],
          set: { deck: sql`excluded.deck` },
          // Do not rewrite even seat metadata while a hold/booking owns the row.
          setWhere: eq(seats.status, 'available'),
        }).returning({ id: seats.id }),
        db.delete(seats).where(and(
          eq(seats.tripId, planned.trip.id),
          sql`(
            ${seats.status} = 'available'
            OR (
              ${seats.status} = 'held'
              AND (${seats.holdExpiresAt} IS NULL OR ${seats.holdExpiresAt} <= now())
            )
          )`,
          notInArray(seats.code, codes),
        )).returning({ id: seats.id }),
      )
    }
    const results = await runBatch(db, statements)
    results.forEach((result, index) => {
      const changed = Array.isArray(result) ? result.length : 0
      if (index % 2 === 0) syncedSeats += changed
      else removedSeats += changed
    })
  }

  const operatorIds = plan.operators.map((operator) => operator.id)
  const routeIds = plan.routes.map((route) => route.id)
  const expectedTripIds = plan.trips.map(({ trip }) => trip.id)

  // One statement atomically closes every non-canonical future trip in the
  // scoped operators, closes routes removed from CSV, and deletes only their
  // unowned seats (available or expired holds). The exact requested horizon is
  // canonical: shortening it
  // also closes previously-created trips beyond the new horizon.
  const reconciliation = await db.execute(sql`
    WITH operator_scope(id) AS (
      SELECT jsonb_array_elements_text(${JSON.stringify(operatorIds)}::jsonb)
    ), canonical_routes(id) AS (
      SELECT jsonb_array_elements_text(${JSON.stringify(routeIds)}::jsonb)
    ), expected_trips(id) AS (
      SELECT jsonb_array_elements_text(${JSON.stringify(expectedTripIds)}::jsonb)
    ),
    scoped_routes AS (
      SELECT r.id
      FROM ${routes} AS r
      WHERE r.operator_id IN (SELECT id FROM operator_scope)
    ), deactivated_routes AS (
      UPDATE ${routes} AS r
      SET active = 'no'
      WHERE r.operator_id IN (SELECT id FROM operator_scope)
        AND r.active <> 'no'
        AND NOT EXISTS (SELECT 1 FROM canonical_routes c WHERE c.id = r.id)
      RETURNING r.id
    ), deactivated_trips AS (
      UPDATE ${trips} AS t
      SET active = 'no'
      WHERE t.active <> 'no'
        AND t.departure_at >= now()
        AND t.route_id IN (SELECT id FROM scoped_routes)
        AND NOT EXISTS (SELECT 1 FROM expected_trips e WHERE e.id = t.id)
      RETURNING t.id
    ), removed_unowned_seats AS (
      DELETE FROM ${seats} AS s
      USING ${trips} AS t
      WHERE s.trip_id = t.id
        AND (
          s.status = 'available'
          OR (s.status = 'held' AND (s.hold_expires_at IS NULL OR s.hold_expires_at <= now()))
        )
        AND t.departure_at >= now()
        AND t.route_id IN (SELECT id FROM scoped_routes)
        AND NOT EXISTS (SELECT 1 FROM expected_trips e WHERE e.id = t.id)
      RETURNING s.id
    )
    SELECT
      (SELECT count(*)::int FROM deactivated_routes) AS "deactivatedRoutes",
      (SELECT count(*)::int FROM deactivated_trips) AS "deactivatedTrips",
      (SELECT count(*)::int FROM removed_unowned_seats) AS "removedSeats"
  `)
  const summary = reconciliation.rows[0] as {
    deactivatedRoutes?: number | string
    deactivatedTrips?: number | string
    removedSeats?: number | string
  } | undefined

  return {
    syncedSeats,
    removedSeats: removedSeats + Number(summary?.removedSeats ?? 0),
    deactivatedTrips: Number(summary?.deactivatedTrips ?? 0),
    deactivatedRoutes: Number(summary?.deactivatedRoutes ?? 0),
  }
}

async function main() {
  const dir = resolve(process.argv[2] ?? '../../data/mai-anh-seed')
  const days = Number(process.argv[3] ?? 14)
  const files: SeedFiles = {
    operatorRows: readCsv(dir, 'operators.csv'),
    routeRows: readCsv(dir, 'routes.csv'),
    vehicleRows: readCsv(dir, 'vehicle_types.csv'),
    seatMapRows: readCsv(dir, 'seat_maps.csv'),
    scheduleRows: readCsv(dir, 'schedules.csv'),
  }
  const plan = createSeedPlan(files, days)
  const db = getDb()
  if (!db) throw new Error('Chưa có DATABASE_URL — không nạp được dữ liệu nhà xe.')
  const persisted = await persistPlan(db, plan)

  const freeSeatRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(seats)
    .where(and(eq(seats.status, 'available')))
  const freeSeats = freeSeatRows[0]?.count ?? 0

  console.log(`nhà xe:   ${plan.operators.length}`)
  console.log(`tuyến:    ${plan.routes.length} (đã đóng ${persisted.deactivatedRoutes})`)
  console.log(`chuyến:   ${plan.trips.length} (đã đóng ${persisted.deactivatedTrips})`)
  console.log(`ghế canonical đã đồng bộ: ${persisted.syncedSeats}`)
  console.log(`ghế không còn ownership đã gỡ: ${persisted.removedSeats}`)
  console.log(`ghế trống hiện có: ${freeSeats}`)
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null
if (invokedPath === import.meta.url) {
  main().then(() => process.exit(0)).catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
