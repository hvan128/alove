ALTER TABLE bus_bookings
  ADD COLUMN runtime_profile text NOT NULL DEFAULT 'demo',
  ADD COLUMN catalog_version_id text REFERENCES catalog_versions(id),
  ADD COLUMN trip_id text REFERENCES catalog_trips(id),
  ADD COLUMN seat_hold_id text,
  ADD CONSTRAINT bus_bookings_runtime_profile_check CHECK (runtime_profile IN ('demo', 'durable'));

CREATE TABLE trip_seats (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES catalog_trips(id) ON DELETE CASCADE,
  seat_code text NOT NULL,
  state text NOT NULL DEFAULT 'available',
  revision integer NOT NULL DEFAULT 0,
  active_hold_id text,
  booking_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_seats_state_check CHECK (state IN ('available', 'held', 'booked', 'blocked')),
  CONSTRAINT trip_seats_revision_check CHECK (revision >= 0)
);
CREATE UNIQUE INDEX trip_seats_trip_code_unique ON trip_seats(trip_id, seat_code);

CREATE TABLE seat_holds (
  id text PRIMARY KEY,
  call_id text NOT NULL REFERENCES bus_calls(id) ON DELETE CASCADE,
  booking_draft_id text NOT NULL REFERENCES bus_bookings(id) ON DELETE CASCADE,
  trip_id text NOT NULL REFERENCES catalog_trips(id),
  actor_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  max_expires_at timestamptz NOT NULL,
  released_at timestamptz,
  consumed_at timestamptz,
  CONSTRAINT seat_holds_status_check CHECK (status IN ('active', 'released', 'expired', 'consumed')),
  CONSTRAINT seat_holds_expiry_check CHECK (expires_at > created_at AND max_expires_at >= expires_at)
);
CREATE INDEX seat_holds_call_status_idx ON seat_holds(call_id, status);
CREATE INDEX seat_holds_expiry_idx ON seat_holds(status, expires_at);

ALTER TABLE bus_bookings
  ADD CONSTRAINT bus_bookings_seat_hold_fk FOREIGN KEY (seat_hold_id) REFERENCES seat_holds(id);

CREATE TABLE seat_hold_items (
  hold_id text NOT NULL REFERENCES seat_holds(id) ON DELETE CASCADE,
  trip_seat_id text NOT NULL REFERENCES trip_seats(id),
  seat_code text NOT NULL,
  PRIMARY KEY (hold_id, trip_seat_id)
);

CREATE TABLE inventory_events (
  id text PRIMARY KEY,
  trip_id text NOT NULL,
  hold_id text,
  event_type text NOT NULL,
  actor_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inventory_events_trip_created_idx ON inventory_events(trip_id, created_at);

CREATE TABLE booking_confirmations (
  id text PRIMARY KEY,
  call_id text NOT NULL REFERENCES bus_calls(id),
  booking_draft_id text NOT NULL REFERENCES bus_bookings(id),
  hold_id text NOT NULL REFERENCES seat_holds(id),
  actor_id text NOT NULL,
  idempotency_scope text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  accepted_summary_hash text NOT NULL,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_confirmations_outcome_check CHECK (outcome IN ('confirmed'))
);
CREATE UNIQUE INDEX booking_confirmations_scope_key_unique
  ON booking_confirmations(idempotency_scope, idempotency_key);

CREATE TABLE confirmed_bookings (
  id text PRIMARY KEY,
  booking_code text NOT NULL,
  call_id text NOT NULL REFERENCES bus_calls(id),
  booking_draft_id text NOT NULL REFERENCES bus_bookings(id),
  confirmation_id text NOT NULL REFERENCES booking_confirmations(id),
  hold_id text NOT NULL REFERENCES seat_holds(id),
  snapshot jsonb NOT NULL,
  confirmed_at timestamptz NOT NULL
);
CREATE UNIQUE INDEX confirmed_bookings_code_unique ON confirmed_bookings(booking_code);
CREATE UNIQUE INDEX confirmed_bookings_confirmation_unique ON confirmed_bookings(confirmation_id);
