import type { CatalogDraft } from '@ordervoice/contracts'

export const csvKinds = ['branch', 'stop', 'route', 'seatClass', 'vehicle', 'fare', 'schedule', 'trip'] as const

export type CsvKind = (typeof csvKinds)[number]

export type CsvRowResult = {
  row: number
  kind: CsvKind
  id: string
  value: Record<string, string>
  errors: string[]
}

export type CatalogCsvDryRun = {
  rows: CsvRowResult[]
  validRows: number
  invalidRows: number
}

const allowedHeaders = new Set([
  'kind',
  'id',
  'name',
  'branchId',
  'origin',
  'destination',
  'stops',
  'priceMultiplierBps',
  'label',
  'templateId',
  'active',
  'routeId',
  'priceVnd',
  'seatClassId',
  'effectiveFrom',
  'effectiveTo',
  'weekdays',
  'departureTime',
  'durationMinutes',
  'activeFrom',
  'activeTo',
  'departureAt',
  'arrivalAt',
  'vehicleId',
  'fareId',
  'declaredCapacity',
])

const kindSet = new Set<string>(csvKinds)
const stopRoles = new Set(['pickup', 'dropoff', 'both'])

/**
 * Parses a catalog CSV and reports per-row errors without touching the draft.
 * `applyCatalogCsv` is the only writer, and it only accepts zero-error rows.
 */
export function dryRunCatalogCsv(text: string, draft: CatalogDraft): CatalogCsvDryRun {
  const parsed = parseCsv(text)
  const headers = (parsed.rows.shift() ?? []).map((header, index) => (
    index === 0 ? header.replace(/^\uFEFF/u, '').trim() : header.trim()
  ))
  const unknownHeaderErrors = headers
    .filter((header) => !allowedHeaders.has(header))
    .map((header) => `UNKNOWN_HEADER:${header}`)

  // Ids accumulate as rows are read so a later row can reference an earlier one.
  const known: Record<CsvKind, Set<string>> = {
    branch: new Set(draft.branches.map((item) => item.id)),
    stop: new Set(draft.stops.map((item) => item.id)),
    route: new Set(draft.routes.map((item) => item.id)),
    seatClass: new Set(draft.seatClasses.map((item) => item.id)),
    vehicle: new Set(draft.vehicles.map((item) => item.id)),
    fare: new Set(draft.fares.map((item) => item.id)),
    schedule: new Set(draft.schedules.map((item) => item.id)),
    trip: new Set(draft.trips.map((item) => item.id)),
  }
  const templateIds = new Set(draft.vehicleTemplates.map((item) => item.id))

  const rows = parsed.rows
    .filter((cells) => cells.some((cell) => cell.trim() !== ''))
    .map((cells, index): CsvRowResult => {
      const value = Object.fromEntries(headers.map((header, column) => [header, cells[column]?.trim() ?? '']))
      const rawKind = value.kind ?? ''
      const kind = (kindSet.has(rawKind) ? rawKind : 'route') as CsvKind
      const id = value.id ?? ''
      const errors = [...unknownHeaderErrors]

      if (parsed.unterminatedQuote) errors.push('MALFORMED_CSV')
      if (!kindSet.has(rawKind)) errors.push('UNKNOWN_KIND')
      if (!id) errors.push('MISSING_ID')
      if (id && known[kind].has(id)) errors.push('DUPLICATE_ID')

      validateRow(kind, value, errors, known, templateIds)
      if (id) known[kind].add(id)

      return { row: index + 2, kind, id, value, errors: [...new Set(errors)] }
    })

  return {
    rows,
    validRows: rows.filter((row) => row.errors.length === 0).length,
    invalidRows: rows.filter((row) => row.errors.length > 0).length,
  }
}

/** Appends only zero-error rows to a clone. Never publishes and never mutates `draft`. */
export function applyCatalogCsv(result: CatalogCsvDryRun, draft: CatalogDraft): CatalogDraft {
  const next = structuredClone(draft)

  for (const row of result.rows) {
    if (row.errors.length > 0) continue
    const value = row.value

    switch (row.kind) {
      case 'branch':
        next.branches.push({ id: row.id, name: value.name! })
        break
      case 'stop':
        next.stops.push({ id: row.id, name: value.name!, branchId: value.branchId! })
        break
      case 'route':
        next.routes.push({
          id: row.id,
          origin: value.origin!,
          destination: value.destination!,
          stops: parseRouteStops(value.stops),
        })
        break
      case 'seatClass':
        next.seatClasses.push({
          id: row.id,
          name: value.name!,
          priceMultiplierBps: value.priceMultiplierBps ? Number(value.priceMultiplierBps) : 10_000,
        })
        break
      case 'vehicle':
        next.vehicles.push({
          id: row.id,
          label: value.label!,
          templateId: value.templateId!,
          active: value.active !== 'false',
        })
        break
      case 'fare':
        next.fares.push({
          id: row.id,
          routeId: value.routeId!,
          priceVnd: Number(value.priceVnd),
          seatClassId: value.seatClassId || null,
          effectiveFrom: toIso(value.effectiveFrom),
          effectiveTo: toIso(value.effectiveTo),
        })
        break
      case 'schedule':
        next.schedules.push({
          id: row.id,
          routeId: value.routeId!,
          vehicleId: value.vehicleId!,
          fareId: value.fareId!,
          weekdays: parseWeekdays(value.weekdays),
          departureTime: value.departureTime!,
          durationMinutes: Number(value.durationMinutes),
          activeFrom: new Date(value.activeFrom!).toISOString(),
          activeTo: toIso(value.activeTo),
        })
        break
      case 'trip':
        next.trips.push({
          id: row.id,
          routeId: value.routeId!,
          vehicleId: value.vehicleId!,
          fareId: value.fareId!,
          departureAt: new Date(value.departureAt!).toISOString(),
          arrivalAt: new Date(value.arrivalAt!).toISOString(),
          declaredCapacity: value.declaredCapacity ? Number(value.declaredCapacity) : null,
          scheduleId: null,
        })
        break
    }
  }

  return next
}

function validateRow(
  kind: CsvKind,
  value: Record<string, string>,
  errors: string[],
  known: Record<CsvKind, Set<string>>,
  templateIds: Set<string>,
): void {
  switch (kind) {
    case 'branch':
      if (!value.name) errors.push('MISSING_NAME')
      break

    case 'stop':
      if (!value.name) errors.push('MISSING_NAME')
      if (!value.branchId || !known.branch.has(value.branchId)) errors.push('UNKNOWN_BRANCH')
      break

    case 'route': {
      if (!value.origin) errors.push('MISSING_ORIGIN')
      if (!value.destination) errors.push('MISSING_DESTINATION')
      validateRouteStops(value.stops, errors, known.stop)
      break
    }

    case 'seatClass':
      if (!value.name) errors.push('MISSING_NAME')
      if (value.priceMultiplierBps) {
        const multiplier = Number(value.priceMultiplierBps)
        if (!Number.isSafeInteger(multiplier) || multiplier <= 0) errors.push('INVALID_PRICE_MULTIPLIER')
      }
      break

    case 'vehicle':
      if (!value.label) errors.push('MISSING_LABEL')
      if (!value.templateId || !templateIds.has(value.templateId)) errors.push('UNKNOWN_TEMPLATE')
      if (value.active && value.active !== 'true' && value.active !== 'false') errors.push('INVALID_ACTIVE')
      break

    case 'fare': {
      if (!value.routeId || !known.route.has(value.routeId)) errors.push('UNKNOWN_ROUTE')
      const price = Number(value.priceVnd)
      if (!Number.isSafeInteger(price) || price <= 0) errors.push('INVALID_PRICE_VND')
      if (value.seatClassId && !known.seatClass.has(value.seatClassId)) errors.push('UNKNOWN_SEAT_CLASS')
      if (value.effectiveFrom && !isDateTime(value.effectiveFrom)) errors.push('INVALID_EFFECTIVE_FROM')
      if (value.effectiveTo && !isDateTime(value.effectiveTo)) errors.push('INVALID_EFFECTIVE_TO')
      if (isDateTime(value.effectiveFrom) && isDateTime(value.effectiveTo)
        && Date.parse(value.effectiveTo) <= Date.parse(value.effectiveFrom)) {
        errors.push('INVALID_FARE_WINDOW')
      }
      break
    }

    case 'schedule': {
      if (!value.routeId || !known.route.has(value.routeId)) errors.push('UNKNOWN_ROUTE')
      if (!value.vehicleId || !known.vehicle.has(value.vehicleId)) errors.push('UNKNOWN_VEHICLE')
      if (!value.fareId || !known.fare.has(value.fareId)) errors.push('UNKNOWN_FARE')
      if (!isWeekdayList(value.weekdays)) errors.push('INVALID_WEEKDAYS')
      if (!/^([01]\d|2[0-3]):[0-5]\d$/u.test(value.departureTime ?? '')) errors.push('INVALID_DEPARTURE_TIME')
      const duration = Number(value.durationMinutes)
      if (!Number.isSafeInteger(duration) || duration <= 0) errors.push('INVALID_DURATION_MINUTES')
      if (!isDateTime(value.activeFrom)) errors.push('INVALID_ACTIVE_FROM')
      if (value.activeTo && !isDateTime(value.activeTo)) errors.push('INVALID_ACTIVE_TO')
      break
    }

    case 'trip': {
      if (!value.routeId || !known.route.has(value.routeId)) errors.push('UNKNOWN_ROUTE')
      if (!value.vehicleId || !known.vehicle.has(value.vehicleId)) errors.push('UNKNOWN_VEHICLE')
      if (!value.fareId || !known.fare.has(value.fareId)) errors.push('UNKNOWN_FARE')
      if (!isDateTime(value.departureAt)) errors.push('INVALID_DEPARTURE_AT')
      if (!isDateTime(value.arrivalAt)) errors.push('INVALID_ARRIVAL_AT')
      if (isDateTime(value.departureAt) && isDateTime(value.arrivalAt)
        && Date.parse(value.arrivalAt) <= Date.parse(value.departureAt)) {
        errors.push('INVALID_TRIP_TIME')
      }
      if (value.declaredCapacity) {
        const capacity = Number(value.declaredCapacity)
        if (!Number.isSafeInteger(capacity) || capacity <= 0) errors.push('INVALID_DECLARED_CAPACITY')
      }
      break
    }
  }
}

/** `stops` is a pipe-separated list of `stopId:role[:offsetMinutes]` in boarding order. */
function validateRouteStops(raw: string | undefined, errors: string[], stopIds: Set<string>): void {
  const entries = splitList(raw)
  if (entries.length === 0) {
    errors.push('MISSING_ROUTE_STOPS')
    return
  }

  const seen = new Set<string>()
  let pickups = 0
  let dropoffs = 0

  for (const entry of entries) {
    const [stopId, role, offset] = entry.split(':')
    if (!stopId || !stopIds.has(stopId)) errors.push('UNKNOWN_STOP')
    if (!role || !stopRoles.has(role)) errors.push('INVALID_STOP_ROLE')
    if (offset !== undefined && !Number.isSafeInteger(Number(offset))) errors.push('INVALID_STOP_OFFSET')
    if (stopId && seen.has(stopId)) errors.push('DUPLICATE_ROUTE_STOP')
    if (stopId) seen.add(stopId)
    if (role === 'pickup' || role === 'both') pickups += 1
    if (role === 'dropoff' || role === 'both') dropoffs += 1
  }

  if (pickups === 0) errors.push('MISSING_PICKUP_STOP')
  if (dropoffs === 0) errors.push('MISSING_DROPOFF_STOP')
}

function parseRouteStops(raw: string | undefined): CatalogDraft['routes'][number]['stops'] {
  return splitList(raw).map((entry, index) => {
    const [stopId, role, offset] = entry.split(':')
    return {
      stopId: stopId!,
      role: role as 'pickup' | 'dropoff' | 'both',
      sequence: index,
      offsetMinutes: offset === undefined ? 0 : Number(offset),
    }
  })
}

function isWeekdayList(raw: string | undefined): boolean {
  const parts = splitList(raw, '|').flatMap((part) => part.split(','))
  return parts.length > 0 && parts.every((part) => /^[0-6]$/u.test(part))
}

function parseWeekdays(raw: string | undefined): number[] {
  return splitList(raw, '|').flatMap((part) => part.split(',')).map(Number)
}

function toIso(value: string | undefined): string | null {
  return isDateTime(value) ? new Date(value).toISOString() : null
}

function isDateTime(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
}

function splitList(value: string | undefined, separator = '|'): string[] {
  return (value ?? '').split(separator).map((item) => item.trim()).filter(Boolean)
}

function parseCsv(text: string): { rows: string[][]; unterminatedQuote: boolean } {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
      continue
    }
    if (character === ',' && !quoted) {
      row.push(field)
      field = ''
      continue
    }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      continue
    }
    field += character
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return { rows, unterminatedQuote: quoted }
}
