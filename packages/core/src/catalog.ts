import {
  sellableSeatKinds,
  type CatalogDraft,
  type CatalogSchedule,
  type CatalogValidationIssue,
  type CatalogVersion,
  type FareRule,
  type OperatorActor,
  type PublishedTrip,
  type VehicleTemplate,
} from '@ordervoice/contracts'

const sellable = new Set<string>(sellableSeatKinds)
const dayMs = 86_400_000

/** Sức chứa is always counted from layout cells, never trusted from operator input. */
export function deriveTemplateCapacity(template: VehicleTemplate): number {
  return template.seats.filter((seat) => sellable.has(seat.kind)).length
}

/** Capacity of the template behind a trip's vehicle, or null when the reference is broken. */
export function resolveTripCapacity(draft: CatalogDraft, trip: PublishedTrip): number | null {
  const vehicle = draft.vehicles.find((item) => item.id === trip.vehicleId)
  if (!vehicle) return null
  const template = draft.vehicleTemplates.find((item) => item.id === vehicle.templateId)
  return template ? deriveTemplateCapacity(template) : null
}

/**
 * Expands a recurring lịch chạy into concrete trips over `[fromIso, toIso)`.
 * Deterministic and UTC-based: the same inputs always yield the same trip ids.
 */
export function expandSchedule(
  schedule: CatalogSchedule,
  fromIso: string,
  toIso: string,
): PublishedTrip[] {
  const from = Date.parse(fromIso)
  const to = Date.parse(toIso)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return []

  const activeFrom = Date.parse(schedule.activeFrom)
  const activeTo = schedule.activeTo === null ? Number.POSITIVE_INFINITY : Date.parse(schedule.activeTo)
  const weekdays = new Set(schedule.weekdays)
  const [hours, minutes] = schedule.departureTime.split(':').map(Number) as [number, number]

  const trips: PublishedTrip[] = []
  for (let cursor = startOfUtcDay(from); cursor < to; cursor += dayMs) {
    const day = new Date(cursor)
    if (!weekdays.has(day.getUTCDay())) continue

    const departure = cursor + hours * 3_600_000 + minutes * 60_000
    if (departure < from || departure >= to) continue
    if (departure < activeFrom || departure > activeTo) continue

    const departureAt = new Date(departure).toISOString()
    trips.push({
      id: `${schedule.id}:${departureAt.slice(0, 16)}`,
      routeId: schedule.routeId,
      vehicleId: schedule.vehicleId,
      fareId: schedule.fareId,
      departureAt,
      arrivalAt: new Date(departure + schedule.durationMinutes * 60_000).toISOString(),
      declaredCapacity: null,
      scheduleId: schedule.id,
    })
  }
  return trips
}

/**
 * Picks the fare in effect for a trip and seat class, then applies the class multiplier.
 * Class-specific rules win over the route-wide fallback.
 */
export function resolveFareForTrip(
  draft: CatalogDraft,
  trip: PublishedTrip,
  seatClassId: string | null,
  atIso: string = trip.departureAt,
): { fare: FareRule; priceVnd: number } | null {
  const at = Date.parse(atIso)
  const candidates = draft.fares.filter((fare) => (
    fare.routeId === trip.routeId
    && (fare.seatClassId === null || fare.seatClassId === seatClassId)
    && coversInstant(fare, at)
  ))
  // Prefer the class-specific rule; fall back to the route-wide one.
  const fare = candidates.find((item) => item.seatClassId !== null) ?? candidates[0]
  if (!fare) return null

  const seatClass = draft.seatClasses.find((item) => item.id === seatClassId)
  const multiplier = seatClass?.priceMultiplierBps ?? 10_000
  return { fare, priceVnd: Math.round((fare.priceVnd * multiplier) / 10_000) }
}

export function validateCatalogDraft(draft: CatalogDraft): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const push = (code: string, path: string, message: string, blocking = true): void => {
    issues.push({ code, path, message, blocking })
  }

  const branchIds = collectIds(draft.branches, 'branches', push)
  const stopIds = collectIds(draft.stops, 'stops', push)
  const routeIds = collectIds(draft.routes, 'routes', push)
  const seatClassIds = collectIds(draft.seatClasses, 'seatClasses', push)
  const templateIds = collectIds(draft.vehicleTemplates, 'vehicleTemplates', push)
  const vehicleIds = collectIds(draft.vehicles, 'vehicles', push)
  const fareIds = collectIds(draft.fares, 'fares', push)
  const scheduleIds = collectIds(draft.schedules, 'schedules', push)
  collectIds(draft.trips, 'trips', push)

  for (const stop of draft.stops) {
    if (!branchIds.has(stop.branchId)) {
      push('UNKNOWN_BRANCH', `stops.${stop.id}.branchId`, 'Chi nhánh không tồn tại.')
    }
  }

  for (const route of draft.routes) {
    const seen = new Set<string>()
    let pickups = 0
    let dropoffs = 0

    for (const routeStop of route.stops) {
      const path = `routes.${route.id}.stops.${routeStop.stopId}`
      if (!stopIds.has(routeStop.stopId)) {
        push('UNKNOWN_STOP', path, 'Điểm đón/trả không tồn tại.')
      }
      if (seen.has(routeStop.stopId)) {
        push('DUPLICATE_ROUTE_STOP', path, 'Điểm này đã có trong tuyến.')
      }
      seen.add(routeStop.stopId)
      if (routeStop.role === 'pickup' || routeStop.role === 'both') pickups += 1
      if (routeStop.role === 'dropoff' || routeStop.role === 'both') dropoffs += 1
    }

    if (pickups === 0) {
      push('MISSING_PICKUP_STOP', `routes.${route.id}.stops`, 'Tuyến phải có ít nhất một điểm đón.')
    }
    if (dropoffs === 0) {
      push('MISSING_DROPOFF_STOP', `routes.${route.id}.stops`, 'Tuyến phải có ít nhất một điểm trả.')
    }
  }

  for (const template of draft.vehicleTemplates) {
    const seenCodes = new Set<string>()
    const seenCells = new Set<string>()

    for (const seat of template.seats) {
      const path = `vehicleTemplates.${template.id}.seats.${seat.code}`
      if (seenCodes.has(seat.code)) {
        push('DUPLICATE_SEAT_CODE', path, `Mã ghế ${seat.code} bị trùng.`)
      }
      seenCodes.add(seat.code)

      const cell = `${seat.floor}:${seat.row}:${seat.column}`
      if (seenCells.has(cell)) {
        push('OVERLAPPING_SEAT_CELL', path, 'Hai ghế cùng chiếm một ô sơ đồ.')
      }
      seenCells.add(cell)

      if (seat.floor > template.floors) {
        push('INVALID_SEAT_FLOOR', path, 'Tầng ghế vượt số tầng của mẫu xe.')
      }
      if (seat.seatClassId !== null && !seatClassIds.has(seat.seatClassId)) {
        push('UNKNOWN_SEAT_CLASS', path, 'Loại ghế không tồn tại.')
      }
      if (seat.seatClassId === null && sellable.has(seat.kind)) {
        push('SEAT_CLASS_REQUIRED', path, 'Ghế bán được phải có loại ghế.')
      }
    }

    if (deriveTemplateCapacity(template) === 0) {
      push('EMPTY_TEMPLATE_CAPACITY', `vehicleTemplates.${template.id}.seats`, 'Mẫu xe chưa có ghế bán được.')
    }
  }

  for (const vehicle of draft.vehicles) {
    if (!templateIds.has(vehicle.templateId)) {
      push('UNKNOWN_TEMPLATE', `vehicles.${vehicle.id}.templateId`, 'Mẫu xe không tồn tại.')
    }
  }

  for (const fare of draft.fares) {
    if (!routeIds.has(fare.routeId)) {
      push('UNKNOWN_ROUTE', `fares.${fare.id}.routeId`, 'Tuyến không tồn tại.')
    }
    if (fare.seatClassId !== null && !seatClassIds.has(fare.seatClassId)) {
      push('UNKNOWN_SEAT_CLASS', `fares.${fare.id}.seatClassId`, 'Loại ghế không tồn tại.')
    }
    if (fare.effectiveFrom !== null && fare.effectiveTo !== null
      && Date.parse(fare.effectiveTo) <= Date.parse(fare.effectiveFrom)) {
      push('INVALID_FARE_WINDOW', `fares.${fare.id}.effectiveTo`, 'Ngày hết hiệu lực phải sau ngày bắt đầu.')
    }
  }

  for (const [index, fare] of draft.fares.entries()) {
    for (const other of draft.fares.slice(index + 1)) {
      if (fare.routeId !== other.routeId || fare.seatClassId !== other.seatClassId) continue
      if (!windowsOverlap(fare, other)) continue
      push(
        'FARE_EFFECTIVE_OVERLAP',
        `fares.${other.id}.effectiveFrom`,
        `Giá trùng khoảng hiệu lực với ${fare.id}.`,
      )
    }
  }

  for (const schedule of draft.schedules) {
    const path = `schedules.${schedule.id}`
    if (!routeIds.has(schedule.routeId) || !vehicleIds.has(schedule.vehicleId)
      || !fareIds.has(schedule.fareId)) {
      push('BROKEN_SCHEDULE_REFERENCE', path, 'Lịch chạy tham chiếu dữ liệu chưa tồn tại.')
    }
    if (schedule.activeTo !== null
      && Date.parse(schedule.activeTo) <= Date.parse(schedule.activeFrom)) {
      push('INVALID_SCHEDULE_WINDOW', `${path}.activeTo`, 'Ngày kết thúc phải sau ngày bắt đầu.')
    }
  }

  for (const trip of draft.trips) {
    if (!routeIds.has(trip.routeId) || !vehicleIds.has(trip.vehicleId) || !fareIds.has(trip.fareId)) {
      push('BROKEN_TRIP_REFERENCE', `trips.${trip.id}`, 'Chuyến tham chiếu dữ liệu chưa tồn tại.')
    }
    if (trip.scheduleId !== null && !scheduleIds.has(trip.scheduleId)) {
      push('BROKEN_TRIP_REFERENCE', `trips.${trip.id}.scheduleId`, 'Lịch chạy không tồn tại.')
    }
    if (Date.parse(trip.arrivalAt) <= Date.parse(trip.departureAt)) {
      push('INVALID_TRIP_TIME', `trips.${trip.id}.arrivalAt`, 'Giờ đến phải sau giờ đi.')
    }

    const capacity = resolveTripCapacity(draft, trip)
    if (trip.declaredCapacity !== null && capacity !== null && trip.declaredCapacity !== capacity) {
      push(
        'CAPACITY_MISMATCH',
        `trips.${trip.id}.declaredCapacity`,
        `Sức chứa khai báo (${trip.declaredCapacity}) khác sơ đồ ghế (${capacity}).`,
      )
    }
  }

  return issues
}

export function publishCatalogDraft(
  draft: CatalogDraft,
  actor: OperatorActor,
  now: string,
): CatalogVersion {
  if (actor.role !== 'admin') throw new Error('FORBIDDEN')
  if (validateCatalogDraft(draft).some((issue) => issue.blocking)) {
    throw new Error('CATALOG_VALIDATION_FAILED')
  }

  return {
    ...structuredClone(draft),
    status: 'published',
    publishedAt: now,
    publishedBy: actor.id,
  }
}

export function forkCatalogVersion(source: CatalogVersion, id: string): CatalogDraft {
  const { publishedAt: _publishedAt, publishedBy: _publishedBy, ...body } = structuredClone(source)
  return {
    ...body,
    id,
    version: source.version + 1,
    revision: 0,
    status: 'draft',
  }
}

export function retireCatalogVersion(source: CatalogVersion, actor: OperatorActor): CatalogVersion {
  if (actor.role !== 'admin') throw new Error('FORBIDDEN')
  if (source.status !== 'published') throw new Error('CATALOG_STATE_CONFLICT')

  return {
    ...structuredClone(source),
    status: 'retired',
    revision: source.revision + 1,
  }
}

function collectIds(
  items: ReadonlyArray<{ id: string }>,
  collection: string,
  push: (code: string, path: string, message: string) => void,
): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) {
      push('DUPLICATE_ENTITY_ID', `${collection}.${item.id}`, `Mã ${item.id} bị trùng.`)
    }
    ids.add(item.id)
  }
  return ids
}

function coversInstant(fare: FareRule, at: number): boolean {
  if (!Number.isFinite(at)) return false
  if (fare.effectiveFrom !== null && at < Date.parse(fare.effectiveFrom)) return false
  if (fare.effectiveTo !== null && at >= Date.parse(fare.effectiveTo)) return false
  return true
}

function windowsOverlap(left: FareRule, right: FareRule): boolean {
  const leftFrom = left.effectiveFrom === null ? Number.NEGATIVE_INFINITY : Date.parse(left.effectiveFrom)
  const leftTo = left.effectiveTo === null ? Number.POSITIVE_INFINITY : Date.parse(left.effectiveTo)
  const rightFrom = right.effectiveFrom === null ? Number.NEGATIVE_INFINITY : Date.parse(right.effectiveFrom)
  const rightTo = right.effectiveTo === null ? Number.POSITIVE_INFINITY : Date.parse(right.effectiveTo)
  return leftFrom < rightTo && rightFrom < leftTo
}

function startOfUtcDay(instant: number): number {
  return Math.floor(instant / dayMs) * dayMs
}
