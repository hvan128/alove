import type { CatalogDraft } from '@ordervoice/contracts'

export type CsvRowResult = {
  row: number
  kind: 'route' | 'trip' | 'fare'
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
  'origin',
  'destination',
  'stopIds',
  'routeId',
  'priceVnd',
  'departureAt',
  'arrivalAt',
  'vehicleId',
  'fareId',
])

export function dryRunCatalogCsv(text: string, draft: CatalogDraft): CatalogCsvDryRun {
  const parsed = parseCsv(text)
  const headers = (parsed.rows.shift() ?? []).map((header, index) => (
    index === 0 ? header.replace(/^\uFEFF/u, '').trim() : header.trim()
  ))
  const unknownHeaderErrors = headers
    .filter((header) => !allowedHeaders.has(header))
    .map((header) => `UNKNOWN_HEADER:${header}`)
  const routeIds = new Set(draft.routes.map((item) => item.id))
  const fareIds = new Set(draft.fares.map((item) => item.id))
  const tripIds = new Set(draft.trips.map((item) => item.id))
  const vehicleIds = new Set(draft.vehicles.map((item) => item.id))

  const rows = parsed.rows
    .filter((cells) => cells.some((cell) => cell.trim() !== ''))
    .map((cells, index): CsvRowResult => {
      const value = Object.fromEntries(headers.map((header, column) => [header, cells[column]?.trim() ?? '']))
      const rawKind = value.kind
      const kind = rawKind === 'trip' || rawKind === 'fare' ? rawKind : 'route'
      const id = value.id ?? ''
      const errors = [...unknownHeaderErrors]

      if (parsed.unterminatedQuote) errors.push('MALFORMED_CSV')
      if (!rawKind || !['route', 'trip', 'fare'].includes(rawKind)) errors.push('UNKNOWN_KIND')
      if (!id) errors.push('MISSING_ID')

      if (kind === 'route') {
        validateRouteRow(value, errors)
        if (id && routeIds.has(id)) errors.push('DUPLICATE_ID')
        if (id) routeIds.add(id)
      } else if (kind === 'fare') {
        validateFareRow(value, errors, routeIds)
        if (id && fareIds.has(id)) errors.push('DUPLICATE_ID')
        if (id) fareIds.add(id)
      } else {
        validateTripRow(value, errors, routeIds, vehicleIds, fareIds)
        if (id && tripIds.has(id)) errors.push('DUPLICATE_ID')
        if (id) tripIds.add(id)
      }

      return { row: index + 2, kind, id, value, errors: [...new Set(errors)] }
    })

  return {
    rows,
    validRows: rows.filter((row) => row.errors.length === 0).length,
    invalidRows: rows.filter((row) => row.errors.length > 0).length,
  }
}

export function applyCatalogCsv(result: CatalogCsvDryRun, draft: CatalogDraft): CatalogDraft {
  const next = structuredClone(draft)

  for (const row of result.rows) {
    if (row.errors.length > 0) continue

    if (row.kind === 'route') {
      next.routes.push({
        id: row.id,
        origin: row.value.origin!,
        destination: row.value.destination!,
        stopIds: splitIds(row.value.stopIds),
      })
      continue
    }
    if (row.kind === 'fare') {
      next.fares.push({
        id: row.id,
        routeId: row.value.routeId!,
        priceVnd: Number(row.value.priceVnd),
      })
      continue
    }
    next.trips.push({
      id: row.id,
      routeId: row.value.routeId!,
      vehicleId: row.value.vehicleId!,
      fareId: row.value.fareId!,
      departureAt: new Date(row.value.departureAt!).toISOString(),
      arrivalAt: new Date(row.value.arrivalAt!).toISOString(),
    })
  }

  return next
}

function validateRouteRow(value: Record<string, string>, errors: string[]): void {
  if (!value.origin) errors.push('MISSING_ORIGIN')
  if (!value.destination) errors.push('MISSING_DESTINATION')
}

function validateFareRow(
  value: Record<string, string>,
  errors: string[],
  routeIds: Set<string>,
): void {
  if (!value.routeId || !routeIds.has(value.routeId)) errors.push('UNKNOWN_ROUTE')
  const price = Number(value.priceVnd)
  if (!Number.isSafeInteger(price) || price <= 0) errors.push('INVALID_PRICE_VND')
}

function validateTripRow(
  value: Record<string, string>,
  errors: string[],
  routeIds: Set<string>,
  vehicleIds: Set<string>,
  fareIds: Set<string>,
): void {
  if (!value.routeId || !routeIds.has(value.routeId)) errors.push('UNKNOWN_ROUTE')
  if (!value.vehicleId || !vehicleIds.has(value.vehicleId)) errors.push('UNKNOWN_VEHICLE')
  if (!value.fareId || !fareIds.has(value.fareId)) errors.push('UNKNOWN_FARE')
  if (!isDateTime(value.departureAt)) errors.push('INVALID_DEPARTURE_AT')
  if (!isDateTime(value.arrivalAt)) errors.push('INVALID_ARRIVAL_AT')
  if (isDateTime(value.departureAt) && isDateTime(value.arrivalAt)
    && Date.parse(value.arrivalAt!) <= Date.parse(value.departureAt!)) {
    errors.push('INVALID_TRIP_TIME')
  }
}

function isDateTime(value: string | undefined): value is string {
  return typeof value === 'string' && value.length > 0 && Number.isFinite(Date.parse(value))
}

function splitIds(value: string | undefined): string[] {
  return (value ?? '').split('|').map((item) => item.trim()).filter(Boolean)
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
