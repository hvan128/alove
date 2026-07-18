# F-13 Bus-Operator Data Management — Research and Implementation Plan

**Branch:** `feat/f13-bus-operator-data-management`
**Date:** 2026-07-18
**Spec:** [`specs/features.md` § F-13](../../../specs/features.md)
**Design of record:** [`docs/superpowers/specs/2026-07-18-vedi-operations-catalog-seat-inventory-design.md`](../specs/2026-07-18-vedi-operations-catalog-seat-inventory-design.md) §6

---

## 1. Research findings

### 1.1 F-13 is brownfield, not greenfield

The predecessor plan [`2026-07-18-vedi-catalog-publish-foundation.md`](./2026-07-18-vedi-catalog-publish-foundation.md) has every checkbox unticked, but its code is on `main`. **Treat that plan's checkbox state as unreliable.** What actually ships today:

| Layer | File | State |
|---|---|---|
| Contracts | `packages/contracts/src/catalog.ts` | Branch, stop, route, vehicle template + seats, vehicle, fare, trip, draft/version, validation issue |
| Pure rules | `packages/core/src/catalog.ts` | `validateCatalogDraft`, `publishCatalogDraft`, `forkCatalogVersion`, `retireCatalogVersion` |
| Schema | `db/catalog-schema.ts`, `db/migrations/0003_operator_catalog.sql` | 9 tables, CHECK constraints, `(catalogVersionId, externalId)` uniqueness |
| Repository | `apps/web/src/lib/catalog/catalog-repository.ts` | Memory + Neon, `SELECT … FOR UPDATE` + optimistic `revision` |
| CSV | `apps/web/src/lib/catalog/catalog-csv.ts` | Quote-safe parser, dry-run, draft-only apply |
| HTTP | `apps/web/src/lib/catalog/catalog-http.ts` + 6 route handlers | Role-gated, `no-store`, centralized error→status mapping |
| UI | `apps/web/src/app/admin/*`, `apps/web/src/components/catalog/*` | Tabbed workspace, version bar, import dialog, seat-grid editor |
| Version pinning | `db/schema.ts:128` | `bus_bookings.catalogVersionId` → `catalogVersions` |

So `draft → validated → published → retired`, immutable publish, optimistic conflict, CSV dry-run and "booking giữ version đã dùng" are **already satisfied**. F-13 is about closing the remaining data-model gaps.

### 1.2 Decisions taken (not re-litigated)

- **Catalog stays in `apps/web`.** `apps/api` is the legacy Fastify OrderVoice service with no auth and no catalog code. Moving six working handlers there is unrelated churn.
- **Migrations stay hand-written.** All five existing files are hand-authored; there is no `migrations/meta/_journal.json`, so `drizzle-kit migrate` cannot run and `generate` would try to re-create every table. This plan adds `0005_f13_catalog_extensions.sql` by hand and does not touch the tooling question.
- **`apps/web/src/lib/db/schema.ts` is left alone.** It is a third, orphaned catalog schema with no migration, referencing a `docs/operator-data-format.md` that does not exist. Deleting it is a separate cleanup, not F-13.

### 1.3 Gap analysis against the F-13 sentence

| F-13 clause | Status | Action |
|---|---|---|
| chi nhánh | Built | — |
| tuyến | Built | — |
| **điểm đón/trả** | Partial — `route.stopIds` is an unordered id list with no pickup-vs-dropoff role | **Add** `route.stops[]` with `role`, `sequence`, `offsetMinutes` |
| **lịch chạy** | Absent — only absolute-timestamp trip rows | **Add** `schedules[]` + deterministic `expandSchedule()` |
| vehicle template | Built, with seat-grid editor | — |
| xe | Built | — |
| **loại ghế** | Absent — `seatKind` is layout geometry (`aisle`/`driver`), not a fare class | **Add** `seatClasses[]` + `seat.seatClassId` |
| **giá** | Minimal — flat `priceVnd` per route, no effective dates, no class tier | **Extend** `fareRule` with `seatClassId`, `effectiveFrom`, `effectiveTo` |
| **sức chứa** | Not modelled — derived ad hoc in one UI component | **Add** `deriveTemplateCapacity()` in core + `trip.declaredCapacity` cross-check |
| version / effective date | Built | — |
| **validation** | Thin — no branch/stop refs, no duplicate-id check, no date overlap | **Extend** `validateCatalogDraft` |
| publish workflow | Built | — |
| **CSV dry-run, lỗi từng dòng, chỉ ghi draft** | Partial — only `route`/`trip`/`fare` kinds | **Extend** to `branch`/`stop`/`vehicle`/`seatClass`/`schedule` |
| **live API sync chỉ bật khi có contract + reconciliation** | Absent | **Add** fail-closed gate |

### 1.4 Constraints discovered that shape the work

1. **`catalogVersionSchema.parse()` is the read-model validator** (`catalog-repository.ts:249`) and every object is `.strict()`. DB shape and contract shape must move together in one commit or reads throw.
2. **`replaceChildren` is delete-all-then-reinsert**, not a diff — new child tables just need adding to that list.
3. **Client and server share `validateCatalogDraft`** (`catalog-workspace.tsx:27`). Every new rule automatically surfaces in the UI issue list.
4. **Test layout differs by package**: `apps/web` co-locates `*.test.ts` beside source; `packages/*` and `db` use a sibling `test/` dir. `db/test/db.test.ts` is a schema-shape test using `getTableName`/`getTableColumns` — no live DB needed.
5. **Route stops are jsonb today** (`catalog_routes.stop_external_ids`). Promoting them to a real `catalog_route_stops` table makes role/sequence validatable at the DB level.

### 1.5 Out of scope (flagged, not fixed)

- Neon publish does not materialize `trip_seats` from `vehicle_template_seats`; a published trip gets zero inventory on the durable path. That is an **F-18 inventory** hole, not F-13. Noted here so it is not lost.
- No version-list, fork or retire UI (endpoints exist; `forkCatalogVersion` has no HTTP route at all).

---

## 2. Implementation plan

Each task is one focused commit: failing test → minimal implementation → passing test.

### Task 1 — Contracts: seat class, route stops, schedules, fare windows, capacity

**Files:** `packages/contracts/src/catalog.ts`, `packages/contracts/test/catalog.test.ts`

- `seatClassSchema` — `{ id, name, priceMultiplierBps }` where `10_000` = 1.0×.
- `stopRoleSchema` — `pickup | dropoff | both`.
- `routeStopSchema` — `{ stopId, role, sequence, offsetMinutes }`.
- `routeSchema.stopIds` → `routeSchema.stops: routeStopSchema[]` (replacement, not addition — one source of truth).
- `vehicleTemplateSeatSchema.seatClassId: string | null`.
- `fareRuleSchema` gains `seatClassId`, `effectiveFrom`, `effectiveTo` (all nullable).
- `catalogTripSchema.declaredCapacity: number | null`.
- `catalogScheduleSchema` — `{ id, routeId, vehicleId, fareId, weekdays[], departureTime "HH:mm", durationMinutes, activeFrom, activeTo }`.
- `catalogBody` gains `seatClasses[]` and `schedules[]`.

### Task 2 — Core rules: capacity, schedule expansion, fare resolution

**Files:** `packages/core/src/catalog.ts`, `packages/core/test/catalog.test.ts`, `packages/core/test/fixtures/catalog.ts`

- `deriveTemplateCapacity(template)` — counts `seat` + `double-bed` cells only. Capacity is derived, never trusted from input (design §8.2).
- `expandSchedule(schedule, fromIso, toIso)` — deterministic, UTC, stable generated trip ids.
- `resolveFareForTrip(draft, trip, seatClassId, atIso)` — picks the effective fare window and applies the class multiplier.

### Task 3 — Core validation: the missing rules

**Files:** same as Task 2

New blocking issues: `DUPLICATE_ENTITY_ID`, `UNKNOWN_BRANCH`, `UNKNOWN_STOP`, `DUPLICATE_ROUTE_STOP`, `MISSING_PICKUP_STOP`, `MISSING_DROPOFF_STOP`, `UNKNOWN_SEAT_CLASS`, `SEAT_CLASS_REQUIRED`, `CAPACITY_MISMATCH`, `INVALID_FARE_WINDOW`, `FARE_EFFECTIVE_OVERLAP`, `BROKEN_SCHEDULE_REFERENCE`, `INVALID_SCHEDULE_WINDOW`.

### Task 4 — Schema and migration

**Files:** `db/catalog-schema.ts`, `db/migrations/0005_f13_catalog_extensions.sql`, `db/test/db.test.ts`

- New tables `catalog_seat_classes`, `catalog_route_stops`, `catalog_schedules`.
- Drop `catalog_routes.stop_external_ids`; add `vehicle_template_seats.seat_class_external_id`, `fare_rules.{seat_class_external_id, effective_from, effective_to}`, `catalog_trips.declared_capacity`.
- CHECK constraints for stop role, weekday range, positive duration, multiplier bounds, fare window ordering.

### Task 5 — Repository read/write for the new entities

**Files:** `apps/web/src/lib/catalog/catalog-repository.ts`, `…/catalog-repository.test.ts`, `apps/web/src/lib/demo/operator-demo-state.ts`

Extend `readVersion` fan-out and `replaceChildren`; migrate the demo catalog to the new shape (adds a seat class and pickup/dropoff roles).

### Task 6 — CSV import across all entity kinds

**Files:** `apps/web/src/lib/catalog/catalog-csv.ts`, `…/catalog-csv.test.ts`

Add `branch`, `stop`, `vehicle`, `seatClass`, `schedule` kinds with per-row error codes. Still draft-only, still never auto-publishes.

### Task 7 — Live API sync gate

**Files:** `apps/web/src/lib/catalog/catalog-sync.ts` (+ test), `apps/web/src/app/api/catalog/sync/route.ts`, `.env.example`

`assertLiveSyncContracted(env)` throws `LIVE_SYNC_NOT_CONTRACTED` unless **both** `CATALOG_LIVE_SYNC_CONTRACT_ID` is set and `CATALOG_LIVE_SYNC_RECONCILIATION_PASSED === 'true'`. Fails closed; maps to 503. Directly encodes "live API sync chỉ bật khi có contract và reconciliation tương ứng."

### Task 8 — UI for the new entities

**Files:** `apps/web/src/components/catalog/{types,catalog-table,catalog-workspace,catalog-import-dialog}.tsx`, `…/catalog-workspace.test.tsx`

- New tabs: **Loại ghế**, **Lịch chạy**.
- Route editor gains per-stop role/sequence rows.
- Trip rows show derived vs declared capacity.
- Import dialog renders row-level errors (`row → codes`) before apply.

### Task 9 — Verification gate

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && git diff --check
```

---

## 3. Verification strategy

Per the approved design §13, and matching existing repo patterns:

- **Unit** (`packages/core/test/catalog.test.ts`) — every new validation code, capacity derivation, schedule expansion boundaries, fare-window selection.
- **Contract** (`packages/contracts/test/catalog.test.ts`) — accept/reject shape for each new schema.
- **Schema shape** (`db/test/db.test.ts`) — new table names and columns via `getTableName`/`getTableColumns`.
- **Repository** (`…/catalog-repository.test.ts`) — round-trip of new entities through the memory store; stale-revision still rejected.
- **CSV** (`…/catalog-csv.test.ts`) — row-level errors per kind; source draft never mutated.
- **HTTP** (`…/catalog-http.test.ts`, `catalog-sync.test.ts`) — sync gate returns 503 uncontracted.
- **Component** (`catalog-workspace.test.tsx`) — new tabs render; blocking issues surface.

---

## 4. Truth labels

F-13 stays **Target** in `docs/capabilities-and-evidence.md` until this branch's verification gate passes on a durable profile. Nothing in this plan enables live operator API sync — the gate exists precisely to keep that claim closed.
