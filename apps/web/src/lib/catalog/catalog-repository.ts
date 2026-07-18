import type {
  CatalogDraft,
  CatalogValidationIssue,
  CatalogVersion,
  OperatorActor,
} from '@ordervoice/contracts'
import { catalogDraftSchema, catalogVersionSchema } from '@ordervoice/contracts'
import { publishCatalogDraft, retireCatalogVersion, validateCatalogDraft } from '@ordervoice/core'
import {
  catalogRouteStops,
  catalogRoutes,
  catalogSchedules,
  catalogSeatClasses,
  catalogStops,
  catalogTrips,
  catalogVehicles,
  catalogVersions,
  fareRules,
  getDb,
  operatorBranches,
  vehicleTemplateSeats,
  vehicleTemplates,
} from '@ordervoice/db'
import { and, asc, desc, eq, inArray, lte, sql } from 'drizzle-orm'
import { requireOperatorRole } from '../auth/operator-actor'
import { createOperatorDemoCatalog } from '../demo/operator-demo-state'

export type CatalogRepository = {
  mode: 'memory' | 'neon'
  createDraft(input: CatalogDraft, actor: OperatorActor): Promise<CatalogVersion>
  getVersion(id: string): Promise<CatalogVersion | null>
  listVersions(): Promise<CatalogVersion[]>
  saveDraft(input: CatalogDraft, expectedRevision: number, actor: OperatorActor): Promise<CatalogVersion>
  validate(id: string, expectedRevision: number, actor: OperatorActor): Promise<{
    version: CatalogVersion
    issues: CatalogValidationIssue[]
  }>
  publish(id: string, expectedRevision: number, actor: OperatorActor, now: string): Promise<CatalogVersion>
  retire(id: string, expectedRevision: number, actor: OperatorActor): Promise<CatalogVersion>
  getPublished(at: string): Promise<CatalogVersion | null>
}

export type CatalogMemoryStore = Map<string, CatalogVersion>

type CatalogRepositoryEnvironment = Record<string, string | undefined>
type CatalogRepositoryDependencies = { memory?: CatalogMemoryStore }

const sharedMemory = createCatalogMemoryStore()

export function createCatalogMemoryStore(): CatalogMemoryStore {
  return new Map()
}

export function createCatalogRepository(
  environment: CatalogRepositoryEnvironment = process.env,
  dependencies: CatalogRepositoryDependencies = {},
): CatalogRepository {
  const memory = dependencies.memory ?? sharedMemory
  if (!environment.DATABASE_URL?.trim()) {
    if (environment.OPERATOR_DEMO_MODE === 'true' && memory.size === 0) {
      const demo = createOperatorDemoCatalog()
      memory.set(demo.id, demo)
    }
    return createMemoryCatalogRepository(memory)
  }
  return createNeonCatalogRepository()
}

function createMemoryCatalogRepository(store: CatalogMemoryStore): CatalogRepository {
  return {
    mode: 'memory',
    async createDraft(input, actor) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      const draft = catalogDraftSchema.parse(structuredClone(input))
      if (store.has(draft.id) || [...store.values()].some((item) => item.version === draft.version)) {
        throw new Error('CATALOG_VERSION_CONFLICT')
      }
      const version = draftToVersion(draft)
      store.set(version.id, cloneVersion(version))
      return cloneVersion(version)
    },
    async getVersion(id) {
      const version = store.get(id)
      return version ? cloneVersion(version) : null
    },
    async listVersions() {
      return [...store.values()]
        .sort((left, right) => right.version - left.version)
        .map(cloneVersion)
    },
    async saveDraft(input, expectedRevision, actor) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      const current = requireVersion(store.get(input.id), expectedRevision)
      requireMutable(current)
      const parsed = catalogDraftSchema.parse(structuredClone(input))
      const saved = draftToVersion({ ...parsed, revision: current.revision + 1 })
      store.set(saved.id, cloneVersion(saved))
      return cloneVersion(saved)
    },
    async validate(id, expectedRevision, actor) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      const current = requireVersion(store.get(id), expectedRevision)
      requireMutable(current)
      const draft = versionToDraft(current)
      const issues = validateCatalogDraft(draft)
      const version = draftToVersion({
        ...draft,
        status: issues.some((issue) => issue.blocking) ? 'draft' : 'validated',
        revision: current.revision + 1,
      })
      store.set(id, cloneVersion(version))
      return { version: cloneVersion(version), issues: structuredClone(issues) }
    },
    async publish(id, expectedRevision, actor, now) {
      requireOperatorRole(actor, ['admin'])
      const current = requireVersion(store.get(id), expectedRevision)
      requireMutable(current)
      const published = {
        ...publishCatalogDraft(versionToDraft(current), actor, now),
        revision: current.revision + 1,
      }
      store.set(id, cloneVersion(published))
      return cloneVersion(published)
    },
    async retire(id, expectedRevision, actor) {
      requireOperatorRole(actor, ['admin'])
      const current = requireVersion(store.get(id), expectedRevision)
      const retired = retireCatalogVersion(current, actor)
      store.set(id, cloneVersion(retired))
      return cloneVersion(retired)
    },
    async getPublished(at) {
      const instant = Date.parse(at)
      const published = [...store.values()]
        .filter((item) => item.status === 'published' && Date.parse(item.effectiveFrom) <= instant)
        .sort((left, right) => right.version - left.version)[0]
      return published ? cloneVersion(published) : null
    },
  }
}

function createNeonCatalogRepository(): CatalogRepository {
  const database = getDb()

  return {
    mode: 'neon',
    async createDraft(input, actor) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      const draft = catalogDraftSchema.parse(structuredClone(input))
      return database.transaction(async (transaction) => {
        const version = draftToVersion(draft)
        await transaction.insert(catalogVersions).values(versionRow(version))
        await replaceChildren(transaction, version)
        return cloneVersion(version)
      })
    },
    async getVersion(id) {
      return database.transaction((transaction) => readVersion(transaction, id))
    },
    async listVersions() {
      return database.transaction(async (transaction) => {
        const rows = await transaction.select({ id: catalogVersions.id })
          .from(catalogVersions)
          .orderBy(desc(catalogVersions.version))
        const versions: CatalogVersion[] = []
        for (const row of rows) {
          const version = await readVersion(transaction, row.id)
          if (version) versions.push(version)
        }
        return versions
      })
    },
    async saveDraft(input, expectedRevision, actor) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      const parsed = catalogDraftSchema.parse(structuredClone(input))
      return database.transaction(async (transaction) => {
        const current = await lockVersion(transaction, parsed.id, expectedRevision)
        requireMutable(current)
        const saved = draftToVersion({ ...parsed, revision: current.revision + 1 })
        await transaction.update(catalogVersions).set(versionRow(saved)).where(eq(catalogVersions.id, saved.id))
        await replaceChildren(transaction, saved)
        return cloneVersion(saved)
      })
    },
    async validate(id, expectedRevision, actor) {
      requireOperatorRole(actor, ['admin', 'dispatcher'])
      return database.transaction(async (transaction) => {
        const current = await lockVersion(transaction, id, expectedRevision)
        requireMutable(current)
        const draft = versionToDraft(current)
        const issues = validateCatalogDraft(draft)
        const version = draftToVersion({
          ...draft,
          status: issues.some((issue) => issue.blocking) ? 'draft' : 'validated',
          revision: current.revision + 1,
        })
        await transaction.update(catalogVersions).set(versionRow(version)).where(eq(catalogVersions.id, id))
        return { version: cloneVersion(version), issues: structuredClone(issues) }
      })
    },
    async publish(id, expectedRevision, actor, now) {
      requireOperatorRole(actor, ['admin'])
      return database.transaction(async (transaction) => {
        const current = await lockVersion(transaction, id, expectedRevision)
        requireMutable(current)
        const version = {
          ...publishCatalogDraft(versionToDraft(current), actor, now),
          revision: current.revision + 1,
        }
        await transaction.update(catalogVersions).set(versionRow(version)).where(eq(catalogVersions.id, id))
        return cloneVersion(version)
      })
    },
    async retire(id, expectedRevision, actor) {
      requireOperatorRole(actor, ['admin'])
      return database.transaction(async (transaction) => {
        const current = await lockVersion(transaction, id, expectedRevision)
        const version = retireCatalogVersion(current, actor)
        await transaction.update(catalogVersions).set(versionRow(version)).where(eq(catalogVersions.id, id))
        return cloneVersion(version)
      })
    },
    async getPublished(at) {
      return database.transaction(async (transaction) => {
        const [row] = await transaction.select({ id: catalogVersions.id })
          .from(catalogVersions)
          .where(and(
            eq(catalogVersions.status, 'published'),
            lte(catalogVersions.effectiveFrom, new Date(at)),
          ))
          .orderBy(desc(catalogVersions.version))
          .limit(1)
        return row ? readVersion(transaction, row.id) : null
      })
    },
  }
}

type NeonDatabase = ReturnType<typeof getDb>
type NeonTransaction = Parameters<Parameters<NeonDatabase['transaction']>[0]>[0]

async function lockVersion(
  transaction: NeonTransaction,
  id: string,
  expectedRevision: number,
): Promise<CatalogVersion> {
  await transaction.execute(sql`SELECT id FROM ${catalogVersions} WHERE ${catalogVersions.id} = ${id} FOR UPDATE`)
  const current = await readVersion(transaction, id)
  return requireVersion(current ?? undefined, expectedRevision)
}

async function readVersion(
  transaction: NeonTransaction,
  id: string,
): Promise<CatalogVersion | null> {
  const [root] = await transaction.select().from(catalogVersions)
    .where(eq(catalogVersions.id, id)).limit(1)
  if (!root) return null

  const [branches, stops, routes, seatClasses, templates, vehicles, fares, schedules, trips] = await Promise.all([
    transaction.select().from(operatorBranches).where(eq(operatorBranches.catalogVersionId, id)),
    transaction.select().from(catalogStops).where(eq(catalogStops.catalogVersionId, id)),
    transaction.select().from(catalogRoutes).where(eq(catalogRoutes.catalogVersionId, id)),
    transaction.select().from(catalogSeatClasses).where(eq(catalogSeatClasses.catalogVersionId, id)),
    transaction.select().from(vehicleTemplates).where(eq(vehicleTemplates.catalogVersionId, id)),
    transaction.select().from(catalogVehicles).where(eq(catalogVehicles.catalogVersionId, id)),
    transaction.select().from(fareRules).where(eq(fareRules.catalogVersionId, id)),
    transaction.select().from(catalogSchedules).where(eq(catalogSchedules.catalogVersionId, id)),
    transaction.select().from(catalogTrips).where(eq(catalogTrips.catalogVersionId, id)),
  ])
  const templateIds = templates.map((template) => template.id)
  const seats = templateIds.length === 0
    ? []
    : await transaction.select().from(vehicleTemplateSeats)
      .where(inArray(vehicleTemplateSeats.vehicleTemplateId, templateIds))
      .orderBy(asc(vehicleTemplateSeats.floor), asc(vehicleTemplateSeats.row), asc(vehicleTemplateSeats.column))
  const routeIds = routes.map((route) => route.id)
  const routeStops = routeIds.length === 0
    ? []
    : await transaction.select().from(catalogRouteStops)
      .where(inArray(catalogRouteStops.catalogRouteId, routeIds))
      .orderBy(asc(catalogRouteStops.sequence))

  return catalogVersionSchema.parse({
    id: root.id,
    version: root.version,
    revision: root.revision,
    status: root.status,
    effectiveFrom: root.effectiveFrom.toISOString(),
    publishedAt: root.publishedAt?.toISOString() ?? null,
    publishedBy: root.publishedBy,
    branches: branches.map((item) => ({ id: item.externalId, name: item.name })),
    stops: stops.map((item) => ({ id: item.externalId, name: item.name, branchId: item.branchExternalId })),
    routes: routes.map((item) => ({
      id: item.externalId,
      origin: item.origin,
      destination: item.destination,
      stops: routeStops.filter((stop) => stop.catalogRouteId === item.id).map((stop) => ({
        stopId: stop.stopExternalId,
        role: stop.role,
        sequence: stop.sequence,
        offsetMinutes: stop.offsetMinutes,
      })),
    })),
    seatClasses: seatClasses.map((item) => ({
      id: item.externalId,
      name: item.name,
      priceMultiplierBps: item.priceMultiplierBps,
    })),
    vehicleTemplates: templates.map((template) => ({
      id: template.externalId,
      name: template.name,
      floors: template.floors,
      seats: seats.filter((seat) => seat.vehicleTemplateId === template.id).map((seat) => ({
        code: seat.seatCode,
        floor: seat.floor,
        row: seat.row,
        column: seat.column,
        kind: seat.kind,
        seatClassId: seat.seatClassExternalId,
      })),
    })),
    vehicles: vehicles.map((item) => ({
      id: item.externalId,
      label: item.label,
      templateId: item.templateExternalId,
      active: item.active,
    })),
    fares: fares.map((item) => ({
      id: item.externalId,
      routeId: item.routeExternalId,
      priceVnd: item.priceVnd,
      seatClassId: item.seatClassExternalId,
      effectiveFrom: item.effectiveFrom?.toISOString() ?? null,
      effectiveTo: item.effectiveTo?.toISOString() ?? null,
    })),
    schedules: schedules.map((item) => ({
      id: item.externalId,
      routeId: item.routeExternalId,
      vehicleId: item.vehicleExternalId,
      fareId: item.fareExternalId,
      weekdays: item.weekdays.split(',').filter(Boolean).map(Number),
      departureTime: item.departureTime,
      durationMinutes: item.durationMinutes,
      activeFrom: item.activeFrom.toISOString(),
      activeTo: item.activeTo?.toISOString() ?? null,
    })),
    trips: trips.map((item) => ({
      id: item.externalId,
      routeId: item.routeExternalId,
      vehicleId: item.vehicleExternalId,
      fareId: item.fareExternalId,
      departureAt: item.departureAt.toISOString(),
      arrivalAt: item.arrivalAt.toISOString(),
      declaredCapacity: item.declaredCapacity,
      scheduleId: item.scheduleExternalId,
    })),
  })
}

async function replaceChildren(transaction: NeonTransaction, version: CatalogVersion): Promise<void> {
  // Route stops and template seats cascade from their parent delete.
  await transaction.delete(catalogTrips).where(eq(catalogTrips.catalogVersionId, version.id))
  await transaction.delete(catalogSchedules).where(eq(catalogSchedules.catalogVersionId, version.id))
  await transaction.delete(fareRules).where(eq(fareRules.catalogVersionId, version.id))
  await transaction.delete(catalogVehicles).where(eq(catalogVehicles.catalogVersionId, version.id))
  await transaction.delete(vehicleTemplates).where(eq(vehicleTemplates.catalogVersionId, version.id))
  await transaction.delete(catalogSeatClasses).where(eq(catalogSeatClasses.catalogVersionId, version.id))
  await transaction.delete(catalogRoutes).where(eq(catalogRoutes.catalogVersionId, version.id))
  await transaction.delete(catalogStops).where(eq(catalogStops.catalogVersionId, version.id))
  await transaction.delete(operatorBranches).where(eq(operatorBranches.catalogVersionId, version.id))

  if (version.branches.length > 0) {
    await transaction.insert(operatorBranches).values(version.branches.map((item) => ({
      id: rowId(version.id, 'branch', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      name: item.name,
    })))
  }
  if (version.stops.length > 0) {
    await transaction.insert(catalogStops).values(version.stops.map((item) => ({
      id: rowId(version.id, 'stop', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      branchExternalId: item.branchId,
      name: item.name,
    })))
  }
  if (version.routes.length > 0) {
    await transaction.insert(catalogRoutes).values(version.routes.map((item) => ({
      id: rowId(version.id, 'route', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      origin: item.origin,
      destination: item.destination,
    })))
    const routeStops = version.routes.flatMap((route) => route.stops.map((stop) => ({
      id: rowId(version.id, `route:${route.id}:stop`, stop.stopId),
      catalogRouteId: rowId(version.id, 'route', route.id),
      stopExternalId: stop.stopId,
      role: stop.role,
      sequence: stop.sequence,
      offsetMinutes: stop.offsetMinutes,
    })))
    if (routeStops.length > 0) await transaction.insert(catalogRouteStops).values(routeStops)
  }
  if (version.seatClasses.length > 0) {
    await transaction.insert(catalogSeatClasses).values(version.seatClasses.map((item) => ({
      id: rowId(version.id, 'seat-class', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      name: item.name,
      priceMultiplierBps: item.priceMultiplierBps,
    })))
  }
  if (version.vehicleTemplates.length > 0) {
    await transaction.insert(vehicleTemplates).values(version.vehicleTemplates.map((item) => ({
      id: rowId(version.id, 'template', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      name: item.name,
      floors: item.floors,
    })))
    const seats = version.vehicleTemplates.flatMap((template) => template.seats.map((seat) => ({
      id: rowId(version.id, `template:${template.id}:seat`, seat.code),
      vehicleTemplateId: rowId(version.id, 'template', template.id),
      seatCode: seat.code,
      floor: seat.floor,
      row: seat.row,
      column: seat.column,
      kind: seat.kind,
      seatClassExternalId: seat.seatClassId,
    })))
    if (seats.length > 0) await transaction.insert(vehicleTemplateSeats).values(seats)
  }
  if (version.vehicles.length > 0) {
    await transaction.insert(catalogVehicles).values(version.vehicles.map((item) => ({
      id: rowId(version.id, 'vehicle', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      label: item.label,
      templateExternalId: item.templateId,
      active: item.active,
    })))
  }
  if (version.fares.length > 0) {
    await transaction.insert(fareRules).values(version.fares.map((item) => ({
      id: rowId(version.id, 'fare', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      routeExternalId: item.routeId,
      priceVnd: item.priceVnd,
      seatClassExternalId: item.seatClassId,
      effectiveFrom: item.effectiveFrom ? new Date(item.effectiveFrom) : null,
      effectiveTo: item.effectiveTo ? new Date(item.effectiveTo) : null,
    })))
  }
  if (version.schedules.length > 0) {
    await transaction.insert(catalogSchedules).values(version.schedules.map((item) => ({
      id: rowId(version.id, 'schedule', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      routeExternalId: item.routeId,
      vehicleExternalId: item.vehicleId,
      fareExternalId: item.fareId,
      weekdays: item.weekdays.join(','),
      departureTime: item.departureTime,
      durationMinutes: item.durationMinutes,
      activeFrom: new Date(item.activeFrom),
      activeTo: item.activeTo ? new Date(item.activeTo) : null,
    })))
  }
  if (version.trips.length > 0) {
    await transaction.insert(catalogTrips).values(version.trips.map((item) => ({
      id: rowId(version.id, 'trip', item.id),
      catalogVersionId: version.id,
      externalId: item.id,
      routeExternalId: item.routeId,
      vehicleExternalId: item.vehicleId,
      fareExternalId: item.fareId,
      scheduleExternalId: item.scheduleId,
      departureAt: new Date(item.departureAt),
      arrivalAt: new Date(item.arrivalAt),
      declaredCapacity: item.declaredCapacity,
    })))
  }
}

function draftToVersion(draft: CatalogDraft): CatalogVersion {
  return catalogVersionSchema.parse({
    ...structuredClone(draft),
    publishedAt: null,
    publishedBy: null,
  })
}

function versionToDraft(version: CatalogVersion): CatalogDraft {
  const { publishedAt: _publishedAt, publishedBy: _publishedBy, ...draft } = structuredClone(version)
  return catalogDraftSchema.parse(draft)
}

function requireVersion(version: CatalogVersion | undefined, expectedRevision: number): CatalogVersion {
  if (!version) throw new Error('CATALOG_NOT_FOUND')
  if (version.revision !== expectedRevision) throw new Error('CATALOG_VERSION_CONFLICT')
  return cloneVersion(version)
}

function requireMutable(version: CatalogVersion): void {
  if (version.status === 'published' || version.status === 'retired') {
    throw new Error('CATALOG_STATE_CONFLICT')
  }
}

function cloneVersion(version: CatalogVersion): CatalogVersion {
  return structuredClone(version)
}

function rowId(versionId: string, kind: string, externalId: string): string {
  return `${versionId}:${kind}:${externalId}`
}

function versionRow(version: CatalogVersion) {
  return {
    id: version.id,
    version: version.version,
    revision: version.revision,
    status: version.status,
    effectiveFrom: new Date(version.effectiveFrom),
    publishedAt: version.publishedAt ? new Date(version.publishedAt) : null,
    publishedBy: version.publishedBy,
    updatedAt: new Date(),
  }
}
