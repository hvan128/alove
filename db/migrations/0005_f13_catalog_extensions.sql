-- F-13 bus-operator data management: seat classes (loại ghế), route pickup/drop-off
-- roles (điểm đón/trả), recurring schedules (lịch chạy), fare effective windows and
-- declared trip capacity (sức chứa).

CREATE TABLE catalog_seat_classes (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  price_multiplier_bps integer NOT NULL DEFAULT 10000,
  CONSTRAINT catalog_seat_classes_multiplier_check
    CHECK (price_multiplier_bps BETWEEN 1 AND 1000000)
);
CREATE UNIQUE INDEX catalog_seat_classes_version_external_unique
  ON catalog_seat_classes(catalog_version_id, external_id);

CREATE TABLE catalog_route_stops (
  id text PRIMARY KEY,
  catalog_route_id text NOT NULL REFERENCES catalog_routes(id) ON DELETE CASCADE,
  stop_external_id text NOT NULL,
  role text NOT NULL,
  sequence integer NOT NULL,
  offset_minutes integer NOT NULL DEFAULT 0,
  CONSTRAINT catalog_route_stops_role_check CHECK (role IN ('pickup', 'dropoff', 'both')),
  CONSTRAINT catalog_route_stops_sequence_check CHECK (sequence >= 0),
  CONSTRAINT catalog_route_stops_offset_check CHECK (offset_minutes >= 0)
);
CREATE UNIQUE INDEX catalog_route_stops_route_stop_unique
  ON catalog_route_stops(catalog_route_id, stop_external_id);

CREATE TABLE catalog_schedules (
  id text PRIMARY KEY,
  catalog_version_id text NOT NULL REFERENCES catalog_versions(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  route_external_id text NOT NULL,
  vehicle_external_id text NOT NULL,
  fare_external_id text NOT NULL,
  weekdays text NOT NULL,
  departure_time text NOT NULL,
  duration_minutes integer NOT NULL,
  active_from timestamptz NOT NULL,
  active_to timestamptz,
  CONSTRAINT catalog_schedules_weekdays_check CHECK (weekdays ~ '^[0-6](,[0-6])*$'),
  CONSTRAINT catalog_schedules_departure_time_check
    CHECK (departure_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  CONSTRAINT catalog_schedules_duration_check CHECK (duration_minutes > 0),
  CONSTRAINT catalog_schedules_window_check CHECK (active_to IS NULL OR active_to > active_from)
);
CREATE UNIQUE INDEX catalog_schedules_version_external_unique
  ON catalog_schedules(catalog_version_id, external_id);

-- Route stops move from an unordered jsonb id list to a table that can carry a role.
ALTER TABLE catalog_routes DROP COLUMN stop_external_ids;

ALTER TABLE vehicle_template_seats ADD COLUMN seat_class_external_id text;

ALTER TABLE fare_rules ADD COLUMN seat_class_external_id text;
ALTER TABLE fare_rules ADD COLUMN effective_from timestamptz;
ALTER TABLE fare_rules ADD COLUMN effective_to timestamptz;
ALTER TABLE fare_rules ADD CONSTRAINT fare_rules_window_check
  CHECK (effective_from IS NULL OR effective_to IS NULL OR effective_to > effective_from);

ALTER TABLE catalog_trips ADD COLUMN schedule_external_id text;
ALTER TABLE catalog_trips ADD COLUMN declared_capacity integer;
ALTER TABLE catalog_trips ADD CONSTRAINT catalog_trips_declared_capacity_check
  CHECK (declared_capacity IS NULL OR declared_capacity > 0);
