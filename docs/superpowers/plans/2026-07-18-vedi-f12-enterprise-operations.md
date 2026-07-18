# F-12 Enterprise Operations Dashboard — Implementation Plan

**Goal:** Đóng phần còn thiếu của F-12 trên nền dashboard baseline đã có: owner thật, Agent delegation tường minh, takeover kèm lý do, cross-session audit trail, search và bốn role vận hành.

**Architecture:** Next.js App Router. Pure domain state machine trong `lib/operations`, repository `memory | neon` theo đúng pattern sẵn có, command đi qua route handler role-gated. Dashboard vẫn là landing cross-session; chọn session mở staff cockpit tập trung.

**Baseline đã có (không làm lại):** incoming queue, active sessions, booking state, departures, occupancy, alerts sức chứa, completion metrics, reports 90 ngày, `OperationsShell` role-aware nav.

## Ràng buộc

- `getOperatorActor()` là seam identity duy nhất. Không xây identity provider mới (non-goal của design doc §3).
- Role policy enforce **server-side**; ẩn nav không phải authorization.
- Repository luôn có nhánh `memory` và `neon`; không gọi `getDb()` trực tiếp (nó throw khi thiếu `DATABASE_URL`).
- Dùng Stack B (`@ordervoice/db`). Stack A (`apps/web/src/lib/db/schema.ts`) chưa có migration, không đọc.
- `bus_calls.status` là `waiting|connecting|connected|reconnecting|ended|error`. Không tồn tại `active`.
- Trạng thái truyền bằng nhãn/hình, không chỉ bằng màu. Target tối thiểu 44px.
- TDD, commit theo từng task.
- Làm trong worktree riêng `../vedi-f12`. Một phiên khác đang làm F-13 trên `feat/f13-bus-operator-data-management` trong working tree chung và đã chiếm `db/migrations/0005_f13_catalog_extensions.sql`; F-12 dùng `0006`. F-13 cũng sửa `db/catalog-schema.ts`, `db/test/db.test.ts` và `packages/contracts/src/catalog.ts` — dự kiến phải merge ở Task 3 và Task 7.

---

### Task 1: Bốn role vận hành và ma trận quyền

**Files:**
- Modify: `apps/web/src/lib/auth/operator-actor.ts`
- Modify: `apps/web/src/lib/auth/operator-actor.test.ts`
- Create: `apps/web/src/lib/auth/operator-permissions.ts`
- Create: `apps/web/src/lib/auth/operator-permissions.test.ts`
- Modify: `.env.example`

**Interfaces:**
- `getOperatorActor(env)` phân giải được cả 4 role qua `OPERATOR_DEMO_ROLE` và `OPERATOR_STAFF_DIRECTORY`; production đọc header do IdP đặt.
- `canPerform(role, action)` / `requirePermission(actor, action)` với `OperationsAction`.

Ma trận theo design doc §9:

| Action | admin | dispatcher | customer-care | read-only |
|---|---|---|---|---|
| `operations.view` | ✅ | ✅ | ✅ | ✅ |
| `audit.view` | ✅ | ✅ | ✅ | ✅ (redacted) |
| `call.accept` | ✅ | ✅ | ✅ | ❌ |
| `call.delegate` | ✅ | ✅ | ✅ | ❌ |
| `call.takeover` | ✅ | ✅ | ✅ | ❌ |
| `call.reassign` | ✅ | ✅ | ❌ | ❌ |
| `call.release` | ✅ | ✅ | ✅ (chỉ phiên mình) | ❌ |

- [ ] Step 1: test đỏ cho phân giải role + ma trận quyền
- [ ] Step 2: implement, giữ fail-closed khi chưa cấu hình
- [ ] Step 3: `pnpm --filter @ordervoice/web test -- operator-actor operator-permissions`

### Task 2: State machine ownership / delegation / takeover

**Files:**
- Create: `packages/contracts/src/operations.ts`
- Modify: `packages/contracts/src/index.ts`
- Create: `packages/contracts/test/operations.test.ts`
- Create: `apps/web/src/lib/operations/session-ownership.ts`
- Create: `apps/web/src/lib/operations/session-ownership.test.ts`

**Interfaces:** `acceptCall`, `reassignCall`, `releaseCall`, `delegateToAgent`, `takeoverFromAgent`.

Luật bắt buộc:
- accept chỉ khi `ownerId === null`, ngược lại `CALL_ALREADY_OWNED` — một owner tại một thời điểm (F-01).
- delegate yêu cầu đã có owner, ngược lại `CALL_NOT_OWNED`.
- takeover **bắt buộc** `reason` không rỗng, ngược lại `TAKEOVER_REASON_REQUIRED`.
- mọi transition tăng `ownershipRevision` và sinh đúng một audit event.

- [ ] Step 1: test đỏ cho từng luật
- [ ] Step 2: implement pure, không I/O
- [ ] Step 3: test xanh + typecheck

### Task 3: Persistence — migration 0006 và ownership repository

**Files:**
- Create: `db/migrations/0006_operations_ownership.sql`
- Create: `db/operations-schema.ts`
- Modify: `db/index.ts`, `db/test/db.test.ts`
- Create: `apps/web/src/lib/operations/ownership-repository.ts`
- Create: `apps/web/src/lib/operations/ownership-repository.test.ts`

`bus_calls` thêm: `owner_id`, `owner_role`, `accepted_at`, `delegation` (default `staff`), `delegated_at`, `takeover_reason`, `taken_over_at`, `ownership_revision`.
Bảng mới `operations_audit_events`: `id, session_code, event_type, actor_id, actor_role, reason, payload, correlation_id, created_at` + index `(session_code, created_at)`, `(created_at)`.
Index bổ sung cho `bus_calls(status)` và `bus_calls(owner_id)`.

Accept phải atomic: `UPDATE ... WHERE id = ? AND owner_id IS NULL RETURNING *` → đúng một người thắng.

- [ ] Step 1: test đỏ, gồm hai accept đồng thời chỉ một thắng
- [ ] Step 2: migration + schema + repo memory/neon
- [ ] Step 3: cập nhật `db/test/db.test.ts` (assert danh sách bảng)

### Task 4: Command API role-gated

**Files:**
- Create: `apps/web/src/app/api/operations/calls/[sessionCode]/accept/route.ts`
- Create: `apps/web/src/app/api/operations/calls/[sessionCode]/delegate/route.ts`
- Create: `apps/web/src/app/api/operations/calls/[sessionCode]/takeover/route.ts`
- Create: `apps/web/src/app/api/operations/calls/[sessionCode]/reassign/route.ts`
- Create: `apps/web/src/app/api/operations/audit/route.ts`
- Create: test tương ứng

Mã lỗi ổn định: `FORBIDDEN` 403, `CALL_ALREADY_OWNED` 409, `TAKEOVER_REASON_REQUIRED` 422, `OPERATOR_AUTH_UNCONFIGURED` 503. Mọi mutation ghi audit; `Cache-Control: no-store`.

- [ ] Step 1: test đỏ cho mỗi route, gồm 403 của `read-only`
- [ ] Step 2: implement
- [ ] Step 3: test xanh

### Task 5: Read model — owner, delegation, takeover, audit, search

**Files:**
- Modify: `apps/web/src/lib/operations/operations-repository.ts`
- Modify: `apps/web/src/lib/operations/operations-repository.test.ts`
- Modify: `apps/web/src/app/api/operations/dashboard/route.ts`

- `activeCalls[]` thêm `ownerRole`, `delegation`, `takeoverReason`; bỏ `ownerId: null` hardcode.
- Snapshot thêm `auditTrail[]` (N sự kiện gần nhất, đã redact số điện thoại).
- `getDashboard(at, options?)` nhận `query` để search theo session code / tuyến / owner.
- Sửa `conversionRate`: mẫu số và tử số cùng khung thời gian.
- Alerts thêm nguồn catalog (`status='draft'` sau validate) và hold hết hạn có `ORDER BY`.

- [ ] Step 1: test đỏ gồm regression cho conversionRate
- [ ] Step 2: implement cả hai nhánh memory/neon
- [ ] Step 3: test xanh

### Task 6: Dashboard UI

**Files:**
- Modify: `apps/web/src/components/operations/operations-dashboard.tsx`
- Modify: `apps/web/src/components/operations/call-queue.tsx`
- Modify: `apps/web/src/components/operations/active-call-list.tsx`
- Create: `apps/web/src/components/operations/audit-trail.tsx`
- Create: `apps/web/src/components/operations/operations-search.tsx`
- Modify/Create: test tương ứng
- Modify: `apps/web/src/app/operations/page.tsx`

- Queue: "Nhận cuộc gọi" gọi command accept rồi mới điều hướng sang cockpit; 409 hiện "Cuộc gọi đã có người nhận".
- Active: chip owner (`id · role`), badge delegation (`Nhân viên` / `Agent tự động`), dòng lý do takeover khi có.
- Audit trail panel: cross-session, hiện actor/role/loại sự kiện/lý do/thời điểm.
- Search: lọc queue + active theo code/tuyến/owner.
- `read-only` không thấy nút hành động nào.

- [ ] Step 1: test đỏ cho từng thành phần
- [ ] Step 2: implement
- [ ] Step 3: test xanh + typecheck

### Task 7: E2E và đồng bộ truth docs

**Files:**
- Modify: `apps/web/e2e/operations.spec.ts`
- Modify: `docs/capabilities-and-evidence.md` (dòng F-12 đang **stale**, mô tả sai là "chỉ có single-session cockpit")
- Modify: `docs/current-vs-target-architecture.md`
- Modify: `specs/features.md` nếu cần nhãn trạng thái

- [ ] Step 1: E2E accept → delegate → takeover có lý do → audit hiển thị
- [ ] Step 2: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`
- [ ] Step 3: cập nhật doc theo đúng điều đã quan sát, ghi mode `memory`/non-durable

## Ngoài phạm vi

Realtime notification (SSE/WebSocket) cho queue, concurrency test có credential trên Neon thật, identity provider thật, và polling client cho `/api/operations/dashboard`. Ghi nhận là bước tiếp theo, không claim trong lần này.
