# Product Vision — SpeechToInvoice / VéĐi

## Vai trò tài liệu

Tài liệu này mô tả hướng sản phẩm và kết quả cần đạt. [`features.md`](features.md) là nguồn sự thật cho yêu cầu target; [`current-vs-target-architecture.md`](../docs/current-vs-target-architecture.md) ghi bằng chứng code hiện tại và khoảng trống còn lại.

Mọi capability trong tài liệu được đọc theo ba mức trưởng thành: **current main**, **credentialed pilot** và **target operations**. Target không phải tuyên bố production-live.

## Purpose

SpeechToInvoice / VéĐi là AI Voice Agent hỗ trợ nhà xe khách liên tỉnh Việt Nam biến hội thoại tiếng Việt thực tế thành booking có cấu trúc, có evidence và có người chịu trách nhiệm xác nhận.

Sản phẩm giảm thao tác ghi chép cho nhân viên nhưng không chuyển quyền quyết định chuyến, giá, ghế hoặc phát hành booking cho LLM. Staff giữ quyền trả lời mặc định; Agent chỉ trả lời trong session đã được trao quyền; confirmation luôn qua safety gate riêng.

## Users and outcomes

| User | Need | Product outcome |
|---|---|---|
| Hành khách | Đặt chuyến bằng giọng nói tự nhiên | Được hỏi đúng field thiếu, nghe summary rõ và xác nhận mà không bị Agent tự bịa giá hoặc ghế. |
| Nhân viên chăm sóc khách hàng | Nhận, theo dõi và can thiệp cuộc gọi | Có ownership, live transcript, suggestion, Agent delegation, takeover và booking evidence. |
| Dispatcher/supervisor | Điều phối nhiều phiên | Thấy incoming queue, owner, trạng thái, escalation, departures, occupancy và audit. |
| Admin nhà xe | Quản lý dữ liệu vận hành | Publish catalog có version, cấu hình xe/ghế và kiểm soát inventory nội bộ. |
| Security/data owner | Kiểm soát dữ liệu thật | Duyệt consent, role access, retention, redaction, deletion và pilot evidence. |

## Product promise

Một final caller turn phải tạo hoặc cập nhật booking facts có exact quote, message ID, confidence, source và revision. Workflow tiếp tục hỏi phần thiếu hoặc mơ hồ, chỉ đề xuất chuyến từ catalog đã publish, giữ ghế bằng inventory command server-side và chỉ phát hành một booking code sau explicit confirmation hợp lệ.

## Maturity model

### 1. Current main — public/local prototype

Current `main` chứng minh hai surface `/call` và `/staff`, local two-tab fallback, optional browser speech, partial/final transcript, deterministic field extraction, field evidence, reply suggestion, Human/Auto switching và confirmation gate trên sample catalog.

LiveKit room, Python Agent worker, VALSEA RTT/TTS và Neon repository đã có integration boundary trong source. Chúng vẫn là **code-ready**, chưa phải credentialed runtime proof nếu release chưa ghi account scope, sample, latency và observed failure behavior.

Booking code, fare và seat hiển thị trong profile này là demo output. Chúng không chứng minh ticket đã phát hành, ghế đã giữ hoặc inventory nhà xe đã đồng bộ.

### 2. Credentialed pilot — controlled provider-backed workflow

Pilot dùng hai thiết bị qua LiveKit, VALSEA-first Vietnamese audio path, worker được deploy riêng và durable persistence. Pilot chỉ mở cho dữ liệu thật sau staff authentication, signed session access, consent, retention và recovery controls.

Pilot exit evidence phải bao phủ difficult Vietnamese audio, VN/EN code-switching, latency, provider failure, reconnect, final-state preservation, explicit confirmation, authorization và scoped idempotency. Persistence failure không được tạo confirmed state hoặc success claim.

### 3. Target operations — operator platform

Target thêm incoming notification, `ringing` queue, atomic staff acceptance, exclusive owner và audited `staff ↔ agent` authority handoff. Operations dashboard phục vụ nhiều session, role, departures, occupancy, metrics và audit.

Operator data đi qua `draft → validated → published → retired`. Published catalog version bất biến; trip-seat inventory hỗ trợ `available`, `held`, `booked`, `blocked`, hold expiry, release, renewal và transactional consumption khi booking được xác nhận.

## Target success journey

1. Incoming call vào `ringing` queue; dashboard phát notification.
2. Staff nhận ownership atomically; Human reply authority là mặc định.
3. Caller audio đi qua VALSEA; partial chỉ hiển thị, final caller evidence mới cập nhật booking.
4. Staff trả lời hoặc trao quyền Agent theo session; takeover/revoke không làm mất state.
5. Workflow hỏi tối đa nhóm field liên quan tiếp theo và đưa ambiguity vào review thay vì đoán.
6. Trip, fare và seat proposal chỉ đến từ published catalog cùng inventory snapshot hiện hành.
7. Staff chọn ghế; server tạo hold có expiry và xử lý concurrent conflict.
8. Hệ thống đọc summary; passenger hoặc staff actor có quyền xác nhận rõ ràng.
9. Confirmation transaction kiểm tra authorization, evidence, review state, hold và scoped idempotency.
10. Exact retry trả booking code cũ; payload hoặc scope conflict bị từ chối và ghi audit.

Các bước incoming ownership, durable confirmation, published catalog và seat hold là target behavior, chưa phải current-main claim.

## Product principles

1. Staff acceptance và ownership đi trước Agent delegation.
2. Reply authority khác confirmation authority; Agent không được confirm booking.
3. Chỉ final caller message tạo hoặc sửa passenger evidence.
4. Staff edit không giả thành lời caller và không âm thầm thay evidence bắt buộc.
5. Published catalog cùng inventory quyết định chuyến, giá và ghế; LLM không tạo operational facts.
6. Original transcript/evidence luôn được giữ khi dịch hoặc xử lý code-switch.
7. Summary, explicit confirmation, authorization và scoped idempotency chặn booking issuance.
8. Provider hoặc persistence failure giữ final state gần nhất, degrade về Human/text và chặn success claim giả.
9. Raw audio không được lưu mặc định; recording cần consent và retention approval riêng.
10. Capability chỉ được gọi là live khi release evidence chứng minh đúng runtime profile đó.

## Measurable outcomes

Pilot và customer rollout đo tối thiểu:

- Critical Booking Field Accuracy trên origin, destination, date/time, passenger count, trip, name, phone và pickup/dropoff.
- Final transcript latency và Agent reply latency theo p50/p95.
- Booking completion rate không còn blocking review item.
- Suggestion acceptance, edit và rejection rate của staff.
- Human takeover rate cùng provider fallback recovery rate.
- Duplicate/conflicting booking issuance count.
- Seat-hold concurrency correctness, expiry và release behavior.
- Credentialed session success rate theo LiveKit, VALSEA, LLM/TTS và persistence state.

Không đặt baseline hoặc threshold giả trong Product Vision. Pilot plan chốt target theo sample, account scope và SLA khách hàng.

## Current gaps before credentialed pilot

- Incoming queue, notification, staff acceptance và exclusive ownership.
- Session-scoped delegation/revocation/takeover authorization và audit.
- Credentialed difficult-audio benchmark cùng latency/failure evidence.
- Caller-evidence enforcement tại confirmation gate.
- Durable explicit-confirmation transaction và scoped idempotency conflict handling.
- Staff authentication, role access, signed caller invite và retention automation.
- Provider/persistence failure drill chặn confirmed state giả.

Catalog publish, enterprise dashboard và conflict-safe seat holds là gate riêng nếu pilot scope tuyên bố các capability target-operations đó.

## Delivery profiles

| Profile | Evidence allowed | Claim boundary |
|---|---|---|
| Current main | Local/public demo, deterministic tests, source adapters | Không claim provider-live, ticket issued hoặc seat held. |
| Credentialed pilot | Named account/region, deployment, consented sample, latency và failure record | Chỉ claim integration được smoke trong scope đã ghi. |
| Target operations | Multi-session operations, RBAC, catalog publish, inventory/hold và transactional booking evidence | Không tự suy rộng thành external operator guarantee. |

## Scope and exclusions

Included target: incoming call intake, staff ownership, Human/Agent authority, VALSEA-first voice, live transcript, evidence-backed slot filling, catalog-bound suggestions, explicit confirmation, scoped idempotency, enterprise operations, operator catalog và internal seat holds.

Excluded until separately verified: payment, external operator-synchronized inventory hoặc ticket guarantee, PSTN/SIP, Zalo raw-call audio, SMS delivery và autonomous confirmation.
