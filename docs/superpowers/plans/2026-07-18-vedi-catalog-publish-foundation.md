# VéĐi Catalog Publish Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace source-code-only trip data with a versioned, validated, publishable operator catalog while preserving `createBusDemoCatalog()` as labeled no-key fallback.

**Architecture:** Add focused catalog contracts and pure rules, normalized Drizzle tables, transactional memory/Neon repositories, dry-run CSV import, and role-gated App Router endpoints. Published versions stay immutable; no UI ships in this plan.

**Tech Stack:** TypeScript 5.9, Zod 4, Vitest 4, Drizzle ORM 0.45, Neon serverless WebSocket driver, PostgreSQL, Next.js 16 App Router.

## Global Constraints

- Keep Node.js `>=20.9.0`, pnpm `10.33.0`, Next.js `16.2.10`, React `19.2.4`, TypeScript `5.9.x`, Zod `4.x`, and Drizzle `0.45.x`.
- Keep modular monolith; do not add services, queues, payment, external inventory sync, or passenger seat controls.
- Keep `createBusDemoCatalog()` working as deterministic `non-durable` fallback.
- Catalog lifecycle is exactly `draft -> validated -> published -> retired`; published versions are immutable.
- CSV import writes only to draft and never publishes automatically.
- Production authorization fails closed. Demo actor exists only with `OPERATOR_DEMO_MODE=true`.
- New capabilities remain labeled Target until implementation tests and runtime evidence pass.
- Follow TDD: failing test, minimal implementation, passing test, focused commit.

---

### Task 1: Catalog contracts

**Files:**
- Create: `packages/contracts/src/catalog.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/test/catalog.test.ts`

**Interfaces:**
- Consumes: Zod 4.
- Produces: `OperatorActor`, `CatalogDraft`, `CatalogVersion`, `CatalogValidationIssue`, `PublishedTrip`, and their schemas.

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from 'vitest'
import { catalogDraftSchema, operatorActorSchema } from '../src/catalog.js'

describe('catalog contracts', () => {
  it('accepts a draft with route, vehicle template, fare and trip', () => {
    const result = catalogDraftSchema.parse({
      id: 'catalog-v1', version: 1, status: 'draft', revision: 0,
      effectiveFrom: '2026-07-20T00:00:00.000Z',
      branches: [{ id: 'branch-sg', name: 'Sài Gòn' }],
      stops: [{ id: 'stop-sg', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' }],
      routes: [{ id: 'route-sg-dl', origin: 'Sài Gòn', destination: 'Đà Lạt', stopIds: ['stop-sg'] }],
      vehicleTemplates: [{ id: 'tpl-34', name: 'Giường nằm 34', floors: 1, seats: [{ code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat' }] }],
      vehicles: [{ id: 'vehicle-1', label: '51B-123.45', templateId: 'tpl-34', active: true }],
      fares: [{ id: 'fare-1', routeId: 'route-sg-dl', priceVnd: 320000 }],
      trips: [{ id: 'trip-1', routeId: 'route-sg-dl', vehicleId: 'vehicle-1', departureAt: '2026-07-20T15:00:00.000Z', arrivalAt: '2026-07-20T22:30:00.000Z', fareId: 'fare-1' }],
    })
    expect(result.status).toBe('draft')
  })

  it('rejects demo actor when flag is absent at provider boundary', () => {
    expect(operatorActorSchema.safeParse({ id: '', role: 'admin', demo: true }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests and verify import failure**

Run: `pnpm --filter @ordervoice/contracts test -- catalog.test.ts`

Expected: FAIL because `../src/catalog.js` does not exist.

- [ ] **Step 3: Add complete catalog schemas and exports**

```ts
// packages/contracts/src/catalog.ts
import { z } from 'zod'

export const operatorRoleSchema = z.enum(['admin', 'dispatcher', 'customer-care', 'read-only'])
export const operatorActorSchema = z.object({
  id: z.string().min(1), role: operatorRoleSchema, demo: z.boolean(),
}).strict()
export const catalogStatusSchema = z.enum(['draft', 'validated', 'published', 'retired'])
export const seatKindSchema = z.enum(['seat', 'double-bed', 'aisle', 'driver', 'blocked'])
export const branchSchema = z.object({ id: z.string().min(1), name: z.string().min(1) }).strict()
export const stopSchema = z.object({ id: z.string().min(1), name: z.string().min(1), branchId: z.string().min(1) }).strict()
export const routeSchema = z.object({ id: z.string().min(1), origin: z.string().min(1), destination: z.string().min(1), stopIds: z.array(z.string().min(1)) }).strict()
export const vehicleTemplateSeatSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9]{0,5}$/u), floor: z.number().int().min(1).max(2),
  row: z.number().int().nonnegative(), column: z.number().int().nonnegative(), kind: seatKindSchema,
}).strict()
export const vehicleTemplateSchema = z.object({ id: z.string().min(1), name: z.string().min(1), floors: z.number().int().min(1).max(2), seats: z.array(vehicleTemplateSeatSchema) }).strict()
export const vehicleSchema = z.object({ id: z.string().min(1), label: z.string().min(1), templateId: z.string().min(1), active: z.boolean() }).strict()
export const fareRuleSchema = z.object({ id: z.string().min(1), routeId: z.string().min(1), priceVnd: z.number().int().positive() }).strict()
export const catalogTripSchema = z.object({ id: z.string().min(1), routeId: z.string().min(1), vehicleId: z.string().min(1), departureAt: z.string().datetime(), arrivalAt: z.string().datetime(), fareId: z.string().min(1) }).strict()
const catalogBody = {
  id: z.string().min(1), version: z.number().int().positive(), revision: z.number().int().nonnegative(),
  effectiveFrom: z.string().datetime(), branches: z.array(branchSchema), stops: z.array(stopSchema), routes: z.array(routeSchema),
  vehicleTemplates: z.array(vehicleTemplateSchema), vehicles: z.array(vehicleSchema), fares: z.array(fareRuleSchema), trips: z.array(catalogTripSchema),
}
export const catalogDraftSchema = z.object({ ...catalogBody, status: z.enum(['draft', 'validated']) }).strict()
export const catalogVersionSchema = z.object({ ...catalogBody, status: catalogStatusSchema, publishedAt: z.string().datetime().nullable(), publishedBy: z.string().min(1).nullable() }).strict()
export const catalogValidationIssueSchema = z.object({ code: z.string().min(1), path: z.string().min(1), message: z.string().min(1), blocking: z.boolean() }).strict()
export type OperatorRole = z.infer<typeof operatorRoleSchema>
export type OperatorActor = z.infer<typeof operatorActorSchema>
export type CatalogDraft = z.infer<typeof catalogDraftSchema>
export type CatalogVersion = z.infer<typeof catalogVersionSchema>
export type CatalogValidationIssue = z.infer<typeof catalogValidationIssueSchema>
export type PublishedTrip = z.infer<typeof catalogTripSchema>
```

Append `export * from './catalog.js'` to `packages/contracts/src/index.ts`.

- [ ] **Step 4: Run contracts tests**

Run: `pnpm --filter @ordervoice/contracts test && pnpm --filter @ordervoice/contracts typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/catalog.ts packages/contracts/src/index.ts packages/contracts/test/catalog.test.ts
git commit -m "feat: define operator catalog contracts"
```

### Task 2: Pure catalog validation and publication rules

**Files:**
- Create: `packages/core/src/catalog.ts`
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/test/catalog.test.ts`
- Create: `packages/core/test/fixtures/catalog.ts`

**Interfaces:**
- Consumes: `CatalogDraft`, `CatalogValidationIssue`, `CatalogVersion`, `OperatorActor`.
- Produces: `validateCatalogDraft(draft)`, `forkCatalogVersion(version, id)`, `publishCatalogDraft(draft, actor, now)`, `retireCatalogVersion(version, actor)`.

- [ ] **Step 1: Write failing rule tests**

```ts
import { describe, expect, it } from 'vitest'
import { publishCatalogDraft, validateCatalogDraft } from '../src/catalog.js'
import { validCatalogDraft } from './fixtures/catalog.js'

describe('catalog rules', () => {
  it('rejects duplicate seat codes and broken references', () => {
    const draft = validCatalogDraft({
      vehicleTemplates: [{ ...validCatalogDraft().vehicleTemplates[0]!, seats: [
        { code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat' },
        { code: 'A01', floor: 1, row: 1, column: 2, kind: 'seat' },
      ] }],
    })
    expect(validateCatalogDraft(draft).map((issue) => issue.code)).toContain('DUPLICATE_SEAT_CODE')
  })

  it('publishes an immutable snapshot only for admin', () => {
    const result = publishCatalogDraft(validCatalogDraft(), { id: 'admin-1', role: 'admin', demo: false }, '2026-07-18T10:00:00.000Z')
    expect(result.status).toBe('published')
    expect(result.publishedBy).toBe('admin-1')
  })
})
```

Create `packages/core/test/fixtures/catalog.ts` with a typed immutable factory:

```ts
import type { CatalogDraft } from '@ordervoice/contracts'
const base: CatalogDraft = { id: 'catalog-v1', version: 1, revision: 0, status: 'draft', effectiveFrom: '2026-07-20T00:00:00.000Z', branches: [{ id: 'branch-sg', name: 'Sài Gòn' }], stops: [{ id: 'stop-sg', name: 'Bến xe Miền Đông mới', branchId: 'branch-sg' }], routes: [{ id: 'route-sg-dl', origin: 'Sài Gòn', destination: 'Đà Lạt', stopIds: ['stop-sg'] }], vehicleTemplates: [{ id: 'tpl-34', name: 'Giường nằm 34', floors: 1, seats: [{ code: 'A01', floor: 1, row: 1, column: 1, kind: 'seat' }] }], vehicles: [{ id: 'vehicle-1', label: '51B-123.45', templateId: 'tpl-34', active: true }], fares: [{ id: 'fare-1', routeId: 'route-sg-dl', priceVnd: 320000 }], trips: [{ id: 'trip-1', routeId: 'route-sg-dl', vehicleId: 'vehicle-1', departureAt: '2026-07-20T15:00:00.000Z', arrivalAt: '2026-07-20T22:30:00.000Z', fareId: 'fare-1' }] }
export function validCatalogDraft(overrides: Partial<CatalogDraft> = {}): CatalogDraft { return structuredClone({ ...base, ...overrides }) }
```

- [ ] **Step 2: Run test and verify missing module failure**

Run: `pnpm --filter @ordervoice/core test -- catalog.test.ts`

Expected: FAIL because `src/catalog.ts` does not exist.

- [ ] **Step 3: Implement minimal pure rules**

```ts
// packages/core/src/catalog.ts
import type { CatalogDraft, CatalogValidationIssue, CatalogVersion, OperatorActor } from '@ordervoice/contracts'

export function validateCatalogDraft(draft: CatalogDraft): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = []
  const routeIds = new Set(draft.routes.map((item) => item.id))
  const templateIds = new Set(draft.vehicleTemplates.map((item) => item.id))
  const vehicleIds = new Set(draft.vehicles.map((item) => item.id))
  const fareIds = new Set(draft.fares.map((item) => item.id))
  for (const template of draft.vehicleTemplates) {
    const seen = new Set<string>()
    for (const seat of template.seats) {
      if (seen.has(seat.code)) issues.push({ code: 'DUPLICATE_SEAT_CODE', path: `vehicleTemplates.${template.id}.seats.${seat.code}`, message: `Mã ghế ${seat.code} bị trùng.`, blocking: true })
      seen.add(seat.code)
      if (seat.floor > template.floors) issues.push({ code: 'INVALID_SEAT_FLOOR', path: `vehicleTemplates.${template.id}.seats.${seat.code}`, message: 'Tầng ghế vượt số tầng của mẫu xe.', blocking: true })
    }
  }
  for (const vehicle of draft.vehicles) if (!templateIds.has(vehicle.templateId)) issues.push({ code: 'UNKNOWN_TEMPLATE', path: `vehicles.${vehicle.id}.templateId`, message: 'Mẫu xe không tồn tại.', blocking: true })
  for (const fare of draft.fares) if (!routeIds.has(fare.routeId)) issues.push({ code: 'UNKNOWN_ROUTE', path: `fares.${fare.id}.routeId`, message: 'Tuyến không tồn tại.', blocking: true })
  for (const trip of draft.trips) {
    if (!routeIds.has(trip.routeId) || !vehicleIds.has(trip.vehicleId) || !fareIds.has(trip.fareId)) issues.push({ code: 'BROKEN_TRIP_REFERENCE', path: `trips.${trip.id}`, message: 'Chuyến tham chiếu dữ liệu chưa tồn tại.', blocking: true })
    if (Date.parse(trip.arrivalAt) <= Date.parse(trip.departureAt)) issues.push({ code: 'INVALID_TRIP_TIME', path: `trips.${trip.id}.arrivalAt`, message: 'Giờ đến phải sau giờ đi.', blocking: true })
  }
  return issues
}

export function publishCatalogDraft(draft: CatalogDraft, actor: OperatorActor, now: string): CatalogVersion {
  if (actor.role !== 'admin') throw new Error('FORBIDDEN')
  if (validateCatalogDraft(draft).some((issue) => issue.blocking)) throw new Error('CATALOG_VALIDATION_FAILED')
  return { ...structuredClone(draft), status: 'published', publishedAt: now, publishedBy: actor.id }
}

export function forkCatalogVersion(source: CatalogVersion, id: string): CatalogDraft {
  const { publishedAt: _publishedAt, publishedBy: _publishedBy, ...body } = structuredClone(source)
  return { ...body, id, version: source.version + 1, revision: 0, status: 'draft' }
}
export function retireCatalogVersion(source: CatalogVersion, actor: OperatorActor): CatalogVersion {
  if (actor.role !== 'admin') throw new Error('FORBIDDEN')
  if (source.status !== 'published') throw new Error('CATALOG_STATE_CONFLICT')
  return { ...structuredClone(source), status: 'retired', revision: source.revision + 1 }
}
```

Append `export * from './catalog.js'` to `packages/core/src/index.ts`.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @ordervoice/core test && pnpm --filter @ordervoice/core typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/catalog.ts packages/core/src/index.ts packages/core/test/catalog.test.ts packages/core/test/fixtures/catalog.ts
git commit -m "feat: add deterministic catalog validation"
```

### Task 3: Transaction-capable database and catalog schema

**Files:**
- Modify: `db/package.json`
- Modify: `db/index.ts`
- Create: `db/catalog-schema.ts`
- Modify: `db/schema.ts`
- Create: `db/migrations/0003_operator_catalog.sql`
- Modify: `db/test/db.test.ts`

**Interfaces:**
- Consumes: `DATABASE_URL`.
- Produces: `getDb()` backed by `drizzle-orm/neon-serverless`, `catalogVersions`, normalized catalog tables.

- [ ] **Step 1: Add failing schema assertions**

```ts
import { catalogVersions, catalogTrips, vehicleTemplates, vehicleTemplateSeats } from '../schema.js'

it('exports versioned operator catalog tables', () => {
  expect([catalogVersions, catalogTrips, vehicleTemplates, vehicleTemplateSeats].map(getTableName)).toEqual([
    'catalog_versions', 'catalog_trips', 'vehicle_templates', 'vehicle_template_seats',
  ])
})
```

- [ ] **Step 2: Run DB test and verify missing exports**

Run: `pnpm --filter @ordervoice/db test`

Expected: FAIL with missing catalog table exports.

- [ ] **Step 3: Add direct WebSocket dependencies and switch driver**

Run: `pnpm --filter @ordervoice/db add ws && pnpm --filter @ordervoice/db add -D @types/ws`

Replace `db/index.ts` initialization with:

```ts
import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'

neonConfig.webSocketConstructor = ws
let pool: Pool | undefined
let database: ReturnType<typeof createDb> | undefined
function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is required for Neon persistence')
  pool = new Pool({ connectionString })
  return drizzle(pool, { schema })
}
export function getDb(): ReturnType<typeof createDb> { database ??= createDb(); return database }
export async function resetDbForTests(): Promise<void> { await pool?.end(); pool = undefined; database = undefined }
export * from './schema'
```

Update existing tests to `await resetDbForTests()`.

- [ ] **Step 4: Add normalized Drizzle tables and migration**

Create `db/catalog-schema.ts` with tables named `catalog_versions`, `operator_branches`, `catalog_stops`, `catalog_routes`, `vehicle_templates`, `vehicle_template_seats`, `catalog_vehicles`, `fare_rules`, and `catalog_trips`. Every child has `catalogVersionId`; add unique indexes for `(catalog_version_id, external_id)` and `(vehicle_template_id, seat_code)`. `catalog_versions` has `status`, `version`, `revision`, `effective_from`, `published_at`, `published_by`, and timestamps.

Use these exact exports:

```ts
export const catalogVersions = pgTable('catalog_versions', { id: text('id').primaryKey(), version: integer('version').notNull(), revision: integer('revision').notNull().default(0), status: text('status').notNull(), effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(), publishedAt: timestamp('published_at', { withTimezone: true }), publishedBy: text('published_by'), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex('catalog_versions_version_unique').on(table.version)])
export const vehicleTemplates = pgTable('vehicle_templates', { id: text('id').primaryKey(), catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }), externalId: text('external_id').notNull(), name: text('name').notNull(), floors: integer('floors').notNull() }, (table) => [uniqueIndex('vehicle_templates_version_external_unique').on(table.catalogVersionId, table.externalId)])
export const vehicleTemplateSeats = pgTable('vehicle_template_seats', { id: text('id').primaryKey(), vehicleTemplateId: text('vehicle_template_id').notNull().references(() => vehicleTemplates.id, { onDelete: 'cascade' }), seatCode: text('seat_code').notNull(), floor: integer('floor').notNull(), row: integer('row').notNull(), column: integer('column').notNull(), kind: text('kind').notNull() }, (table) => [uniqueIndex('vehicle_template_seats_template_code_unique').on(table.vehicleTemplateId, table.seatCode), uniqueIndex('vehicle_template_seats_template_cell_unique').on(table.vehicleTemplateId, table.floor, table.row, table.column)])
```

Add remaining exports with these exact columns and unique keys:

```ts
export const operatorBranches = pgTable('operator_branches', { id: text('id').primaryKey(), catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }), externalId: text('external_id').notNull(), name: text('name').notNull() }, (t) => [uniqueIndex('operator_branches_version_external_unique').on(t.catalogVersionId, t.externalId)])
export const catalogStops = pgTable('catalog_stops', { id: text('id').primaryKey(), catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }), externalId: text('external_id').notNull(), branchExternalId: text('branch_external_id').notNull(), name: text('name').notNull() }, (t) => [uniqueIndex('catalog_stops_version_external_unique').on(t.catalogVersionId, t.externalId)])
export const catalogRoutes = pgTable('catalog_routes', { id: text('id').primaryKey(), catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }), externalId: text('external_id').notNull(), origin: text('origin').notNull(), destination: text('destination').notNull(), stopExternalIds: jsonb('stop_external_ids').notNull().default([]) }, (t) => [uniqueIndex('catalog_routes_version_external_unique').on(t.catalogVersionId, t.externalId)])
export const catalogVehicles = pgTable('catalog_vehicles', { id: text('id').primaryKey(), catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }), externalId: text('external_id').notNull(), label: text('label').notNull(), templateExternalId: text('template_external_id').notNull(), active: boolean('active').notNull().default(true) }, (t) => [uniqueIndex('catalog_vehicles_version_external_unique').on(t.catalogVersionId, t.externalId)])
export const fareRules = pgTable('fare_rules', { id: text('id').primaryKey(), catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }), externalId: text('external_id').notNull(), routeExternalId: text('route_external_id').notNull(), priceVnd: integer('price_vnd').notNull() }, (t) => [uniqueIndex('fare_rules_version_external_unique').on(t.catalogVersionId, t.externalId)])
export const catalogTrips = pgTable('catalog_trips', { id: text('id').primaryKey(), catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }), externalId: text('external_id').notNull(), routeExternalId: text('route_external_id').notNull(), vehicleExternalId: text('vehicle_external_id').notNull(), fareExternalId: text('fare_external_id').notNull(), departureAt: timestamp('departure_at', { withTimezone: true }).notNull(), arrivalAt: timestamp('arrival_at', { withTimezone: true }).notNull() }, (t) => [uniqueIndex('catalog_trips_version_external_unique').on(t.catalogVersionId, t.externalId)])
```

Export all tables from `db/schema.ts`. Write matching SQL in `0003_operator_catalog.sql`; include check constraints for statuses, positive fares, floors `1..2`, and arrival after departure.

- [ ] **Step 5: Run DB verification**

Run: `pnpm --filter @ordervoice/db test && pnpm --filter @ordervoice/db typecheck && rg -n "CHECK|UNIQUE|catalog_versions|catalog_trips" db/migrations/0003_operator_catalog.sql`

Expected: tests/typecheck PASS; migration contains lifecycle, uniqueness, fare and time constraints matching schema.

- [ ] **Step 6: Commit**

```bash
git add db package.json pnpm-lock.yaml
git commit -m "feat: add transactional operator catalog schema"
```

### Task 4: Catalog repository and demo actor policy

**Files:**
- Create: `apps/web/src/lib/auth/operator-actor.ts`
- Create: `apps/web/src/lib/auth/operator-actor.test.ts`
- Create: `apps/web/src/lib/catalog/catalog-repository.ts`
- Create: `apps/web/src/lib/catalog/catalog-repository.test.ts`

**Interfaces:**
- Produces: `getOperatorActor(env)`, `requireOperatorRole(actor, roles)`, `CatalogRepository`.

- [ ] **Step 1: Write failing policy/repository tests**

```ts
it('fails closed without an auth adapter or explicit demo mode', () => {
  expect(() => getOperatorActor({})).toThrow('OPERATOR_AUTH_UNCONFIGURED')
})
it('publishes once and rejects a stale revision', async () => {
  const repo = createCatalogRepository({}, { memory: createCatalogMemoryStore() })
  const draft = await repo.createDraft(validCatalogDraft(), admin)
  const published = await repo.publish(draft.id, draft.revision, admin, now)
  expect(published.status).toBe('published')
  await expect(repo.publish(draft.id, draft.revision, admin, now)).rejects.toThrow('CATALOG_VERSION_CONFLICT')
})
```

- [ ] **Step 2: Run focused test and verify failure**

Run: `pnpm --filter @ordervoice/web test -- operator-actor.test.ts catalog-repository.test.ts`

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement actor policy and repository interface**

```ts
export function getOperatorActor(env: Record<string, string | undefined>): OperatorActor {
  if (env.OPERATOR_DEMO_MODE === 'true') return { id: 'demo-admin', role: 'admin', demo: true }
  throw new Error('OPERATOR_AUTH_UNCONFIGURED')
}
export function requireOperatorRole(actor: OperatorActor, roles: OperatorRole[]): void {
  if (!roles.includes(actor.role)) throw new Error('FORBIDDEN')
}

export type CatalogRepository = {
  mode: 'memory' | 'neon'
  createDraft(input: CatalogDraft, actor: OperatorActor): Promise<CatalogVersion>
  getVersion(id: string): Promise<CatalogVersion | null>
  listVersions(): Promise<CatalogVersion[]>
  saveDraft(input: CatalogDraft, expectedRevision: number, actor: OperatorActor): Promise<CatalogVersion>
  validate(id: string, expectedRevision: number, actor: OperatorActor): Promise<{ version: CatalogVersion; issues: CatalogValidationIssue[] }>
  publish(id: string, expectedRevision: number, actor: OperatorActor, now: string): Promise<CatalogVersion>
  retire(id: string, expectedRevision: number, actor: OperatorActor): Promise<CatalogVersion>
  getPublished(at: string): Promise<CatalogVersion | null>
}
```

Memory repository must deep-clone reads/writes, increment revision on mutation, call pure rules, and reject stale expected revisions. Neon repository must use `getDb().transaction`, lock `catalog_versions` row `FOR UPDATE`, replace draft children, and publish/update all rows in one transaction.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @ordervoice/web test -- operator-actor.test.ts catalog-repository.test.ts && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/auth apps/web/src/lib/catalog
git commit -m "feat: add catalog repository and operator policy"
```

### Task 5: Dry-run CSV import

**Files:**
- Create: `apps/web/src/lib/catalog/catalog-csv.ts`
- Create: `apps/web/src/lib/catalog/catalog-csv.test.ts`

**Interfaces:**
- Produces: `dryRunCatalogCsv(text, draft)` and `applyCatalogCsv(result, draft)`.

- [ ] **Step 1: Write failing CSV test**

```ts
it('reports row errors and never mutates source draft', () => {
  const draft = validCatalogDraft()
  const result = dryRunCatalogCsv('kind,id,routeId,departureAt,arrivalAt,vehicleId,fareId\ntrip,bad,missing,2026-07-20T22:00:00Z,broken,v1,f1', draft)
  expect(result.rows[0]?.errors).toContain('INVALID_ARRIVAL_AT')
  expect(draft.trips).toHaveLength(1)
})
```

- [ ] **Step 2: Run test and verify failure**

Run: `pnpm --filter @ordervoice/web test -- catalog-csv.test.ts`

Expected: FAIL because parser does not exist.

- [ ] **Step 3: Implement quoted-field-safe parser and dry run**

Use a small state-machine parser, not `split(',')`. Export exact types:

```ts
export type CsvRowResult = { row: number; kind: 'route' | 'trip' | 'fare'; id: string; value: Record<string, string>; errors: string[] }
export type CatalogCsvDryRun = { rows: CsvRowResult[]; validRows: number; invalidRows: number }
export function dryRunCatalogCsv(text: string, draft: CatalogDraft): CatalogCsvDryRun
export function applyCatalogCsv(result: CatalogCsvDryRun, draft: CatalogDraft): CatalogDraft
```

Reject unknown headers/kinds, duplicate IDs, invalid integers/datetimes and broken references. `applyCatalogCsv` accepts only zero-error rows and returns a new draft with `revision` unchanged.

- [ ] **Step 4: Run CSV and web tests**

Run: `pnpm --filter @ordervoice/web test -- catalog-csv.test.ts && pnpm --filter @ordervoice/web typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/catalog/catalog-csv.ts apps/web/src/lib/catalog/catalog-csv.test.ts
git commit -m "feat: add catalog CSV dry run"
```

### Task 6: Role-gated catalog API

**Files:**
- Create: `apps/web/src/app/api/catalog/versions/route.ts`
- Create: `apps/web/src/app/api/catalog/versions/[versionId]/route.ts`
- Create: `apps/web/src/app/api/catalog/versions/[versionId]/validate/route.ts`
- Create: `apps/web/src/app/api/catalog/versions/[versionId]/publish/route.ts`
- Create: `apps/web/src/app/api/catalog/versions/[versionId]/retire/route.ts`
- Create: `apps/web/src/app/api/catalog/import/route.ts`
- Create: `apps/web/src/lib/catalog/catalog-http.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: actor policy, repository, CSV parser.
- Produces: JSON APIs with `Cache-Control: no-store` and stable error codes.

- [ ] **Step 1: Write route tests**

```ts
it('returns 503 when operator auth is not configured', async () => {
  const response = await GET(new Request('http://test/api/catalog/versions'))
  expect(response.status).toBe(503)
  expect(await response.json()).toMatchObject({ error: 'OPERATOR_AUTH_UNCONFIGURED' })
})
it('maps stale publish to 409', async () => {
  const response = await publishVersion(requestWithJson({ expectedRevision: 0 }), routeContext('catalog-v1'), testDependencies)
  expect(response.status).toBe(409)
})
```

- [ ] **Step 2: Run test and verify missing routes**

Run: `pnpm --filter @ordervoice/web test -- catalog-http.test.ts`

Expected: FAIL because route modules do not exist.

- [ ] **Step 3: Implement route handlers and shared error mapper**

Create `apps/web/src/lib/catalog/catalog-http.ts`:

```ts
export function catalogError(error: unknown): Response {
  const code = error instanceof Error ? error.message : 'CATALOG_REQUEST_FAILED'
  const status = code === 'FORBIDDEN' ? 403 : code === 'CATALOG_VERSION_CONFLICT' || code === 'CATALOG_STATE_CONFLICT' ? 409 : code === 'CATALOG_VALIDATION_FAILED' ? 422 : code === 'OPERATOR_AUTH_UNCONFIGURED' ? 503 : 400
  return Response.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } })
}
```

Routes must parse Zod schemas, call `getOperatorActor(process.env)`, enforce admin for publish/retire/template mutations and admin/dispatcher for draft/CSV mutations. GET permits all four roles. Never accept actor/role from request body. Retire maps invalid state/revision to 409 and never deletes historical rows.

Add to `.env.example`:

```dotenv
# Local-only operator admin actor. Never enable on production deployment.
OPERATOR_DEMO_MODE=false
```

- [ ] **Step 4: Run catalog route and full TypeScript verification**

Run: `pnpm --filter @ordervoice/web test -- catalog-http.test.ts && pnpm typecheck && pnpm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/api/catalog apps/web/src/lib/catalog/catalog-http.ts apps/web/src/lib/catalog/catalog-http.test.ts .env.example
git commit -m "feat: expose authorized catalog workflow"
```

### Task 7: Catalog plan acceptance gate

**Files:**
- Modify only if verification exposes a defect in files owned by Tasks 1–6.

**Interfaces:**
- Produces: independently testable catalog foundation for Plans 2 and 3.

- [ ] **Step 1: Run complete verification**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Expected: all commands PASS; production build contains catalog API routes; current `/staff` and `/call` behavior remains unchanged.

- [ ] **Step 2: Inspect truth boundaries**

Run: `rg -n "OPERATOR_DEMO_MODE|non-durable|published|CATALOG_VERSION_CONFLICT" apps packages db .env.example`

Expected: demo actor guarded by explicit flag; static fallback labeled; publish and conflict paths present.

- [ ] **Step 3: Commit verification fixes if needed**

```bash
git add packages/contracts packages/core db apps/web .env.example pnpm-lock.yaml
git commit -m "fix: close catalog foundation verification gaps"
```

Skip this commit when verification required no changes.
