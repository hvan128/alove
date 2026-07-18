import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const catalogVersions = pgTable('catalog_versions', {
  id: text('id').primaryKey(),
  version: integer('version').notNull(),
  revision: integer('revision').notNull().default(0),
  status: text('status').notNull(),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: text('published_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('catalog_versions_version_unique').on(table.version),
])

export const operatorBranches = pgTable('operator_branches', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
}, (table) => [
  uniqueIndex('operator_branches_version_external_unique').on(table.catalogVersionId, table.externalId),
])

export const catalogStops = pgTable('catalog_stops', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  branchExternalId: text('branch_external_id').notNull(),
  name: text('name').notNull(),
}, (table) => [
  uniqueIndex('catalog_stops_version_external_unique').on(table.catalogVersionId, table.externalId),
])

export const catalogRoutes = pgTable('catalog_routes', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
}, (table) => [
  uniqueIndex('catalog_routes_version_external_unique').on(table.catalogVersionId, table.externalId),
])

/** Ordered pickup/drop-off points of a route (điểm đón/trả). */
export const catalogRouteStops = pgTable('catalog_route_stops', {
  id: text('id').primaryKey(),
  catalogRouteId: text('catalog_route_id').notNull().references(() => catalogRoutes.id, { onDelete: 'cascade' }),
  stopExternalId: text('stop_external_id').notNull(),
  role: text('role').notNull(),
  sequence: integer('sequence').notNull(),
  offsetMinutes: integer('offset_minutes').notNull().default(0),
}, (table) => [
  uniqueIndex('catalog_route_stops_route_stop_unique').on(table.catalogRouteId, table.stopExternalId),
])

/** Commercial seat class (loại ghế) priced as a multiple of the route fare. */
export const catalogSeatClasses = pgTable('catalog_seat_classes', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
  priceMultiplierBps: integer('price_multiplier_bps').notNull().default(10_000),
}, (table) => [
  uniqueIndex('catalog_seat_classes_version_external_unique').on(table.catalogVersionId, table.externalId),
])

export const vehicleTemplates = pgTable('vehicle_templates', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
  floors: integer('floors').notNull(),
}, (table) => [
  uniqueIndex('vehicle_templates_version_external_unique').on(table.catalogVersionId, table.externalId),
])

export const vehicleTemplateSeats = pgTable('vehicle_template_seats', {
  id: text('id').primaryKey(),
  vehicleTemplateId: text('vehicle_template_id').notNull().references(() => vehicleTemplates.id, { onDelete: 'cascade' }),
  seatCode: text('seat_code').notNull(),
  floor: integer('floor').notNull(),
  row: integer('row').notNull(),
  column: integer('column').notNull(),
  kind: text('kind').notNull(),
  seatClassExternalId: text('seat_class_external_id'),
}, (table) => [
  uniqueIndex('vehicle_template_seats_template_code_unique').on(table.vehicleTemplateId, table.seatCode),
  uniqueIndex('vehicle_template_seats_template_cell_unique').on(
    table.vehicleTemplateId,
    table.floor,
    table.row,
    table.column,
  ),
])

export const catalogVehicles = pgTable('catalog_vehicles', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  label: text('label').notNull(),
  templateExternalId: text('template_external_id').notNull(),
  active: boolean('active').notNull().default(true),
}, (table) => [
  uniqueIndex('catalog_vehicles_version_external_unique').on(table.catalogVersionId, table.externalId),
])

export const fareRules = pgTable('fare_rules', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  routeExternalId: text('route_external_id').notNull(),
  priceVnd: integer('price_vnd').notNull(),
  seatClassExternalId: text('seat_class_external_id'),
  effectiveFrom: timestamp('effective_from', { withTimezone: true }),
  effectiveTo: timestamp('effective_to', { withTimezone: true }),
}, (table) => [
  uniqueIndex('fare_rules_version_external_unique').on(table.catalogVersionId, table.externalId),
])

/** Recurring departure pattern (lịch chạy) expanded into concrete trips. */
export const catalogSchedules = pgTable('catalog_schedules', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  routeExternalId: text('route_external_id').notNull(),
  vehicleExternalId: text('vehicle_external_id').notNull(),
  fareExternalId: text('fare_external_id').notNull(),
  /** Comma-separated ISO weekday numbers, 0 = Sunday. */
  weekdays: text('weekdays').notNull(),
  departureTime: text('departure_time').notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  activeFrom: timestamp('active_from', { withTimezone: true }).notNull(),
  activeTo: timestamp('active_to', { withTimezone: true }),
}, (table) => [
  uniqueIndex('catalog_schedules_version_external_unique').on(table.catalogVersionId, table.externalId),
])

export const catalogTrips = pgTable('catalog_trips', {
  id: text('id').primaryKey(),
  catalogVersionId: text('catalog_version_id').notNull().references(() => catalogVersions.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  routeExternalId: text('route_external_id').notNull(),
  vehicleExternalId: text('vehicle_external_id').notNull(),
  fareExternalId: text('fare_external_id').notNull(),
  scheduleExternalId: text('schedule_external_id'),
  departureAt: timestamp('departure_at', { withTimezone: true }).notNull(),
  arrivalAt: timestamp('arrival_at', { withTimezone: true }).notNull(),
  declaredCapacity: integer('declared_capacity'),
}, (table) => [
  uniqueIndex('catalog_trips_version_external_unique').on(table.catalogVersionId, table.externalId),
])
