# Kiến trúc hiện tại so với main features

**Review date:** 2026-07-18  
**Integration baseline:** `feature/TASK-003-staff-live-call-console`, sau merge `dev` tại `915bc42`  
**Target source:** [`specs/features.md`](../specs/features.md)
**Approved operations design:** [`2026-07-18-vedi-operations-catalog-seat-inventory-design.md`](superpowers/specs/2026-07-18-vedi-operations-catalog-seat-inventory-design.md)

## Kết luận

Code hiện tại có `/operations`, `/reports`, `/admin/catalog`, `/admin/vehicles`, `/call` và `/staff`. Dashboard hiển thị queue/active calls/KPI/departures, owner và quyền trả lời từng phiên, lý do thu quyền, search và nhật ký vận hành xuyên phiên; catalog có revision, validate, CSV dry-run và publish; vehicle template có visual grid 1–2 tầng; trip inventory có hold/renew/release/consume và staff-only seat picker.

Target product **chưa hoàn thành toàn bộ**. Ba gap còn lại:

1. Queue đã có nút **Nhận cuộc gọi** mở cockpit, nhưng chưa có notification realtime hoặc atomic staff ownership/assignment.
2. VALSEA/LiveKit/Neon code đã có nhưng chưa có credentialed production smoke với audio tiếng Việt khó; production web vẫn báo local fallback.
3. Browser story catalog → hold → confirmation đã kiểm chứng ở `memory/non-durable`; Neon transaction/concurrency và external operator API chưa có credentialed evidence.

Do đó prototype đã có operations/catalog/seat workflow chạy end-to-end trong demo có chủ đích, nhưng chưa thể tuyên bố production-live hay đáp ứng đầy đủ requirement VALSEA ASR trên real difficult Vietnamese sample.

## Cách đọc trạng thái

| Trạng thái | Ý nghĩa |
|---|---|
| **Đã có** | Capability chạy trong local/deterministic path và có test hoặc UI evidence. Không tự động đồng nghĩa production-live. |
| **Một phần** | Có UI, adapter, schema hoặc code path nhưng thiếu một phần workflow hay credentialed runtime evidence. |
| **Chưa có** | Không tìm thấy implementation đáp ứng target contract. |

## Runtime hiện tại

```text
Mobile caller /call                         Staff console /staff
        |                                           |
        +------- local event channel ---------------+
        |        hoặc LiveKit room/data             |
        |                                           |
        +------------------+------------------------+
                           |
                 typed vedi.events protocol
                           |
            +--------------+---------------+
            |                              |
            v                              v
 deterministic booking core       Python LiveKit Agent worker
 evidence + validation             VALSEA RTT STT
 suggestions + confirmation        guarded LLM + VALSEA TTS
            |                              |
            +--------------+---------------+
                           |
              memory repository hoặc Neon
              final transcript + snapshot
                 evidence + audit events
```

### Web và session plane

- [`/call`](../apps/web/src/app/call/page.tsx) là caller UI cho điện thoại; [`/staff`](../apps/web/src/app/staff/page.tsx) là staff cockpit.
- [`use-call-session.ts`](../apps/web/src/hooks/use-call-session.ts) quản lý state/event/persistence boundary.
- [`livekit-adapter.ts`](../apps/web/src/lib/call/livekit-adapter.ts) và [`live-call-room.tsx`](../apps/web/src/components/livekit/live-call-room.tsx) nối room data/audio khi configured.
- [`server.ts`](../apps/web/src/lib/livekit/server.ts) cấp token ngắn hạn, room-scoped và caller-only Agent dispatch.
- Khi thiếu credentials, [`demo-channel.ts`](../apps/web/src/lib/call/demo-channel.ts) dùng BroadcastChannel/localStorage giữa hai tab cùng browser.

### Voice Agent plane

- [`agent.py`](../agent/agent.py) chạy long-lived LiveKit worker, Human mặc định và chỉ tạo spontaneous reply ở Auto mode.
- [`valsea_stt.py`](../agent/valsea_stt.py) triển khai VALSEA realtime protocol với PCM16 mono 16 kHz, partial/final events và session lifecycle.
- [`booking_policy.py`](../agent/booking_policy.py) chặn spontaneous reply ở Human mode.
- [`transcript_translation.py`](../agent/transcript_translation.py) dịch final transcript khi staff chọn English, giữ original evidence và `store=false`.

### Semantic, booking và persistence plane

- [`bus-booking.ts`](../packages/core/src/bus-booking.ts) trích xuất field tăng dần, lưu evidence, giữ staff-confirmed values, tạo review items và gợi ý field tiếp theo.
- [`contracts`](../packages/contracts/src/index.ts) định nghĩa `vedi.events`, partial/final transcript, staff preferences, speech, field edit và confirmation events.
- [`session-repository.ts`](../apps/web/src/lib/db/session-repository.ts) lưu event/snapshot qua memory hoặc Drizzle repository.
- [`schema.ts`](../db/schema.ts) và migration [`0002_staff_live_call.sql`](../db/migrations/0002_staff_live_call.sql) có calls, final messages, booking snapshot/evidence và audit.

### Seat và vehicle hiện tại

- Catalog định nghĩa `VehicleTemplate` 1–2 tầng, seat kind và tọa độ; `/admin/vehicles` chỉnh bằng grid keyboard-operable và tự tính capacity.
- `trip_seats`, `seat_holds`, `seat_hold_items`, `inventory_events`, confirmations và confirmed bookings có schema/migration riêng.
- Staff durable mode tải per-trip inventory, chỉ chọn ghế `available`, giữ đủ passenger count, hiển thị countdown, gia hạn, hết hạn và chọn lại.
- Admin/dispatcher có explicit block/unblock; caller route không render seat controls.
- Confirmation durable yêu cầu hold active khớp trip/seat và consume hold trước khi trả booking đã xác nhận.
- Demo browser dùng process-level memory store và được gắn nhãn `Mô phỏng · không bền vững`; PostgreSQL concurrency test vẫn chưa chạy vì thiếu `DATABASE_URL`.

## Actual call flow và target call flow

### Flow đang có

```text
Staff hoặc caller mở URL có cùng session code
        -> caller bấm bắt đầu
        -> staff thấy caller presence/transcript
        -> Human mặc định
        -> staff chuyển toggle sang Agent tự động nếu muốn
        -> final caller turn tự điền field
        -> staff hoặc Agent hỏi field thiếu
        -> staff xác nhận khi gate mở
```

### Flow target đã duyệt

```text
Người dùng gọi đến
        -> dashboard nhà xe phát notification
        -> session vào incoming queue
        -> nhân viên bấm Nhận cuộc gọi
        -> staff ownership được ghi nhận
        -> nhân viên tự trả lời hoặc bấm Trao quyền Agent
        -> Agent hỏi và tự điền đến đủ field
        -> staff takeover/re-delegate khi cần
        -> explicit confirmation + idempotent booking
```

Incoming queue, accept action, exclusive assignment và delegation/takeover có lý do đã chạy trong memory path và có E2E. Phần còn thiếu của luồng này là **notification realtime**: dashboard chỉ làm mới khi điều hướng hoặc reload, chưa có polling hay SSE, nên không được mô tả là đã cảnh báo nhân viên tức thời.

## Ma trận main features

| Main feature | Status | Current implementation | Evidence | Missing / next proof |
|---|---|---|---|---|
| Incoming-call notification | **Một phần** | Dashboard có incoming queue kèm thời gian chờ và alert khi chờ lâu, nhưng chỉ cập nhật khi reload/điều hướng — không có polling, SSE hay âm báo. | [`call-queue.tsx`](../apps/web/src/components/operations/call-queue.tsx), [`operations-repository.ts`](../apps/web/src/lib/operations/operations-repository.ts) | Push realtime, visual/audio notification, timeout/escalation. |
| Staff nhận và sở hữu cuộc gọi | **Đã có trong memory path** | Nút **Nhận cuộc gọi** gọi command accept; owner ghi vào `bus_calls.owner_id` và chỉ một người thắng nhờ `UPDATE ... WHERE owner_id IS NULL`. Cuộc gọi đã nhận rời hàng chờ. Reassign dành cho dispatcher/admin. | [`session-ownership.ts`](../apps/web/src/lib/operations/session-ownership.ts), [`ownership-repository.ts`](../apps/web/src/lib/operations/ownership-repository.ts), [`operations.spec.ts`](../apps/web/e2e/operations.spec.ts) | Chạy hai dispatcher tranh nhau trên PostgreSQL có credential; notification realtime khi có cuộc gọi mới. |
| Nút Trao quyền Agent | **Một phần** | Human mặc định; toggle **Agent tự động** gửi `staff.preferences`; có thể đổi lại Human. | [`call-toolbar.tsx`](../apps/web/src/components/staff/call-toolbar.tsx), [`staff-workspace.tsx`](../apps/web/src/components/staff/staff-workspace.tsx), [`booking_policy.py`](../agent/booking_policy.py) | Đổi copy thành explicit delegation sau accept; scope, owner check và revoke audit. |
| Hai thiết bị qua LiveKit | **Một phần** | Token route, room component, caller/staff roles và Agent dispatch đã implement; local fallback hoạt động. | [`server.test.ts`](../apps/web/src/lib/livekit/server.test.ts), [`live-call-room.test.tsx`](../apps/web/src/components/livekit/live-call-room.test.tsx) | Credentialed two-device smoke, reconnect/latency/deployment evidence. |
| VALSEA ASR bắt buộc | **Một phần** | Worker dùng custom VALSEA RTT STT; protocol fixtures và 5 adapter tests có. | [`valsea_stt.py`](../agent/valsea_stt.py), [`test_valsea_stt.py`](../agent/test_valsea_stt.py) | Sandbox key smoke với real difficult Vietnamese audio; record sample/latency/output. |
| Live partial/final transcript | **Đã có** | UI tách partial/final; partial không điền field; final có speaker/source/confidence. Local event path có component tests. | [`live-transcript.tsx`](../apps/web/src/components/staff/live-transcript.tsx), [`staff-workspace.test.tsx`](../apps/web/src/components/staff/staff-workspace.test.tsx) | VALSEA-backed production observation vẫn thiếu. |
| Giọng vùng miền, noisy/telephony, VN/EN code-switch | **Một phần** | Audio normalization/noise suppression và Vietnamese VALSEA config có; original transcript được giữ. | [`live-call-room.tsx`](../apps/web/src/components/livekit/live-call-room.tsx), [`valsea_stt.py`](../agent/valsea_stt.py) | Chưa có benchmark/sample evidence theo accent, noise, telephony và embedded English retention. |
| Tự điền thông tin khách hàng | **Đã có** | Incremental extraction điền hành trình, ngày/giờ, số vé, tên, phone, pickup/dropoff, trip và optional fields. | [`bus-booking.ts`](../packages/core/src/bus-booking.ts), [`bus-booking.test.ts`](../packages/core/test/bus-booking.test.ts) | Mở rộng ngoài catalog demo và đo Critical Field Accuracy. |
| Evidence từng field | **Đã có** | Mỗi machine field giữ message ID, exact quote, confidence, source và revision history; partial/staff/Agent không ghi caller facts. | [`bus-booking.test.ts`](../packages/core/test/bus-booking.test.ts), [`booking-form.tsx`](../apps/web/src/components/staff/booking-form.tsx) | Chuẩn hóa typed evidence table thay JSONB aggregate cho pilot scale. |
| Điều hướng field còn thiếu/mơ hồ | **Đã có** | Core tính missing fields, hỏi tối đa hai field liên quan, tạo blocking review item thay vì đoán. | [`bus-booking.ts`](../packages/core/src/bus-booking.ts), [`assistant-rail.tsx`](../apps/web/src/components/staff/assistant-rail.tsx) | Benchmark hội thoại ngoài fixture; escalation policy theo confidence. |
| Gợi ý trả lời cho nhân viên | **Đã có** | Staff xem suggestion, copy, gửi/nói hoặc nhập custom reply. Human mode không spontaneous speech. | [`assistant-rail.tsx`](../apps/web/src/components/staff/assistant-rail.tsx), [`staff-workspace.test.tsx`](../apps/web/src/components/staff/staff-workspace.test.tsx) | Staff analytics: accept/edit rate và suggestion quality. |
| Agent tự trả lời theo quyền | **Một phần** | Local deterministic Agent auto-reply hoạt động; worker có guarded LLM Auto mode. | [`staff-workspace.tsx`](../apps/web/src/components/staff/staff-workspace.tsx), [`agent.py`](../agent/agent.py), [`test_booking_policy.py`](../agent/test_booking_policy.py) | Live worker/LLM/TTS smoke và explicit delegation contract sau staff accept. |
| Đề xuất chuyến theo catalog | **Đã có** | Core chỉ chọn chuyến/giá/ghế từ static demo catalog; Agent không tự sinh catalog fact. | [`createBusDemoCatalog`](../packages/core/src/bus-booking.ts), [`bus-booking.test.ts`](../packages/core/test/bus-booking.test.ts) | Thay static catalog bằng immutable published version và normalized inventory query. |
| Seat layout và internal hold | **Đã có trong memory path** | Visual vehicle template, per-trip inventory, hold/renew/release/consume, block/unblock, countdown và durable confirmation gate. | [`vehicle-template-editor.tsx`](../apps/web/src/components/vehicles/vehicle-template-editor.tsx), [`seat-picker.tsx`](../apps/web/src/components/staff/seat-picker.tsx), [`inventory-repository.ts`](../apps/web/src/lib/inventory/inventory-repository.ts) | Chạy PostgreSQL concurrency/rollback với credentialed Neon. |
| Human takeover và trao lại quyền | **Đã có trong memory path** | Delegation tách khỏi Human/Auto toggle: Agent chỉ giữ quyền sau khi owner trao, thu quyền bắt buộc có lý do và sinh audit event riêng. Lý do hiện ngay trên hàng cuộc gọi. | [`session-ownership.ts`](../apps/web/src/lib/operations/session-ownership.ts), [`operations-http.ts`](../apps/web/src/lib/operations/operations-http.ts), [`operations.spec.ts`](../apps/web/e2e/operations.spec.ts) | Nối delegation vào worker LiveKit để Agent thật tôn trọng grant này. |
| Field validation trước xác nhận | **Đã có** | Gate kiểm tra required fields, evidence, review items và total; UI chỉ bật confirm khi ready. | [`getBookingConfirmationState`](../packages/core/src/bus-booking.ts), [`assistant-rail.tsx`](../apps/web/src/components/staff/assistant-rail.tsx) | Align target required-field schema với production catalog/inventory provider. |
| Explicit confirmation + idempotency | **Đã có trong memory path** | Role gate, hold scope, accepted-summary hash, scoped idempotency và consume-before-confirm chạy trong shared demo transaction. Neon adapter đã implement. | [`confirm-booking.ts`](../apps/web/src/lib/booking/confirm-booking.ts), [`operations.spec.ts`](../apps/web/e2e/operations.spec.ts) | Credentialed Neon transaction/retry evidence. |
| Enterprise dashboard | **Đã có trong memory path** | Apple-like operations landing kèm queue, active calls có owner/delegation/takeover reason, departures/occupancy, alerts, KPI, 90-day reports, search theo URL và cross-session audit trail. Bốn role `admin/dispatcher/customer-care/read-only` gate server-side; `read-only` mất mọi nút thao tác nhưng vẫn xem được KPI và audit. | [`operations-dashboard.tsx`](../apps/web/src/components/operations/operations-dashboard.tsx), [`audit-trail.tsx`](../apps/web/src/components/operations/audit-trail.tsx), [`operator-permissions.ts`](../apps/web/src/lib/auth/operator-permissions.ts) | Realtime notification; `/api/operations/dashboard` vẫn chưa có client polling; identity provider thật thay directory qua env. |
| Nhà xe cập nhật dữ liệu hằng ngày | **Đã có baseline** | Draft editor, ordered stop IDs, revision conflict, validation, CSV dry-run/apply, admin publish và vehicle/seat template editor. | [`catalog-workspace.tsx`](../apps/web/src/components/catalog/catalog-workspace.tsx), [`catalog-repository.ts`](../apps/web/src/lib/catalog/catalog-repository.ts) | Full create/fork/retire UX, production operator connector và Neon smoke. |
| Persistence và audit | **Một phần** | Schema/migration/repository có; thiếu DB thì memory fallback `durable:false`. Thêm `operations_audit_events` cho audit xuyên phiên vì `booking_audit_events` gắn `booking_id` nên không mô tả được thao tác trước khi có bản nháp. | [`session-repository.test.ts`](../apps/web/src/lib/db/session-repository.test.ts), [`schema.ts`](../db/schema.ts), [`0006_operations_ownership.sql`](../db/migrations/0006_operations_ownership.sql) | Credentialed Neon migration, transaction/retry test và retention job evidence. |
| Multilingual đồng thời | **Một phần** | Staff chọn original/vi/en; final translation giữ original evidence và có failure fallback. | [`transcript_translation.py`](../agent/transcript_translation.py), [`test_transcript_translation.py`](../agent/test_transcript_translation.py) | STT vẫn configured Vietnamese; chưa chứng minh simultaneous multilingual/code-switch ASR. |
| Safe fallback | **Đã có** | Local two-tab path, text/preset, browser STT/TTS labels và provider readiness API. | [`demo-channel.ts`](../apps/web/src/lib/call/demo-channel.ts), [`integration-test-status.md`](integration-test-status.md) | Production incident exercise và measurable recovery targets. |
| Demo deliverables | **Một phần** | Production web URL, GitHub remote, architecture/deployment docs và release manifest có. | [`vedi-release-manifest.md`](vedi-release-manifest.md), [`livekit-valsea-deployment.md`](livekit-valsea-deployment.md) | Chưa xác minh anonymous access của repo; còn thiếu credentialed demo/video evidence và roadmap 1–2 trang có metrics. |

## Challenge requirement check

| Challenge requirement | Verdict | Lý do |
|---|---|---|
| VALSEA ASR endpoint mandatory | **Chưa chứng minh end-to-end** | Code và protocol tests có; thiếu sandbox-key smoke với sample thật. |
| Workflow-ready output | **Đạt trong local/code path** | Final transcript tạo structured booking, evidence, validation, suggestion và confirmation gate. |
| Additional semantic endpoint hoặc own logic | **Đạt bằng own logic** | Deterministic booking core thực hiện extraction, slot filling, catalog match và state transitions. |
| Messy Vietnamese input | **Chưa chứng minh** | Chưa có recorded accent/code-switch/noisy/telephony sample result. |
| Vietnamese diacritics + embedded English | **Một phần** | Unicode/original transcript được giữ; live ASR retention chưa đo. |
| Named vertical and workflow | **Đạt** | Nhà xe khách liên tỉnh; nhận cuộc gọi và đặt vé. |
| Simultaneous multilingual bonus | **Chưa đạt đầy đủ** | Có final translation, chưa có simultaneous multilingual ASR. |
| Demoable prototype | **Đạt local/public-web fallback** | Production web chạy local fallback; provider path chưa live. |
| Public GitHub repo | **Chưa chứng minh public** | `origin` fetch được trong môi trường hiện tại, nhưng anonymous web access/discovery chưa xác minh được. |
| Explainable architecture | **Đạt** | Field evidence, deterministic core, trust boundaries và audit seams được mô tả. |
| Pilot/deployment roadmap 1–2 trang | **Một phần** | Có roadmap/deployment docs; cần review độ dài và gắn exit metrics/evidence. |

## Thứ tự hoàn thiện recommended

1. **VALSEA proof:** chạy sample giọng vùng miền hoặc code-switch/noisy qua sandbox endpoint; lưu redacted request ID, transcript, latency và critical-field result.
2. **Inbound staff workflow:** thêm call queue, notification, **Nhận cuộc gọi**, atomic owner và explicit **Trao quyền Agent**.
3. **Durable safety:** thêm confirmation authorization cùng scoped idempotency transaction; audit assignment/delegation/takeover.
4. **Enterprise operations:** Apple-like dashboard, call list, metrics, roles, catalog CRUD/version/publish, vehicle templates và internal trip-seat holds.
5. **Pilot hardening:** credentialed LiveKit two-device + Neon smoke, reconnect/failure drills, retention/redaction.
6. **Multilingual benchmark:** VN/EN intra-sentence samples và breakdown theo accent/noise/telephony.

## Verification evidence của integration

Trước khi tạo tài liệu này, integration merge đã chạy:

```text
pnpm typecheck                      PASS — 0 TypeScript errors
pnpm test                           PASS — 93 TypeScript tests
agent/.venv/bin/python -m pytest    PASS — 13 Python tests
git diff --check                    PASS
unresolved conflict marker scan     PASS — 0 markers
```

Operator browser story tại source `5af9745` đã chạy `pnpm test:e2e`: **6 passed**. Flow quan sát gồm dashboard → validate/publish catalog → caller/staff two-tab → chọn/hold ghế → durable confirmation, cộng smoke 390/768/1440 và keyboard vehicle grid. Mode là `OPERATOR_DEMO_MODE=true`, memory và không phải production durability.

Full lint, unit, production build và responsive smoke được ghi tiếp trong release acceptance gate trước khi merge feature branch vào `main`.
