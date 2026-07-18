import type { CatalogDraft, OperatorActor } from '@ordervoice/contracts'
import { catalogDraftSchema } from '@ordervoice/contracts'
import { z, ZodError } from 'zod'
import { getOperatorActor, requireOperatorRole } from '../auth/operator-actor'
import { applyCatalogCsv, dryRunCatalogCsv } from './catalog-csv'
import { createCatalogRepository, type CatalogRepository } from './catalog-repository'
import { assertLiveSyncContracted, readLiveSyncStatus } from './catalog-sync'

export type CatalogRouteContext = { params: Promise<{ versionId: string }> }
export type CatalogHttpDependencies = {
  getActor: () => OperatorActor
  getRepository: () => CatalogRepository
  getEnv: () => Record<string, string | undefined>
}

const defaultDependencies: CatalogHttpDependencies = {
  getActor: () => getOperatorActor(process.env),
  getRepository: () => createCatalogRepository(),
  getEnv: () => process.env,
}

const expectedRevisionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
}).strict()

const saveDraftSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  catalog: catalogDraftSchema,
}).strict()

const importSchema = z.object({
  versionId: z.string().min(1),
  expectedRevision: z.number().int().nonnegative(),
  csv: z.string().min(1),
  apply: z.boolean().default(false),
}).strict()

export async function listVersions(
  _request: Request,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care', 'read-only'])
    const repository = dependencies.getRepository()
    return noStoreJson({
      mode: repository.mode,
      durable: repository.mode === 'neon',
      versions: await repository.listVersions(),
    })
  })
}

export async function createVersion(
  request: Request,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher'])
    const repository = dependencies.getRepository()
    const catalog = catalogDraftSchema.parse(await request.json())
    return noStoreJson({ version: await repository.createDraft(catalog, actor) }, 201)
  })
}

export async function getVersion(
  _request: Request,
  context: CatalogRouteContext,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care', 'read-only'])
    const repository = dependencies.getRepository()
    const version = await repository.getVersion((await context.params).versionId)
    if (!version) throw new Error('CATALOG_NOT_FOUND')
    return noStoreJson({ mode: repository.mode, durable: repository.mode === 'neon', version })
  })
}

export async function saveVersion(
  request: Request,
  context: CatalogRouteContext,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher'])
    const { versionId } = await context.params
    const body = saveDraftSchema.parse(await request.json())
    if (body.catalog.id !== versionId) throw new Error('CATALOG_ID_MISMATCH')
    const version = await dependencies.getRepository()
      .saveDraft(body.catalog, body.expectedRevision, actor)
    return noStoreJson({ version })
  })
}

export async function validateVersion(
  request: Request,
  context: CatalogRouteContext,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher'])
    const body = expectedRevisionSchema.parse(await request.json())
    const result = await dependencies.getRepository().validate(
      (await context.params).versionId,
      body.expectedRevision,
      actor,
    )
    return noStoreJson(result)
  })
}

export async function publishVersion(
  request: Request,
  context: CatalogRouteContext,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin'])
    const body = expectedRevisionSchema.parse(await request.json())
    const version = await dependencies.getRepository().publish(
      (await context.params).versionId,
      body.expectedRevision,
      actor,
      new Date().toISOString(),
    )
    return noStoreJson({ version })
  })
}

export async function retireVersion(
  request: Request,
  context: CatalogRouteContext,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin'])
    const body = expectedRevisionSchema.parse(await request.json())
    const version = await dependencies.getRepository().retire(
      (await context.params).versionId,
      body.expectedRevision,
      actor,
    )
    return noStoreJson({ version })
  })
}

export async function importCatalogCsv(
  request: Request,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher'])
    const body = importSchema.parse(await request.json())
    const repository = dependencies.getRepository()
    const version = await repository.getVersion(body.versionId)
    if (!version) throw new Error('CATALOG_NOT_FOUND')
    const draft = toDraft(version)
    const dryRun = dryRunCatalogCsv(body.csv, draft)

    if (!body.apply) return noStoreJson({ dryRun })
    if (dryRun.invalidRows > 0) throw new Error('CATALOG_CSV_INVALID')

    const saved = await repository.saveDraft(
      applyCatalogCsv(dryRun, draft),
      body.expectedRevision,
      actor,
    )
    return noStoreJson({ dryRun, version: saved })
  })
}

/** Reports whether live operator sync is contracted. Never performs a sync itself. */
export async function getSyncStatus(
  _request: Request,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin', 'dispatcher', 'customer-care', 'read-only'])
    return noStoreJson(readLiveSyncStatus(dependencies.getEnv()))
  })
}

export async function triggerSync(
  _request: Request,
  dependencies: CatalogHttpDependencies = defaultDependencies,
): Promise<Response> {
  return handleCatalogRequest(async () => {
    const actor = dependencies.getActor()
    requireOperatorRole(actor, ['admin'])
    // Throws unless a contract and passing reconciliation both exist.
    assertLiveSyncContracted(dependencies.getEnv())
    // Contracted but unimplemented: no adapter may claim a live operator sync yet.
    return noStoreJson({ error: 'LIVE_SYNC_ADAPTER_UNAVAILABLE' }, 501)
  })
}

export function catalogError(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof ZodError) {
    return noStoreJson({ error: 'INVALID_CATALOG_REQUEST' }, 400)
  }
  const code = error instanceof Error ? error.message : 'CATALOG_REQUEST_FAILED'
  const status = code === 'FORBIDDEN'
    ? 403
    : code === 'CATALOG_NOT_FOUND'
      ? 404
      : code === 'CATALOG_VERSION_CONFLICT' || code === 'CATALOG_STATE_CONFLICT'
        ? 409
        : code === 'CATALOG_VALIDATION_FAILED' || code === 'CATALOG_CSV_INVALID'
          ? 422
          : code === 'OPERATOR_AUTH_UNCONFIGURED' || code === 'LIVE_SYNC_NOT_CONTRACTED'
            ? 503
            : 400
  return noStoreJson({ error: code }, status)
}

async function handleCatalogRequest(action: () => Promise<Response>): Promise<Response> {
  try {
    return await action()
  } catch (error) {
    return catalogError(error)
  }
}

function noStoreJson(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function toDraft(version: Awaited<ReturnType<CatalogRepository['getVersion']>> & {}): CatalogDraft {
  if (version.status === 'published' || version.status === 'retired') {
    throw new Error('CATALOG_STATE_CONFLICT')
  }
  const { publishedAt: _publishedAt, publishedBy: _publishedBy, ...draft } = structuredClone(version)
  return catalogDraftSchema.parse(draft)
}
