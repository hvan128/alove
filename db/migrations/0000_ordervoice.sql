CREATE TABLE conversations (
  id text PRIMARY KEY,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transcript_segments (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  provider_event_id text,
  speaker text NOT NULL,
  text text NOT NULL,
  started_at_ms integer NOT NULL,
  ended_at_ms integer NOT NULL,
  confidence real,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX transcript_segments_provider_event_unique ON transcript_segments(conversation_id, provider_event_id);

CREATE TABLE order_drafts (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  customer_id text,
  customer_name text,
  status text NOT NULL,
  approved_by text,
  approved_at timestamptz,
  external_reference text,
  exceptions jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_lines (
  id text PRIMARY KEY,
  order_draft_id text NOT NULL REFERENCES order_drafts(id) ON DELETE CASCADE,
  sku text,
  product_label text NOT NULL,
  quantity real,
  unit text,
  resolution text NOT NULL
);

CREATE TABLE order_evidence (
  id text PRIMARY KEY,
  order_line_id text NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  segment_id text NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
  quote text NOT NULL,
  start_ms integer NOT NULL,
  end_ms integer NOT NULL,
  confidence real NOT NULL
);

CREATE TABLE replies (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  text text NOT NULL,
  approved_for_speech boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE erp_exports (
  idempotency_key text PRIMARY KEY,
  order_draft_id text NOT NULL REFERENCES order_drafts(id) ON DELETE CASCADE,
  external_reference text NOT NULL,
  request_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
