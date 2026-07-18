-- F-12 enterprise operations: session ownership, Agent delegation and a
-- cross-session audit trail.
--
-- booking_audit_events already exists but hangs off booking_id, so it can only
-- describe a session that already produced a booking draft. Accepting,
-- delegating and taking over all happen before that and across sessions, which
-- is what the operations dashboard has to show.

ALTER TABLE bus_calls
  ADD COLUMN owner_id text,
  ADD COLUMN owner_role text,
  ADD COLUMN accepted_at timestamptz,
  ADD COLUMN delegation text NOT NULL DEFAULT 'staff',
  ADD COLUMN delegated_at timestamptz,
  ADD COLUMN takeover_reason text,
  ADD COLUMN taken_over_at timestamptz,
  ADD COLUMN ownership_revision integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT bus_calls_delegation_check CHECK (delegation IN ('staff', 'agent')),
  ADD CONSTRAINT bus_calls_owner_role_check CHECK (
    owner_role IS NULL OR owner_role IN ('admin', 'dispatcher', 'customer-care', 'read-only')
  ),
  -- Owner id and role move together; a role without an id would let the read
  -- model render an owner the server cannot name.
  ADD CONSTRAINT bus_calls_owner_pair_check CHECK ((owner_id IS NULL) = (owner_role IS NULL)),
  -- An unowned session must not leave the Agent holding reply authority, since
  -- no human would remain able to revoke it.
  ADD CONSTRAINT bus_calls_delegation_owner_check CHECK (owner_id IS NOT NULL OR delegation = 'staff'),
  ADD CONSTRAINT bus_calls_ownership_revision_check CHECK (ownership_revision >= 0);

-- The dashboard filters the queue by status and groups active calls by owner.
CREATE INDEX bus_calls_status_idx ON bus_calls(status);
CREATE INDEX bus_calls_owner_idx ON bus_calls(owner_id);

CREATE TABLE operations_audit_events (
  id text PRIMARY KEY,
  session_code text NOT NULL,
  event_type text NOT NULL,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT operations_audit_events_type_check CHECK (
    event_type IN ('call.accepted', 'call.reassigned', 'call.released', 'agent.delegated', 'call.takeover')
  ),
  CONSTRAINT operations_audit_events_role_check CHECK (
    actor_role IN ('admin', 'dispatcher', 'customer-care', 'read-only')
  ),
  -- A takeover without a reason is exactly the record F-12 asks the dashboard
  -- to display, so the database refuses to store one.
  CONSTRAINT operations_audit_events_takeover_reason_check CHECK (
    event_type <> 'call.takeover' OR (reason IS NOT NULL AND btrim(reason) <> '')
  )
);

CREATE INDEX operations_audit_events_session_created_idx ON operations_audit_events(session_code, created_at DESC);
CREATE INDEX operations_audit_events_created_idx ON operations_audit_events(created_at DESC);
