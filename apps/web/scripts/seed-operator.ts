/**
 * Nạp dữ liệu nhà xe từ thư mục CSV vào Neon.
 *
 *   pnpm --filter @ordervoice/web seed:operator ../../data/operator-seed [số-ngày]
 *
 * Chạy lại nhiều lần được: nhà xe/tuyến/chuyến ghi đè theo id, còn ghế thì chỉ
 * thêm ghế chưa có — ghế đang giữ hoặc đã bán không bao giờ bị đụng tới.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { and, eq, sql } from 'drizzle-orm'

import { getDb } from '../src/lib/db/client'
import { operators, routes, seats, trips } from '../src/lib/db/schema'

const TZ_OFFSET = '+07:00' // giờ Việt Nam

function readCsv(dir: string, name: string): Record<string, string>[] {
  const raw = readFileSync(join(dir, name), 'utf8').trim()
  const [head, ...lines] = raw.split(/\r?\n/)
  const cols = head!.split(',').map((c) => c.trim())
  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cells = line.split(',')
      return Object.fromEntries(cols.map((c, i) => [c, (cells[i] ?? '').trim()]))
    })
}

function tripId(routeId: string, vehicleTypeId: string, date: string, time: string): string {
  return `${routeId}-${vehicleTypeId}-${date}-${time.replace(':', '')}`
}

async function main() {
  const dir = resolve(process.argv[2] ?? '../../data/operator-seed')
  const days = Number(process.argv[3] ?? 14)
  const db = getDb()
  if (!db) throw new Error('Chưa có DATABASE_URL — không nạp được dữ liệu nhà xe.')

  const operatorRows = readCsv(dir, 'operators.csv')
  const routeRows = readCsv(dir, 'routes.csv')
  const vehicleRows = readCsv(dir, 'vehicle_types.csv')
  const seatMapRows = readCsv(dir, 'seat_maps.csv')
  const scheduleRows = readCsv(dir, 'schedules.csv')

  for (const o of operatorRows) {
    await db.insert(operators).values({ id: o.id!, name: o.name!, hotline: o.hotline || null })
      .onConflictDoUpdate({ target: operators.id, set: { name: o.name!, hotline: o.hotline || null } })
  }

  for (const r of routeRows) {
    await db.insert(routes).values({
      id: r.id!,
      operatorId: r.operator_id!,
      originCity: r.origin_city!,
      destinationCity: r.destination_city!,
      durationMinutes: r.duration_minutes ? Number(r.duration_minutes) : null,
    }).onConflictDoUpdate({
      target: routes.id,
      set: {
        originCity: r.origin_city!,
        destinationCity: r.destination_city!,
        durationMinutes: r.duration_minutes ? Number(r.duration_minutes) : null,
      },
    })
  }

  const vehicleById = new Map(vehicleRows.map((v) => [v.id!, v]))
  const routeById = new Map(routeRows.map((r) => [r.id!, r]))
  const seatsByVehicle = new Map<string, Record<string, string>[]>()
  for (const s of seatMapRows) {
    const list = seatsByVehicle.get(s.vehicle_type_id!) ?? []
    list.push(s)
    seatsByVehicle.set(s.vehicle_type_id!, list)
  }

  // Sinh chuyến cụ thể cho `days` ngày tới từ lịch chạy lặp hằng ngày.
  const today = new Date()
  let tripCount = 0
  let seatCount = 0

  for (let offset = 0; offset < days; offset += 1) {
    const day = new Date(today)
    day.setDate(today.getDate() + offset)
    const date = day.toISOString().slice(0, 10)

    for (const sched of scheduleRows) {
      const route = routeById.get(sched.route_id!)
      const vehicle = vehicleById.get(sched.vehicle_type_id!)
      if (!route || !vehicle) continue

      const departureAt = new Date(`${date}T${sched.departure_time}:00${TZ_OFFSET}`)
      const duration = Number(route.duration_minutes || 0)
      const arrivalAt = duration > 0 ? new Date(departureAt.getTime() + duration * 60_000) : null
      const id = tripId(route.id!, vehicle.id!, date, sched.departure_time!)

      await db.insert(trips).values({
        id,
        routeId: route.id!,
        departureAt,
        arrivalAt,
        vehicleType: vehicle.name!,
        priceVnd: Number(vehicle.price_vnd),
        pickupPoint: route.pickup_point!,
        dropoffPoint: route.dropoff_point!,
      }).onConflictDoUpdate({
        target: trips.id,
        set: { priceVnd: Number(vehicle.price_vnd), vehicleType: vehicle.name!, arrivalAt },
      })
      tripCount += 1

      // Ghế: chỉ thêm ghế chưa tồn tại. Ghế đã 'held'/'booked' giữ nguyên trạng thái.
      for (const seat of seatsByVehicle.get(vehicle.id!) ?? []) {
        const inserted = await db.insert(seats).values({
          tripId: id,
          code: seat.code!,
          deck: (seat.deck || null) as 'lower' | 'upper' | null,
        }).onConflictDoNothing({ target: [seats.tripId, seats.code] }).returning({ id: seats.id })
        seatCount += inserted.length
      }
    }
  }

  const [{ count: freeSeats }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(seats)
    .where(and(eq(seats.status, 'available')))

  console.log(`nhà xe:   ${operatorRows.length}`)
  console.log(`tuyến:    ${routeRows.length}`)
  console.log(`chuyến:   ${tripCount} (trong ${days} ngày tới)`)
  console.log(`ghế mới:  ${seatCount}`)
  console.log(`ghế trống hiện có: ${freeSeats}`)
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error)
  process.exit(1)
})
