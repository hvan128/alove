CREATE TABLE bus_calls (
  id text PRIMARY KEY,
  mode text NOT NULL,
  status text NOT NULL,
  is_demo boolean NOT NULL DEFAULT true,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bus_call_messages (
  id text PRIMARY KEY,
  call_id text NOT NULL REFERENCES bus_calls(id) ON DELETE CASCADE,
  provider_event_id text,
  role text NOT NULL,
  channel text NOT NULL,
  text text NOT NULL,
  final boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bus_call_messages_provider_event_unique ON bus_call_messages(call_id, provider_event_id);

CREATE TABLE bus_bookings (
  id text PRIMARY KEY,
  call_id text NOT NULL REFERENCES bus_calls(id) ON DELETE CASCADE,
  status text NOT NULL,
  origin text,
  destination text,
  travel_date_label text,
  time_window text,
  passenger_count integer,
  selected_trip jsonb,
  seats jsonb NOT NULL DEFAULT '[]'::jsonb,
  passenger_name text,
  phone text,
  total_fare_vnd integer,
  booking_code text,
  evidence_message_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bus_bookings_call_unique ON bus_bookings(call_id);
CREATE UNIQUE INDEX bus_bookings_code_unique ON bus_bookings(booking_code);

CREATE TABLE booking_audit_events (
  id text PRIMARY KEY,
  booking_id text NOT NULL REFERENCES bus_bookings(id) ON DELETE CASCADE,
  actor text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
