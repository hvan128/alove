ALTER TABLE bus_calls
  ADD COLUMN transcript_language text NOT NULL DEFAULT 'original',
  ADD COLUMN transport text NOT NULL DEFAULT 'local',
  ADD COLUMN agent_state text NOT NULL DEFAULT 'offline',
  ADD COLUMN valsea_state text NOT NULL DEFAULT 'unconfigured',
  ADD COLUMN revision integer NOT NULL DEFAULT 0,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE bus_call_events (
  id text PRIMARY KEY,
  call_id text NOT NULL REFERENCES bus_calls(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bus_call_events_call_event_unique
  ON bus_call_events(call_id, event_id);

ALTER TABLE bus_call_messages
  ADD COLUMN language text NOT NULL DEFAULT 'vi',
  ADD COLUMN translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN confidence real,
  ADD COLUMN started_at_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN ended_at_ms integer NOT NULL DEFAULT 0;

ALTER TABLE bus_bookings
  ADD COLUMN pickup_point text,
  ADD COLUMN dropoff_point text,
  ADD COLUMN vehicle_preference text,
  ADD COLUMN payment_method text,
  ADD COLUMN note text,
  ADD COLUMN field_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN confirmed_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN review_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN revision integer NOT NULL DEFAULT 0;
