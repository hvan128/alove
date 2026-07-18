# VéĐi Operations, Catalog and Seat Inventory Design

**Status:** Approved design; implementation pending  
**Date:** 2026-07-18  
**Product:** SpeechToInvoice / VéĐi  
**Architecture:** Modular monolith with separate realtime Agent worker

## 1. Purpose

VéĐi needs an operator-facing product layer beyond the current single-session staff cockpit. The target adds:

- an Apple-like operations dashboard for incoming calls, active sessions, departures, alerts and KPIs;
- operator-managed routes, stops, vehicles, seat templates, trips and fares;
- form/CSV updates with dry-run validation, diff and publish workflow for daily catalog changes;
- a staff-only visual seat picker backed by pilot-safe internal inventory and expiring seat holds;
- server-authoritative conflict handling, confirmation and audit boundaries;
- a clean adapter seam for a future operator inventory API.

The implementation remains one Next.js application and one PostgreSQL database. The Python LiveKit Agent stays a separate long-lived worker. No microservice split is introduced.

## 2. Current baseline

Seat-related behavior already exists and must be reused:

- `BusTrip.availableSeats` holds static demo seat codes;
- `BookingDraft.seats` holds selected seat codes;
- booking extraction understands phrases such as `ghế A05, A06`;
- the deterministic core assigns the first available demo seats when passenger count is known;
- staff can edit seat codes as text;
- `bus_bookings.seats` persists the selected list as JSONB;
- tests cover deterministic assignment of `A05` and `A06`.

This is a booking-field mechanism, not inventory. It does not provide vehicle layout templates, per-trip seat state, holds, expiry, concurrency control or protection against two sessions selecting the same seat. Static `availableSeats` is not mutated after confirmation.

## 3. Goals and non-goals

### Goals

1. Preserve the current no-key deterministic demo.
2. Let authorized operator staff update catalog data without changing source code.
3. Expose only validated, published catalog versions to booking and Agent flows.
4. Show an operator-only vehicle and seat visualization.
5. Hold seats atomically per trip and consume the hold during booking confirmation.
6. Fail safely when catalog, inventory or persistence is unavailable.
7. Keep current transcript, evidence and `BookingDraft.seats` behavior compatible.
8. Keep future operator APIs behind normalized repository/adapter contracts.

### Non-goals

- passenger-facing seat-map selection;
- payment, ticket delivery or real operator ticket issuance;
- claiming synchronization with a real operator inventory before a credentialed adapter passes reconciliation tests;
- autonomous Agent confirmation;
- microservices, distributed transactions or a new event-streaming platform;
- selecting or replacing the staff identity provider; this design consumes authenticated actors and enforces role policy server-side;
- replacing LiveKit, VALSEA or the existing booking extraction pipeline.

## 4. Product structure and visual direction

### 4.1 Information architecture

VéĐi uses a hybrid product shell:

- **Operations Dashboard:** landing surface for current shift, queue, active calls, KPIs, alerts and upcoming departures.
- **Staff Cockpit:** focused single-session workspace with transcript, booking form, reply assistance and seat picker.
- **Catalog Admin:** routes, stops, vehicle templates, vehicles, fares, trips, validation and publication.
- **Reports:** call outcomes, conversion, Agent-assist rate and route load.

Dashboard is not expanded into a dense all-in-one cockpit. Selecting a call opens the focused staff workspace. Catalog and vehicle administration remain separate modules.

### 4.2 Apple-like UI direction

“Apple-like” means calm hierarchy, generous whitespace, system typography, restrained translucent surfaces, hairline borders, compact semantic color and direct manipulation. It does not mean copying Apple product UI.

Required UI properties:

- responsive sidebar and top-level module navigation;
- large shift greeting and concise KPI cards;
- one dominant action per surface;
- status conveyed by label and shape, never color alone;
- 44px minimum interaction target and visible focus state;
- reduced-motion support;
- keyboard-operable seat selection;
- light and dark tokens from the existing design system.

## 5. Architecture

### 5.1 Experience layer

Next.js App Router owns pages, server actions/route handlers and BFF queries:

- `/operations` — dashboard and queue;
- `/operations/calls/[sessionId]` or existing `/staff` compatibility route — staff cockpit;
- `/admin/catalog` — catalog version workspace;
- `/admin/vehicles` — vehicles and seat templates;
- `/reports` — operational projections.

Routes are role-gated server-side. Hiding navigation or buttons is not authorization.

### 5.2 Domain layer

Pure application/domain modules expose explicit commands and queries:

- **Catalog:** draft changes, validation, immutable publication and effective dates;
- **Inventory:** trip-seat snapshots, hold, renew, release, consume and conflict rules;
- **Booking:** existing evidence and extraction plus catalog/inventory references and authoritative confirmation;
- **Operations:** queue, assignment and read-model projections.

The Agent can query published catalog and available inventory through an application boundary. It cannot publish catalog, invent fare/seat data, create holds outside policy or confirm a booking.

### 5.3 Data and integration layer

Repository interfaces have two implementations:

- PostgreSQL/Drizzle for durable pilot behavior;
- deterministic memory fallback for the labeled local demo.

A future operator inventory adapter implements the same normalized availability and hold interface. Operator-specific payloads never enter `packages/core`.

## 6. Catalog model and publish lifecycle

### 6.1 Entities

- `catalog_version`: version number, status, effective time, creator, validator and publisher.
- `branch`: operator branch or office.
- `stop`: pickup/drop-off location and normalized address metadata.
- `route`: ordered origin, destination and allowed stops.
- `vehicle_template`: vehicle type, floor count, capacity and layout metadata.
- `vehicle_template_seat`: stable seat code, floor, row, column, type and accessibility metadata.
- `vehicle`: plate/reference, active state and assigned template.
- `fare_rule`: route/trip scope, price, effective dates and publish version.
- `trip`: route, departure/arrival, vehicle/template, capacity and effective publish version.

### 6.2 State machine

```text
draft -> validated -> published -> retired
```

Rules:

- edits happen only in `draft`;
- validation checks references, duplicate seat codes, capacity/layout consistency, time order, route stops, non-negative fares and effective-date overlap;
- CSV import writes only to a draft, returns a dry-run row/error report and never publishes automatically;
- publication is atomic and rejected when blocking validation errors remain;
- a published version is immutable;
- new edits fork a new draft from the current published version;
- booking sessions retain the catalog version and trip snapshot they used;
- optimistic version checks reject silent overwrite with `CATALOG_VERSION_CONFLICT`.

## 7. Seat templates, inventory and holds

### 7.1 Template versus inventory

Vehicle templates describe physical layout. Inventory describes a seat on one scheduled trip. Changing a template does not rewrite already-published trip inventory.

`trip_seat` has a unique identity per `(trip_id, seat_code)` and one state:

```text
available | held | booked | blocked
```

`seat_hold` records session, booking draft, trip, selected seats, actor, creation time, expiry, release and consumption.

### 7.2 Hold lifecycle

```text
available -> held -> booked
held -> available  (expiry or explicit release)
available -> blocked
blocked -> available
```

Rules:

- default hold duration is 10 minutes;
- an active staff session may renew before expiry;
- cumulative automatic renewal is capped at 30 minutes per session; longer hold needs an audited dispatcher override;
- selecting another trip or seat set releases the prior hold;
- ending/cancelling the call releases its active hold;
- only one active hold or booking can own a seat for a trip;
- concurrent hold attempts are resolved by database constraints/locking; exactly one succeeds;
- confirmation validates actor, draft version, accepted summary and unexpired hold;
- booking creation, hold consumption and audit insertion happen in one transaction;
- expired or conflicting holds close the confirmation gate and require fresh selection.

The existing `BookingDraft.seats` remains the display and conversation field. New `tripId`, `catalogVersionId` and `seatHoldId` references bind those codes to authoritative data.

## 8. User workflows

### 8.1 Catalog update

1. Admin or dispatcher opens current draft or forks published catalog.
2. User edits routes, stops, vehicles, templates, trips or fares.
3. User may import routes/trips/fares from CSV into the draft; system shows row-level dry-run errors before applying valid rows.
4. System validates incrementally and shows blocking issues next to affected records.
5. User opens a diff against current published version.
6. Authorized publisher confirms effective time.
7. Transaction publishes the version and creates trip-seat inventory.
8. Dashboard and booking queries read the new version when effective.

### 8.2 Vehicle template editor

Admin chooses floor count and places seat, double-bed, aisle, driver or blocked cells on a grid. Every selectable seat requires a unique stable code. Capacity is derived from seat cells, not manually trusted. Validation prevents duplicate codes, overlapping cells and trips whose capacity disagrees with the assigned template.

### 8.3 Staff seat selection

1. Staff selects a published trip in the cockpit.
2. UI loads current per-trip inventory.
3. Staff selects exactly the passenger count in available seats.
4. Server atomically creates/replaces the hold.
5. UI displays held seats and countdown.
6. Staff or Agent reads the seats back to the caller.
7. Authorized explicit confirmation consumes the hold.

Caller never receives seat-map controls in this phase. Caller can state a preferred seat code by voice; staff sees the request, but inventory validation decides whether it can be held.

## 9. Roles and authorization

| Role | Allowed actions |
|---|---|
| `admin` | Manage roles, all catalog records, templates, validation and publication |
| `dispatcher` | Manage trips/inventory, queue, assignment, reassignment and operational overrides |
| `customer-care` | Accept assigned calls, edit booking draft, select/hold seats and confirm when authorized |
| `read-only` | View dashboard, reports and redacted audit data |

Every command carries actor, role, correlation ID and expected version. Server/application policy checks the action and scope. Unauthorized attempts return a stable error and append a redacted audit event where appropriate.

## 10. Commands, queries and errors

Representative commands:

- `CreateCatalogDraft`
- `UpdateRoute`, `UpdateVehicleTemplate`, `UpdateTrip`, `UpdateFareRule`
- `DryRunCatalogCsvImport`, `ApplyCatalogCsvImport`
- `ValidateCatalogVersion`, `PublishCatalogVersion`
- `HoldTripSeats`, `RenewSeatHold`, `ReleaseSeatHold`
- `ConfirmBookingWithHold`

Representative queries:

- `GetOperationsDashboard`
- `ListIncomingCalls`
- `GetPublishedCatalog`
- `GetTripInventory`
- `GetCatalogVersionDiff`

Stable failure codes:

| Code | Required behavior |
|---|---|
| `CATALOG_VALIDATION_FAILED` | Keep draft; return field/record issues; publish nothing |
| `CATALOG_VERSION_CONFLICT` | Return current version/diff hint; overwrite nothing |
| `SEAT_NOT_AVAILABLE` | Return conflicting seats and fresh inventory revision |
| `HOLD_EXPIRED` | Close confirmation gate and require new hold |
| `IDEMPOTENCY_CONFLICT` | Return no unrelated booking; create nothing |
| `FORBIDDEN` | Perform no mutation; return role-safe detail |
| `PERSISTENCE_UNAVAILABLE` | Enter degraded state; never claim hold or confirmation success |

## 11. Dashboard read model

Dashboard consumes read models rather than scanning transcript payloads on every request. Initial metrics:

- incoming queue count and longest wait;
- active calls by owner and Human/Agent authority;
- calls and confirmed bookings today;
- conversion rate;
- Agent-assist/delegation rate;
- calls requiring review or takeover;
- upcoming departures and occupancy;
- catalog validation/publish alerts;
- inventory conflicts, expired holds and provider failures.

Metrics display runtime profile and freshness timestamp. Demo projections are labeled non-durable and cannot be presented as operator production analytics.

## 12. Failure and fallback behavior

- Missing database in local demo uses seeded catalog and deterministic memory inventory labeled `non-durable`.
- Persistence failure in a durable profile disables hold/confirm mutations and preserves the last visible draft.
- Catalog validation failure never changes the published version.
- Inventory conflict refreshes seat state without dropping transcript or other booking fields.
- Hold expiry removes confirmation readiness but keeps requested seat evidence/history.
- Agent/provider failure returns reply authority to Human mode; it cannot bypass catalog or inventory commands.
- Logs and audit payloads redact phone numbers and avoid raw transcript/audio unless policy explicitly permits them.

## 13. Verification strategy

### Unit tests

- catalog reference and effective-date validation;
- seat-template geometry, duplicate codes and derived capacity;
- catalog state transitions and immutable publication;
- hold expiry, renew, release and consume rules;
- compatibility of existing seat extraction and deterministic demo allocation.

### Repository/transaction tests

- concurrent holds for one trip seat yield one winner;
- publish creates one consistent catalog/inventory version;
- confirmation, hold consumption, booking and audit are atomic;
- stale expected versions and idempotency-key reuse are rejected;
- exact retries return the canonical prior result.

### UI/component tests

- dashboard queue/KPI/alert states;
- catalog validation and version diff;
- CSV dry-run row errors and valid-row application into draft only;
- keyboard seat-template editing and seat picking;
- held/booked/blocked states use labels beyond color;
- hold countdown, conflict refresh and expired-hold recovery.

### End-to-end tests

```text
catalog draft -> validation -> publish
-> incoming call -> staff acceptance -> trip selection
-> atomic seat hold -> read-back -> explicit confirmation
-> one booking -> consumed seats -> dashboard projection
```

Local fallback and durable database profiles both require regression coverage. Production claims require credentialed evidence, not only mocked adapters.

## 14. Rollout

1. Add contracts and pure domain rules while preserving static demo catalog.
2. Add Drizzle target schema and memory/PostgreSQL repositories.
3. Add Catalog Admin and publish workflow behind a feature flag.
4. Add operations dashboard read model and Apple-like shell.
5. Add vehicle template editor and staff-only seat picker.
6. Switch booking selection from static `availableSeats` to inventory adapter.
7. Enable durable holds only after transaction/concurrency tests pass.
8. Add operator API adapter only after its authentication, freshness, hold and reconciliation contract is known.

Rollback disables durable catalog/inventory flags and returns the public demo to its labeled static catalog. It never converts simulated seats into a real operator claim.

## 15. Documentation impact

This design requires synchronized truth labels in:

- `specs/features.md` — dashboard, catalog publish and internal seat inventory target;
- `specs/domains.md` — Catalog, Inventory and Enterprise Operations boundaries;
- `specs/product-vision.md` — operator workflow and scoped exclusions;
- `docs/data-model.md` — catalog, template, trip-seat and hold target tables;
- `docs/current-vs-target-architecture.md` — existing seat baseline versus missing inventory;
- `docs/design-system.md` — Apple-like dashboard and seat-state accessibility;
- `docs/pilot-roadmap.md` — pilot-safe internal inventory before external operator integration.

Until implementation and verification finish, every new capability remains **Target**, not **Current**.
