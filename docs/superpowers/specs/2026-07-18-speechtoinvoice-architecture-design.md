# SpeechToInvoice Architecture Design

**Status:** Approved  
**Date:** 2026-07-18  
**Decision owner:** Product team  
**Product:** SpeechToInvoice — AI Voice Agent đặt vé xe

## 1. Mục tiêu

Chuẩn hóa kiến trúc hiện tại và đường nâng cấp từ public demo không cần credentials sang pilot realtime có provider thật. Kiến trúc phải giữ demo ổn định, tách luật nghiệp vụ khỏi voice/provider, cho phép nhân viên tiếp quản và không phát hành mã vé khi thiếu xác nhận rõ ràng.

## 2. Bối cảnh hiện tại

Repository đang chứa hai lớp triển khai:

- public runtime đặt vé hiện tại: Next.js, same-browser Web Call, deterministic booking agent, browser STT/TTS;
- seam voice-to-order cũ: Fastify media gateway, VALSEA, Twilio, OpenAI, ERPNext và order schema.

Tài liệu mới dùng một product canonical: **SpeechToInvoice**, domain đặt vé xe. Thành phần legacy chỉ được giữ khi còn giá trị như adapter hoặc migration seam; không được mô tả như runtime production đang hoạt động.

## 3. Phương án đã xem xét

### A. Modular monolith và realtime worker riêng — chọn

Next.js App Router sở hữu web/BFF; package dùng chung sở hữu contracts và booking core; Neon sở hữu persistence. Realtime room, media processing và voice agent chạy trong worker riêng. Fastify chỉ tồn tại như optional direct-media/PSTN gateway.

**Ưu điểm:** khớp code hiện tại, ít operational overhead, boundary rõ, demo zero-key vẫn độc lập, mở đường LiveKit/VALSEA production pilot.  
**Đổi lại:** pilot có nhiều hơn một deployable runtime và cần correlation/observability xuyên runtime.

### B. Next.js-only

Đưa UI, API, provider orchestration và media handling vào một ứng dụng.

**Ưu điểm:** một deployable unit.  
**Không chọn:** long-lived media/WebSocket và agent lifecycle không phù hợp critical path của web/BFF; tăng coupling giữa UI deploy và provider stream.

### C. Microservices đầy đủ

Tách conversation, booking, inventory, media, agent và notification thành service riêng.

**Ưu điểm:** scale và ownership độc lập.  
**Không chọn:** quá nhiều network boundary, deploy và operational cost cho hackathon/pilot.

## 4. Kiến trúc được chọn

```text
Passenger browser                 Customer-care browser
        |                                  |
        +----------- HTTPS / Web ----------+
                           |
                           v
              Next.js App Router on Vercel
              - UI and server rendering
              - session/booking BFF
              - auth and role checks
              - LiveKit token endpoint
              - provider webhooks
                           |
                 typed application ports
                  /                  \
                 v                    v
       Booking application/core      Neon Postgres
       - state machine                - sessions/messages
       - catalog policy               - booking drafts
       - confirmation rules           - evidence/audit
       - idempotency

Pilot realtime path:

Browsers <---- WebRTC ----> LiveKit room <----> Agent worker
                                              - VALSEA ASR
                                              - agent orchestration
                                              - TTS adapter
                                              - booking tool calls

Optional direct-media path:

PSTN/Twilio/Zalo replay ---> Fastify media gateway ---> same contracts/core
```

## 5. Runtime profiles

### 5.1 Public demo — hiện tại

- `/console` chạy two-sided Web Call trong cùng browser.
- Text và preset là guaranteed input.
- Browser Speech Recognition và device Speech Synthesis là progressive enhancement.
- Deterministic agent chạy local bằng pure booking core.
- Không claim LiveKit room, PSTN, provider ASR, seat inventory hoặc remote persistence.

Profile này phải build/deploy được khi không có provider credentials.

### 5.2 Pilot Contract v1 — target credentialed pilot — mục tiêu kế tiếp

- Hai browser/device tham gia LiveKit room bằng short-lived token từ Next.js server route.
- Agent worker riêng tham gia room, xử lý audio, gọi VALSEA ASR, orchestration và TTS.
- Next.js Node runtime xử lý BFF, auth, booking commands, webhook và persistence ngắn hạn.
- Neon lưu session, final message, evidence, booking draft, confirmation và audit.
- Fastify gateway chỉ bật khi cần direct VALSEA WebSocket, Twilio Media Streams hoặc transport không đi qua LiveKit.

### 5.3 Production — ngoài phạm vi hiện tại

Thêm real inventory, seat hold, payment, delivery, data-retention automation, SLO và incident response sau khi pilot chứng minh luồng chính.

## 6. Component boundaries

| Component | Sở hữu | Không được sở hữu |
|---|---|---|
| `apps/web` | App Router UI, customer/staff surfaces, BFF route handlers, auth/session presentation | booking rules, provider secrets trong client, media worker lifecycle |
| `packages/contracts` | Zod schemas và inferred types cho message, session, booking, provider events | workflow hoặc side effect |
| `packages/core` | booking state machine, extraction policy, trip selection, validation, confirmation, idempotency | HTTP, WebSocket, React, database, provider SDK |
| `db` | Drizzle schema, migrations, repository implementation | domain decision |
| Agent worker | realtime turn orchestration, ASR/TTS adapters, tool invocation, interruption handling | bypass confirmation hoặc tự tạo inventory/fare |
| `apps/api` | optional direct-media/PSTN adapter và provider webhook bridge | canonical booking logic, default web BFF |
| `packages/providers` | VALSEA, LiveKit, LLM, telephony, inventory/delivery adapters | domain state ownership |

Mỗi cross-runtime payload phải validate bằng schema từ `packages/contracts`. Domain core không import adapter.

## 7. Luồng dữ liệu chính

### 7.1 Thu thập yêu cầu

1. Passenger gửi text/preset hoặc final voice transcript.
2. Input adapter tạo `CallMessage` có `conversationId`, channel, timestamp và final flag.
3. Contract boundary validate payload.
4. Booking application gọi core để cập nhật draft và evidence.
5. Auto mode tạo reply; human mode chỉ cập nhật shared workspace.

Partial transcript được hiển thị nhưng không được mutate booking draft hoặc lưu như final evidence.

### 7.2 Xác nhận vé — Pilot Contract v1 — target credentialed pilot

1. Core kiểm tra đúng bảy readiness fields: origin, destination, travel date, passenger count, selected trip, passenger name và Vietnamese phone. Fare, time window và seats là dữ liệu summary được dẫn xuất, không phải điều kiện trước khi xác nhận.
2. Agent đọc summary từ canonical draft.
3. Passenger nói xác nhận rõ hoặc staff thực hiện authorized confirmation.
4. Command mang `idempotencyKey`; server suy ra scope từ session, draft và actor, rồi lưu scope cùng request hash và accepted-summary hash trong transaction.
5. System phát hành đúng một booking code chỉ cho retry cùng scope+cùng payload+tóm tắt; cùng key đổi payload bị từ chối và cùng raw key khác scope bị từ chối. Đây là Pilot Contract v1 — target credentialed pilot, không phải hành vi API của public demo.

### 7.3 Staff takeover

Chuyển `auto -> human` không tạo session mới, không mất message/draft/evidence. Agent dừng reply mới; staff tiếp tục trên cùng conversation state.

## 8. State model

```text
call: idle -> connected -> ended

booking:
collecting -> trip_proposed -> awaiting_confirmation -> confirmed
     ^               |                  |
     +---------------+------------------+
             correction / missing data
```

`confirmed` là terminal state trong MVP. Correction sau confirmation cần workflow riêng và không nằm trong scope hiện tại.

## 9. Data ownership

Pilot persistence dùng các aggregate/logical records sau:

- `call_session`: mode, lifecycle, participants, consent timestamps;
- `call_message` hoặc `transcript_segment`: ordered final/provisional content và provenance;
- `booking_draft`: canonical mutable draft trước confirmation;
- `booking_evidence`: field-to-message reference;
- `booking`: immutable confirmed snapshot, booking code và idempotency key;
- `audit_event`: staff takeover, correction, confirmation và provider failure.

Raw audio không lưu mặc định. Nếu pilot cần recording, phải có consent, retention period, access policy và deletion path trước khi bật.

## 10. API policy

- Server Component đọc dữ liệu server-owned trực tiếp khi phù hợp.
- Server Action dùng cho mutation nội bộ từ web UI khi không cần public HTTP contract.
- Route Handler dùng cho LiveKit token, provider webhook, external/mobile client và health endpoint.
- Node.js runtime là mặc định; không chọn Edge cho database/provider SDK path.
- Public payload validate bằng Zod; error response có stable code và correlation ID.
- Secrets chỉ nằm server-side; không dùng `NEXT_PUBLIC_*` cho provider secret.

## 11. Provider policy

- VALSEA là ASR production candidate theo challenge; browser recognition chỉ là demo fallback.
- Agent/LLM chỉ đề xuất structured action. Booking core quyết định giá trị hợp lệ và confirmation.
- TTS có adapter server/worker; device TTS giữ fallback.
- Provider timeout, quota hoặc malformed output không được làm mất draft.
- Provider-specific event được normalize trước khi vào application layer.

## 12. Failure handling

| Failure | Hành vi bắt buộc |
|---|---|
| Mic bị từ chối/unsupported | giữ text/preset input |
| ASR timeout/disconnect | hiển thị degraded state, giữ final data đã nhận, cho retry/staff takeover |
| LLM malformed/timeout | không mutate booking; trả clarification an toàn hoặc chuyển human |
| TTS lỗi | giữ text reply và replay option khi provider phục hồi |
| Database lỗi | không claim confirmed; retry bằng idempotency key |
| Duplicate provider event | deduplicate bằng provider event ID/idempotency key |
| LiveKit disconnect | reconnect cùng session khi policy cho phép; không tạo booking mới |
| Inventory/payment unavailable | dừng trước confirmation hoặc đánh dấu pending; không phát hành claim giả |

## 13. Security và privacy

- Role tối thiểu: passenger, staff, agent, service.
- Token room ngắn hạn, room/identity do server kiểm soát.
- Provider secrets và database credentials chỉ ở server/worker secret store.
- Consent trước khi gửi audio tới provider hoặc recording.
- Phone number là PII: hạn chế log, redact telemetry, kiểm soát retention.
- Mọi confirmation lưu actor, timestamp, input evidence và correlation ID.
- Webhook phải verify signature và chống replay khi provider hỗ trợ.

## 14. Observability

Một `correlationId` nối browser event, LiveKit participant/room, provider request, booking command và audit event. Theo dõi tối thiểu:

- session start/success/failure;
- ASR first-final latency và error rate;
- agent turn latency;
- staff takeover rate;
- confirmation success/rejection;
- duplicate/idempotent command count;
- provider disconnect/quota failure.

Không ghi raw audio hoặc full phone number vào application log.

## 15. Test strategy

1. Unit tests cho pure core, state transition, confirmation và idempotency.
2. Contract tests cho mọi cross-boundary schema.
3. Adapter tests bằng fixture cho VALSEA, LiveKit event, telephony và repository.
4. Integration tests cho BFF/repository/provider error mapping.
5. Playwright E2E cho text/preset, auto/human mode, takeover và confirmation.
6. Credentialed smoke test riêng cho LiveKit/VALSEA pilot; không chạy trong default CI khi thiếu secrets.

## 16. Documentation set

Canonical docs cần duy trì:

- `README.md`: product, quick start, runtime profiles, documentation map;
- `docs/architecture.md`: C4-style context/container/component/data-flow views;
- `specs/product-vision.md`, `features.md`, `domains.md`, `api-contracts.md`;
- ADRs cho architecture style, stack/runtime, contracts, test strategy, DoD, voice providers và Web Call/pilot decision;
- `docs/data-model.md`, `security-and-privacy.md`, `deployment.md`, `operations-runbook.md`;
- `docs/design-system.md`, demo script, pilot roadmap, integration feasibility và release manifest;
- task/plan docs chỉ mô tả SpeechToInvoice bus-ticket product; historical filename được phép giữ để tránh broken link.

## 17. Migration rules

- Rewrite mọi legacy product narrative sang SpeechToInvoice.
- Giữ current-state và target-state tách rõ; không mô tả seam như live integration.
- Giữ source/package name cũ trong giai đoạn docs rewrite nếu rename làm tăng scope.
- Đánh dấu legacy order/ERPNext endpoints là migration debt; không đưa vào canonical booking flow.
- Mọi thay đổi runtime cần ADR mới hoặc supersede ADR hiện có.

## 18. Non-goals

- Không đổi runtime behavior trong đợt documentation này.
- Không claim real seat inventory, payment, SMS/Zalo delivery, PSTN hoặc production LiveKit.
- Không triển khai microservices, event bus hoặc CQRS.
- Không rename repository/package/source code trong cùng scope.

## 19. Acceptance criteria

- Một product name và một bus-ticket narrative xuyên toàn bộ docs.
- `docs/architecture.md` phân biệt public demo, credentialed pilot và future production.
- ADRs không mâu thuẫn về Next.js, Fastify, LiveKit hoặc provider ownership.
- Booking confirmation, provenance, idempotency, staff takeover và degraded modes có contract rõ.
- Docs không claim capability chưa được code/credential verification chứng minh.
- Internal Markdown links resolve; không còn placeholder hoặc legacy product narrative.
