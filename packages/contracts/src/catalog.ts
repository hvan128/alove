import { z } from 'zod'

export const operatorRoleSchema = z.enum(['admin', 'dispatcher', 'customer-care', 'read-only'])

export const operatorActorSchema = z.object({
  id: z.string().min(1),
  role: operatorRoleSchema,
  demo: z.boolean(),
}).strict()

export const catalogStatusSchema = z.enum(['draft', 'validated', 'published', 'retired'])
export const seatKindSchema = z.enum(['seat', 'double-bed', 'aisle', 'driver', 'blocked'])

export const branchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
}).strict()

export const stopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  branchId: z.string().min(1),
}).strict()

export const routeSchema = z.object({
  id: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  stopIds: z.array(z.string().min(1)),
}).strict()

export const vehicleTemplateSeatSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9]{0,5}$/u),
  floor: z.number().int().min(1).max(2),
  row: z.number().int().nonnegative(),
  column: z.number().int().nonnegative(),
  kind: seatKindSchema,
}).strict()

export const vehicleTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  floors: z.number().int().min(1).max(2),
  seats: z.array(vehicleTemplateSeatSchema),
}).strict()

export const vehicleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  templateId: z.string().min(1),
  active: z.boolean(),
}).strict()

export const fareRuleSchema = z.object({
  id: z.string().min(1),
  routeId: z.string().min(1),
  priceVnd: z.number().int().positive(),
}).strict()

export const catalogTripSchema = z.object({
  id: z.string().min(1),
  routeId: z.string().min(1),
  vehicleId: z.string().min(1),
  departureAt: z.string().datetime(),
  arrivalAt: z.string().datetime(),
  fareId: z.string().min(1),
}).strict()

const catalogBody = {
  id: z.string().min(1),
  version: z.number().int().positive(),
  revision: z.number().int().nonnegative(),
  effectiveFrom: z.string().datetime(),
  branches: z.array(branchSchema),
  stops: z.array(stopSchema),
  routes: z.array(routeSchema),
  vehicleTemplates: z.array(vehicleTemplateSchema),
  vehicles: z.array(vehicleSchema),
  fares: z.array(fareRuleSchema),
  trips: z.array(catalogTripSchema),
}

export const catalogDraftSchema = z.object({
  ...catalogBody,
  status: z.enum(['draft', 'validated']),
}).strict()

export const catalogVersionSchema = z.object({
  ...catalogBody,
  status: catalogStatusSchema,
  publishedAt: z.string().datetime().nullable(),
  publishedBy: z.string().min(1).nullable(),
}).strict()

export const catalogValidationIssueSchema = z.object({
  code: z.string().min(1),
  path: z.string().min(1),
  message: z.string().min(1),
  blocking: z.boolean(),
}).strict()

export type OperatorRole = z.infer<typeof operatorRoleSchema>
export type OperatorActor = z.infer<typeof operatorActorSchema>
export type CatalogDraft = z.infer<typeof catalogDraftSchema>
export type CatalogVersion = z.infer<typeof catalogVersionSchema>
export type CatalogValidationIssue = z.infer<typeof catalogValidationIssueSchema>
export type PublishedTrip = z.infer<typeof catalogTripSchema>
