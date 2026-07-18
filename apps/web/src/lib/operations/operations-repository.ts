import type { OperationsAuditEvent, SessionOwnership } from '@ordervoice/contracts'
import {
  busBookings,
  busCalls,
  catalogRoutes,
  catalogTrips,
  catalogVehicles,
  getDb,
  inventoryEvents,
  tripSeats,
} from '@ordervoice/db'
import { createOwnershipRepository, type OwnershipRepository } from './ownership-repository'
import { unassignedOwnership } from './session-ownership'

export type OperationsDashboardSnapshot = {
  mode: 'memory' | 'neon'
  freshAt: string
  metrics: {
    queuedCalls: number
    longestWaitSeconds: number
    activeCalls: number
    callsToday: number
    confirmedBookings: number
    conversionRate: number
    agentAssistRate: number
  }
  queue: Array<{
    sessionCode: string
    routeLabel: string
    waitSeconds: number
    passengerCount: number | null
  }>
  activeCalls: Array<{
    sessionCode: string
    ownerId: string | null
    ownerRole: SessionOwnership['ownerRole']
    /** Who currently holds reply authority; audited, unlike the transport toggle. */
    delegation: SessionOwnership['delegation']
    takeoverReason: string | null
    authority: 'human' | 'auto'
    bookingState: string
    startedAt: string
  }>
  departures: Array<{
    tripId: string
    routeLabel: string
    departureAt: string
    vehicleLabel: string
    available: number
    held: number
    booked: number
    capacity: number
  }>
  alerts: Array<{
    id: string
    severity: 'info' | 'warning' | 'danger'
    message: string
  }>
  auditTrail: OperationsAuditEvent[]
}

/** Free-text filter applied to the lists only; metrics stay on the full population. */
export type DashboardOptions = { query?: string }

export type OperationsReportData = {
  mode: 'memory' | 'neon'
  freshAt: string
  range: { from: string; to: string }
  totals: {
    calls: number
    confirmed: number
    conversionRate: number
    agentAssistRate: number
  }
  outcomes: Array<{ label: string; count: number }>
  routes: Array<{ routeLabel: string; booked: number; capacity: number }>
}

export type OperationsRepository = {
  mode: 'memory' | 'neon'
  getDashboard(at: string, options?: DashboardOptions): Promise<OperationsDashboardSnapshot>
  getReport(range: { from: string; to: string }): Promise<OperationsReportData>
}

export type OperationsMemoryState = Omit<OperationsDashboardSnapshot, 'mode' | 'freshAt' | 'metrics' | 'auditTrail'> & {
  callsToday: number
  confirmedBookings: number
  assistedCalls: number
}

export function seededOperations(): OperationsMemoryState {
  return {
    callsToday: 24,
    confirmedBookings: 18,
    assistedCalls: 15,
    queue: [
      { sessionCode: 'DEMO42', routeLabel: 'Sài Gòn → Đà Lạt', waitSeconds: 188, passengerCount: 2 },
      { sessionCode: 'TRIP91', routeLabel: 'Sài Gòn → Nha Trang', waitSeconds: 124, passengerCount: 1 },
      { sessionCode: 'NIGHT7', routeLabel: 'Đà Lạt → Sài Gòn', waitSeconds: 76, passengerCount: 3 },
      { sessionCode: 'CALL28', routeLabel: 'Chưa xác định tuyến', waitSeconds: 41, passengerCount: null },
    ],
    activeCalls: [
      { sessionCode: 'LIVE18', ownerId: null, ownerRole: null, delegation: 'staff', takeoverReason: null, authority: 'human', bookingState: 'review', startedAt: '2026-07-18T09:55:00.000Z' },
      { sessionCode: 'AUTO12', ownerId: null, ownerRole: null, delegation: 'staff', takeoverReason: null, authority: 'auto', bookingState: 'collecting', startedAt: '2026-07-18T09:57:00.000Z' },
      { sessionCode: 'LIVE03', ownerId: null, ownerRole: null, delegation: 'staff', takeoverReason: null, authority: 'human', bookingState: 'confirmed', startedAt: '2026-07-18T09:58:30.000Z' },
    ],
    departures: [
      { tripId: 'trip-1', routeLabel: 'Sài Gòn → Đà Lạt', departureAt: '2026-07-18T12:30:00.000Z', vehicleLabel: 'Limousine 34 phòng', available: 5, held: 3, booked: 26, capacity: 34 },
      { tripId: 'trip-2', routeLabel: 'Sài Gòn → Nha Trang', departureAt: '2026-07-18T14:00:00.000Z', vehicleLabel: 'Giường nằm 40 chỗ', available: 12, held: 2, booked: 26, capacity: 40 },
      { tripId: 'trip-3', routeLabel: 'Đà Lạt → Sài Gòn', departureAt: '2026-07-18T15:45:00.000Z', vehicleLabel: 'Limousine 22 phòng', available: 8, held: 1, booked: 13, capacity: 22 },
    ],
    alerts: [
      { id: 'alert-capacity-trip-1', severity: 'warning', message: 'Chuyến 12:30 chỉ còn 5 ghế.' },
      { id: 'alert-wait-demo42', severity: 'danger', message: 'DEMO42 đã chờ hơn 3 phút.' },
    ],
  }
}

const sharedMemory = seededOperations()

export function createOperationsRepository(
  environment: Record<string, string | undefined> = process.env,
  memory: OperationsMemoryState = sharedMemory,
  ownership: OwnershipRepository = createOwnershipRepository(environment),
): OperationsRepository {
  return environment.DATABASE_URL?.trim()
    ? createNeonOperationsRepository(ownership)
    : createMemoryOperationsRepository(memory, ownership)
}

function createMemoryOperationsRepository(
  memory: OperationsMemoryState,
  ownership: OwnershipRepository,
): OperationsRepository {
  return {
    mode: 'memory',
    async getDashboard(at, options) {
      // Ownership lives in its own repository, so the fixture supplies the call
      // list and the ownership store supplies who actually holds each one.
      const owners = await ownership.getMany(memory.activeCalls.map((call) => call.sessionCode))
      return projectMemory(memory, at, owners, await ownership.listAudit(), options)
    },
    async getReport(range) {
      validateReportRange(range)
      return {
        mode: 'memory',
        freshAt: range.to,
        range: structuredClone(range),
        totals: {
          calls: memory.callsToday,
          confirmed: memory.confirmedBookings,
          conversionRate: percentage(memory.confirmedBookings, memory.callsToday),
          agentAssistRate: percentage(memory.assistedCalls, memory.callsToday),
        },
        outcomes: [
          { label: 'Đã xác nhận', count: memory.confirmedBookings },
          { label: 'Chưa hoàn tất', count: Math.max(0, memory.callsToday - memory.confirmedBookings) },
        ],
        routes: memory.departures.map((departure) => ({
          routeLabel: departure.routeLabel,
          booked: departure.booked,
          capacity: departure.capacity,
        })),
      }
    },
  }
}

function projectMemory(
  memory: OperationsMemoryState,
  at: string,
  owners: Map<string, SessionOwnership>,
  auditTrail: OperationsAuditEvent[],
  options: DashboardOptions | undefined,
): OperationsDashboardSnapshot {
  const activeCalls = memory.activeCalls.map((call) => {
    const owner = owners.get(call.sessionCode) ?? unassignedOwnership(call.sessionCode)
    return {
      ...structuredClone(call),
      ownerId: owner.ownerId,
      ownerRole: owner.ownerRole,
      delegation: owner.delegation,
      takeoverReason: owner.takeoverReason,
    }
  })

  return {
    mode: 'memory',
    freshAt: at,
    // Metrics describe the shift, not the current filter, so they are computed
    // before any search is applied.
    metrics: {
      queuedCalls: memory.queue.length,
      longestWaitSeconds: Math.max(0, ...memory.queue.map((call) => call.waitSeconds)),
      activeCalls: memory.activeCalls.length,
      callsToday: memory.callsToday,
      confirmedBookings: memory.confirmedBookings,
      conversionRate: percentage(memory.confirmedBookings, memory.callsToday),
      agentAssistRate: percentage(memory.assistedCalls, memory.callsToday),
    },
    queue: matchAll(structuredClone(memory.queue), options?.query, (call) => [call.sessionCode, call.routeLabel]),
    activeCalls: matchAll(activeCalls, options?.query, (call) => [
      call.sessionCode,
      call.bookingState,
      call.ownerId,
    ]),
    departures: structuredClone(memory.departures),
    alerts: structuredClone(memory.alerts),
    auditTrail,
  }
}

function matchAll<T>(items: T[], query: string | undefined, fields: (item: T) => Array<string | null>): T[] {
  const needle = query?.trim().toLowerCase()
  if (!needle) return items
  return items.filter((item) => fields(item).some((field) => field?.toLowerCase().includes(needle)))
}

function createNeonOperationsRepository(ownership: OwnershipRepository): OperationsRepository {
  const database = getDb()
  return {
    mode: 'neon',
    async getDashboard(at, options) {
      const now = new Date(at)
      const startOfDay = new Date(now)
      startOfDay.setUTCHours(0, 0, 0, 0)

      const [callRows, bookingRows, tripRows, routeRows, vehicleRows, seatRows, eventRows] = await Promise.all([
        database.select().from(busCalls),
        database.select().from(busBookings),
        database.select().from(catalogTrips),
        database.select().from(catalogRoutes),
        database.select().from(catalogVehicles),
        database.select().from(tripSeats),
        database.select().from(inventoryEvents),
      ])

      const bookingsByCall = new Map(bookingRows.map((booking) => [booking.callId, booking]))
      const callsToday = callRows.filter((call) => call.createdAt >= startOfDay && call.createdAt <= now)
      // Conversion compares today's confirmations with today's calls. Counting
      // every confirmation ever against today's calls could exceed 100%.
      const callsTodayIds = new Set(callsToday.map((call) => call.id))
      const confirmed = bookingRows.filter((booking) => booking.status === 'confirmed')
      const confirmedToday = confirmed.filter((booking) => callsTodayIds.has(booking.callId))
      const waiting = callRows.filter((call) => call.status === 'waiting')
      const active = callRows.filter((call) => !['waiting', 'ended'].includes(call.status))

      const queue = waiting.map((call) => {
        const booking = bookingsByCall.get(call.id)
        const since = call.startedAt ?? call.createdAt
        return {
          sessionCode: call.id,
          routeLabel: routeLabel(booking?.origin, booking?.destination),
          waitSeconds: Math.max(0, Math.floor((now.getTime() - since.getTime()) / 1000)),
          passengerCount: booking?.passengerCount ?? null,
        }
      }).sort((left, right) => right.waitSeconds - left.waitSeconds)

      const routesByVersionAndExternal = new Map(routeRows.map((route) => [
        `${route.catalogVersionId}:${route.externalId}`,
        route,
      ]))
      const vehiclesByVersionAndExternal = new Map(vehicleRows.map((vehicle) => [
        `${vehicle.catalogVersionId}:${vehicle.externalId}`,
        vehicle,
      ]))
      const seatsByTrip = new Map<string, typeof seatRows>()
      for (const seat of seatRows) {
        const seats = seatsByTrip.get(seat.tripId) ?? []
        seats.push(seat)
        seatsByTrip.set(seat.tripId, seats)
      }

      const departures = tripRows
        .filter((trip) => trip.departureAt >= now)
        .sort((left, right) => left.departureAt.getTime() - right.departureAt.getTime())
        .slice(0, 8)
        .map((trip) => {
          const route = routesByVersionAndExternal.get(`${trip.catalogVersionId}:${trip.routeExternalId}`)
          const vehicle = vehiclesByVersionAndExternal.get(`${trip.catalogVersionId}:${trip.vehicleExternalId}`)
          const seats = seatsByTrip.get(trip.id) ?? []
          return {
            tripId: trip.id,
            routeLabel: route ? routeLabel(route.origin, route.destination) : trip.routeExternalId,
            departureAt: trip.departureAt.toISOString(),
            vehicleLabel: vehicle?.label ?? trip.vehicleExternalId,
            available: seats.filter((seat) => seat.state === 'available').length,
            held: seats.filter((seat) => seat.state === 'held').length,
            booked: seats.filter((seat) => seat.state === 'booked').length,
            capacity: seats.length,
          }
        })

      const alerts: OperationsDashboardSnapshot['alerts'] = departures
        .filter((departure) => departure.capacity > 0 && departure.available <= 5)
        .map((departure) => ({
          id: `capacity-${departure.tripId}`,
          severity: departure.available === 0 ? 'danger' : 'warning',
          message: `${departure.routeLabel} chỉ còn ${departure.available} ghế.`,
        }))
      // Sorted explicitly: the driver returns rows in an unspecified order, so
      // "the five most recent events" was previously whatever came back last.
      const recentEvents = [...eventRows]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, 5)
      for (const event of recentEvents) {
        if (event.eventType !== 'hold.expired') continue
        alerts.push({ id: event.id, severity: 'info', message: `Giữ ghế ${event.holdId ?? ''} đã hết hạn.`.trim() })
      }

      return {
        mode: 'neon',
        freshAt: at,
        metrics: {
          queuedCalls: waiting.length,
          longestWaitSeconds: Math.max(0, ...queue.map((call) => call.waitSeconds)),
          activeCalls: active.length,
          callsToday: callsToday.length,
          confirmedBookings: confirmed.length,
          conversionRate: percentage(confirmedToday.length, callsToday.length),
          agentAssistRate: percentage(callsToday.filter((call) => call.mode === 'auto').length, callsToday.length),
        },
        queue: matchAll(queue, options?.query, (call) => [call.sessionCode, call.routeLabel]),
        // Ownership columns live on the same bus_calls row, so no extra query.
        activeCalls: matchAll(active.map((call) => ({
          sessionCode: call.id,
          ownerId: call.ownerId,
          ownerRole: call.ownerRole as SessionOwnership['ownerRole'],
          delegation: call.delegation === 'agent' ? 'agent' as const : 'staff' as const,
          takeoverReason: call.takeoverReason,
          authority: call.mode === 'auto' ? 'auto' as const : 'human' as const,
          bookingState: bookingsByCall.get(call.id)?.status ?? 'collecting',
          startedAt: (call.startedAt ?? call.createdAt).toISOString(),
        })), options?.query, (call) => [call.sessionCode, call.bookingState, call.ownerId]),
        departures,
        alerts,
        auditTrail: await ownership.listAudit(),
      }
    },
    async getReport(range) {
      validateReportRange(range)
      const from = new Date(range.from)
      const to = new Date(range.to)
      const [callRows, bookingRows, tripRows, routeRows, seatRows] = await Promise.all([
        database.select().from(busCalls),
        database.select().from(busBookings),
        database.select().from(catalogTrips),
        database.select().from(catalogRoutes),
        database.select().from(tripSeats),
      ])
      const calls = callRows.filter((call) => call.createdAt >= from && call.createdAt <= to)
      const callIds = new Set(calls.map((call) => call.id))
      const bookings = bookingRows.filter((booking) => callIds.has(booking.callId))
      const confirmed = bookings.filter((booking) => booking.status === 'confirmed')
      const routesByVersionAndExternal = new Map(routeRows.map((route) => [
        `${route.catalogVersionId}:${route.externalId}`,
        route,
      ]))
      const seatsByTrip = new Map<string, typeof seatRows>()
      for (const seat of seatRows) {
        const seats = seatsByTrip.get(seat.tripId) ?? []
        seats.push(seat)
        seatsByTrip.set(seat.tripId, seats)
      }
      const routeLoads = new Map<string, { booked: number; capacity: number }>()
      for (const trip of tripRows.filter((item) => item.departureAt >= from && item.departureAt <= to)) {
        const route = routesByVersionAndExternal.get(`${trip.catalogVersionId}:${trip.routeExternalId}`)
        const label = route ? routeLabel(route.origin, route.destination) : trip.routeExternalId
        const seats = seatsByTrip.get(trip.id) ?? []
        const current = routeLoads.get(label) ?? { booked: 0, capacity: 0 }
        current.booked += seats.filter((seat) => seat.state === 'booked').length
        current.capacity += seats.length
        routeLoads.set(label, current)
      }

      return {
        mode: 'neon',
        freshAt: new Date().toISOString(),
        range: structuredClone(range),
        totals: {
          calls: calls.length,
          confirmed: confirmed.length,
          conversionRate: percentage(confirmed.length, calls.length),
          agentAssistRate: percentage(calls.filter((call) => call.mode === 'auto').length, calls.length),
        },
        outcomes: [
          { label: 'Đã xác nhận', count: confirmed.length },
          { label: 'Chưa hoàn tất', count: Math.max(0, calls.length - confirmed.length) },
        ],
        routes: [...routeLoads.entries()].map(([routeLabel, load]) => ({ routeLabel, ...load })),
      }
    },
  }
}

function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  // Clamped because a rate above 100% on an operations dashboard reads as a
  // broken product rather than as the data problem it actually is. The real
  // fix is keeping numerator and denominator on the same window, which the
  // queries below now do.
  return Math.min(100, Math.round((numerator / denominator) * 100))
}

function routeLabel(origin: string | null | undefined, destination: string | null | undefined): string {
  return origin && destination ? `${origin} → ${destination}` : 'Chưa xác định tuyến'
}

function validateReportRange(range: { from: string; to: string }): void {
  const from = Date.parse(range.from)
  const to = Date.parse(range.to)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) throw new Error('INVALID_REPORT_RANGE')
  if (to - from > 90 * 24 * 60 * 60 * 1_000) throw new Error('REPORT_RANGE_TOO_LARGE')
}
