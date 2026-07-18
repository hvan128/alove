import type {
  CatalogDraft,
  CatalogValidationIssue,
  CatalogVersion,
  OperatorActor,
} from '@ordervoice/contracts'

export function validateCatalogDraft(draft: CatalogDraft): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const routeIds = new Set(draft.routes.map((item) => item.id))
  const templateIds = new Set(draft.vehicleTemplates.map((item) => item.id))
  const vehicleIds = new Set(draft.vehicles.map((item) => item.id))
  const fareIds = new Set(draft.fares.map((item) => item.id))

  for (const template of draft.vehicleTemplates) {
    const seen = new Set<string>()
    for (const seat of template.seats) {
      if (seen.has(seat.code)) {
        issues.push({
          code: 'DUPLICATE_SEAT_CODE',
          path: `vehicleTemplates.${template.id}.seats.${seat.code}`,
          message: `Mã ghế ${seat.code} bị trùng.`,
          blocking: true,
        })
      }
      seen.add(seat.code)

      if (seat.floor > template.floors) {
        issues.push({
          code: 'INVALID_SEAT_FLOOR',
          path: `vehicleTemplates.${template.id}.seats.${seat.code}`,
          message: 'Tầng ghế vượt số tầng của mẫu xe.',
          blocking: true,
        })
      }
    }
  }

  for (const vehicle of draft.vehicles) {
    if (!templateIds.has(vehicle.templateId)) {
      issues.push({
        code: 'UNKNOWN_TEMPLATE',
        path: `vehicles.${vehicle.id}.templateId`,
        message: 'Mẫu xe không tồn tại.',
        blocking: true,
      })
    }
  }

  for (const fare of draft.fares) {
    if (!routeIds.has(fare.routeId)) {
      issues.push({
        code: 'UNKNOWN_ROUTE',
        path: `fares.${fare.id}.routeId`,
        message: 'Tuyến không tồn tại.',
        blocking: true,
      })
    }
  }

  for (const trip of draft.trips) {
    if (!routeIds.has(trip.routeId) || !vehicleIds.has(trip.vehicleId) || !fareIds.has(trip.fareId)) {
      issues.push({
        code: 'BROKEN_TRIP_REFERENCE',
        path: `trips.${trip.id}`,
        message: 'Chuyến tham chiếu dữ liệu chưa tồn tại.',
        blocking: true,
      })
    }
    if (Date.parse(trip.arrivalAt) <= Date.parse(trip.departureAt)) {
      issues.push({
        code: 'INVALID_TRIP_TIME',
        path: `trips.${trip.id}.arrivalAt`,
        message: 'Giờ đến phải sau giờ đi.',
        blocking: true,
      })
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
