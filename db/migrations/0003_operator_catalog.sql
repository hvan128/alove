CREATE TABLE catalog_versions (
  id text PRIMARY KEY,
  version integer NOT NULL,
  revision integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  effective_from timestamptz NOT NULL,
  published_at timestamptz,
  published_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_versions_status_check CHECK (status IN ('draft', 'validated', 'published', 'retired')),
  CONSTRAINT catalog_versions_version_positive_check CHECK (version > 0),
  CONSTRAINT catalog_versions_revision_nonnegative_check CHECK (revision >= 0),
  CONSTRAINT catalog_versions_publish_metadata_check CHECK (
    (status IN ('published', 'retired') AND published_at IS NOT NULL AND published_by IS NOT NULL)
    OR (status IN ('draft', 'validated') AND published_at IS NULL AND published_by IS NULL)
  )
);
CREATE UNIQUE INDEX catalog_versions_version_unique ON catalog_versions(version);

CREATE TABLE operator_branches (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL
);
CREATE UNIQUE INDEX operator_branches_version_external_unique
  ON operator_branches(catalog_version_id, external_id);

CREATE TABLE catalog_stops (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  branch_external_id text NOT NULL,
  name text NOT NULL
);
CREATE UNIQUE INDEX catalog_stops_version_external_unique
  ON catalog_stops(catalog_version_id, external_id);

CREATE TABLE catalog_routes (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  origin text NOT NULL,
  destination text NOT NULL,
  stop_external_ids jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE UNIQUE INDEX catalog_routes_version_external_unique
  ON catalog_routes(catalog_version_id, external_id);

CREATE TABLE vehicle_templates (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  floors integer NOT NULL,
  CONSTRAINT vehicle_templates_floors_check CHECK (floors BETWEEN 1 AND 2)
);
CREATE UNIQUE INDEX vehicle_templates_version_external_unique
  ON vehicle_templates(catalog_version_id, external_id);

CREATE TABLE vehicle_template_seats (
  id text PRIMARY KEY,
  vehicle_template_id text NOT NULL REFERENCES vehicle_templates(id) ON DELETE CASCADE,
  seat_code text NOT NULL,
  floor integer NOT NULL,
  row integer NOT NULL,
  "column" integer NOT NULL,
  kind text NOT NULL,
  CONSTRAINT vehicle_template_seats_floor_check CHECK (floor BETWEEN 1 AND 2),
  CONSTRAINT vehicle_template_seats_row_check CHECK (row >= 0),
  CONSTRAINT vehicle_template_seats_column_check CHECK ("column" >= 0),
  CONSTRAINT vehicle_template_seats_kind_check CHECK (kind IN ('seat', 'double-bed', 'aisle', 'driver', 'blocked'))
);
CREATE UNIQUE INDEX vehicle_template_seats_template_code_unique
  ON vehicle_template_seats(vehicle_template_id, seat_code);
CREATE UNIQUE INDEX vehicle_template_seats_template_cell_unique
  ON vehicle_template_seats(vehicle_template_id, floor, row, "column");

CREATE TABLE catalog_vehicles (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  label text NOT NULL,
  template_external_id text NOT NULL,
  active boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX catalog_vehicles_version_external_unique
  ON catalog_vehicles(catalog_version_id, external_id);

CREATE TABLE fare_rules (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  route_external_id text NOT NULL,
  price_vnd integer NOT NULL,
  CONSTRAINT fare_rules_price_positive_check CHECK (price_vnd > 0)
);
CREATE UNIQUE INDEX fare_rules_version_external_unique
  ON fare_rules(catalog_version_id, external_id);

CREATE TABLE catalog_trips (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  route_external_id text NOT NULL,
  vehicle_external_id text NOT NULL,
  fare_external_id text NOT NULL,
  departure_at timestamptz NOT NULL,
  arrival_at timestamptz NOT NULL,
  CONSTRAINT catalog_trips_time_check CHECK (arrival_at > departure_at)
);
CREATE UNIQUE INDEX catalog_trips_version_external_unique
  ON catalog_trips(catalog_version_id, external_id);
