# Kiến trúc hệ thống SpeechToInvoice (VéĐi)

| Thuộc tính | Giá trị |
|---|---|
| Trạng thái | Baseline kiến trúc hiện tại và kiến trúc đích đã duyệt |
| Phiên bản tài liệu | 2.0 |
| Cập nhật | 2026-07-18 |
| Chủ sở hữu | Product team và Engineering team |
| Phạm vi | Web, realtime voice, booking core, persistence, provider gateway và vận hành |
| Quyết định nền | [ADR 0001](../adrs/0001-architecture-style.md), [ADR 0008](../adrs/0008-staff-first-livekit-valsea-agent.md) |
| Tài liệu liên quan | [Data model](data-model.md), [Security & privacy](security-and-privacy.md), [Deployment](deployment.md), [Operations runbook](operations-runbook.md), [Current vs target](current-vs-target-architecture.md) |

> SpeechToInvoice là tên sản phẩm kỹ thuật; VéĐi là thương hiệu hiển thị trong giao diện hiện tại. Tài liệu dùng “SpeechToInvoice” khi nói về hệ thống và “VéĐi” khi nhắc tới tên room, event topic, worker hoặc UI đang tồn tại trong source.

## 1. Mục đích và đối tượng đọc

Tài liệu này là nguồn mô tả kiến trúc cấp hệ thống cho:

- Product Owner và stakeholder cần biết capability nào đã chạy, capability nào mới ở mức code-ready hoặc target;
- kỹ sư phát triển cần biết boundary, dependency, contract và invariant trước khi sửa code;
- DevOps/SRE cần biết deployable unit, secret owner, health signal, failure mode và rollback boundary;
- Security/Privacy reviewer cần biết trust boundary, PII flow, consent và control gap;
- QA cần biết test layer và release evidence cần có;
- đối tác tích hợp cần biết API, room protocol và provider boundary.

Tài liệu tổ chức theo các góc nhìn C4-style: system context, container, component, deployment và runtime flow. ADR lưu lý do quyết định; file này mô tả hệ thống sau quyết định.

## 2. Tóm tắt điều hành

SpeechToInvoice dùng kiến trúc **modular monolith kết hợp realtime worker riêng**:

- Next.js App Router phục vụ giao diện hành khách/nhân viên, BFF route và token LiveKit;
- packages/contracts định nghĩa schema và type cho boundary;
- packages/core chứa reducer, rule đặt vé, evidence, validation và confirmation gate xác định;
- Python LiveKit Agent worker giữ kết nối media dài hạn, VALSEA RTT STT, VALSEA TTS và LLM tùy chọn;
- LiveKit vận chuyển WebRTC audio và room data giữa hai thiết bị;
- Neon/Drizzle là persistence seam; thiếu DATABASE_URL thì dùng memory repository;
- Fastify trong apps/api là gateway legacy/tùy chọn cho direct media, replay, Twilio và webhook, không phải booking owner.

Ba profile phải luôn được phân biệt:

1. **Local/public demo — đã kiểm chứng:** /call và /staff đồng bộ trong cùng browser bằng BroadcastChannel/localStorage; text/preset hoạt động không cần credential.
2. **Credentialed pilot — code-ready, chưa có live evidence đầy đủ:** LiveKit, Agent worker, VALSEA và Neon đã có adapter/schema nhưng chưa có credentialed two-device production smoke.
3. **Production target — chưa triển khai:** staff authentication, incoming queue/assignment, server-authoritative booking command, atomic confirmation/idempotency, real inventory, retention automation và SLO.

Không profile nào hiện được phép tuyên bố đã giữ ghế thật, thanh toán, phát hành vé vận tải, gửi SMS/Zalo hoặc vận hành PSTN production.

## 3. Phạm vi, trạng thái và nguồn sự thật

### 3.1 Phạm vi trong tài liệu

Bao gồm:

- passenger route /call và staff route /staff;
- local event transport và LiveKit transport;
- realtime Agent worker và VALSEA/OpenAI boundary;
- deterministic booking core và evidence model;
- session persistence, materialized booking snapshot và audit seam;
- optional Fastify direct-media/PSTN gateway;
- security, privacy, resilience, observability, scalability và test strategy;
- khoảng cách từ implementation hiện tại đến pilot/production.

Không bao gồm chi tiết visual design, kế hoạch sprint, giá provider hoặc quy trình kinh doanh ngoài booking demo.

### 3.2 Chú giải trạng thái

| Nhãn | Ý nghĩa |
|---|---|
| **Current — verified** | Có implementation và test/browser evidence không cần credential |
| **Current — code-ready** | Có code/fixture/schema nhưng chưa chứng minh bằng credentialed runtime |
| **Target** | Kiến trúc đã định hướng nhưng chưa đủ implementation/evidence |
| **Legacy seam** | Code cũ được giữ làm adapter hoặc migration boundary, không thuộc canonical flow |
| **Out of scope** | Không được mô tả như capability hệ thống |

### 3.3 Thứ tự nguồn sự thật

Khi tài liệu mâu thuẫn, dùng thứ tự:

1. source code, test, migration và runtime evidence hiện tại;
2. ADR có số lớn hơn hoặc ADR ghi rõ supersede;
3. [current-vs-target-architecture.md](current-vs-target-architecture.md);
4. product/API spec đã duyệt;
5. plan và tài liệu lịch sử.

## 4. Bối cảnh nghiệp vụ và ràng buộc

### 4.1 Bài toán

Nhân viên nhà xe cần vừa nghe cuộc gọi vừa nhìn transcript, phiếu đặt vé được điền dần, evidence của từng trường và câu trả lời gợi ý. Nhân viên có thể giữ quyền nói hoặc trao quyền trả lời cho Agent, nhưng confirmation cuối cùng vẫn do con người kiểm soát trong implementation hiện tại.

### 4.2 Ràng buộc chính

- Tiếng Việt và VALSEA là đường STT bắt buộc của credentialed voice pilot.
- Demo công khai phải chạy không cần provider credential.
- Long-lived WebRTC/WebSocket và Agent lifecycle không chạy trong request lifecycle của Next.js/Vercel.
- Partial transcript chỉ để hiển thị, không là booking evidence.
- LLM không được tự bịa tuyến, chuyến, giá, ghế hoặc kết quả xác nhận.
- Raw audio không được ứng dụng lưu mặc định.
- Session code hiện chỉ là khóa ghép room, không phải authentication credential.
- Static catalog hiện là dữ liệu demo, không phải inventory thật.
- packages/contracts và packages/core vẫn mang package name @ordervoice vì rename nằm ngoài phạm vi migration hiện tại.

## 5. Mục tiêu và nguyên tắc kiến trúc

| Nguyên tắc | Quy tắc thực thi |
|---|---|
| Profile truthfulness | UI, docs và release evidence phải nói rõ local, credentialed pilot hay target |
| Deterministic safety | Core xác định validation, evidence, catalog selection và confirmation gate |
| Final-only extraction | Chỉ final caller message được machine-extract vào booking; partial, Agent và staff reply không tự điền dữ kiện khách |
| Explicit staff edit | Nhân viên có thể sửa/khóa field bằng action riêng, tạo evidence source staff_edit |
| Human authority | Human là mode mặc định; LLM/worker không có quyền phát hành booking |
| Contract-first boundary | Payload TypeScript phải qua Zod; Python worker phải kiểm tra session/identity và cần tiến tới schema generated cùng version |
| Provider isolation | Provider SDK, secret và transport detail không đi vào packages/core |
| Fail safe | Lỗi provider/persistence giữ draft chưa xác nhận và không phát success giả |
| Least data | Không lưu partial/raw audio; redact phone/transcript trong log |
| One canonical write path | Target pilot phải chuyển booking mutation và confirmation sang server-authoritative application service |
| Incremental evolution | Không tách microservice nếu chưa có nhu cầu scale/ownership độc lập |

## 6. System context — C4 level 1

~~~mermaid
flowchart LR
    Passenger[Hành khách]
    Staff[Nhân viên chăm sóc khách hàng]
    Operator[Quản trị nhà xe - target]
    System[SpeechToInvoice / VéĐi]
    LiveKit[LiveKit Cloud]
    Valsea[VALSEA RTT STT và TTS]
    OpenAI[OpenAI LLM và translation tùy chọn]
    Neon[Neon Postgres]
    Inventory[Catalog và inventory thật - target]
    Telephony[Twilio/PSTN/Zalo media - optional]

    Passenger -->|Nói, nhập text, xác nhận thông tin| System
    Staff -->|Theo dõi, sửa field, trả lời, takeover, confirm| System
    Operator -->|Quản lý tuyến, chuyến, giá, ghế| System
    System <-->|WebRTC audio và room data| LiveKit
    System -->|PCM16 tiếng Việt| Valsea
    System -->|Auto reply hoặc dịch final transcript| OpenAI
    System -->|Session, final event, snapshot, audit| Neon
    System -->|Tra cứu chuyến và giữ ghế| Inventory
    Telephony -->|Media/webhook đã xác thực| System
~~~

### 6.1 Actor và external system

| Actor/hệ thống | Trách nhiệm | Trạng thái |
|---|---|---|
| Hành khách | Cung cấp thông tin, nghe summary, sửa thông tin | Current |
| Nhân viên | Quan sát transcript, sửa field, chọn Human/Auto, nói thay Agent, confirm | Current |
| Quản trị nhà xe | Quản lý catalog, ca làm, dashboard, audit | Target |
| LiveKit | Room, participant, WebRTC audio, reliable data packet, named agent dispatch | Code-ready; chưa credentialed smoke |
| VALSEA | Realtime Vietnamese ASR và TTS | Code-ready; chưa credentialed smoke |
| OpenAI | Auto reply và dịch final transcript sang English, store=false cho translation | Code-ready; cần credential hợp lệ |
| Neon Postgres | Durable event/snapshot/audit persistence | Schema/code-ready; chưa live migration evidence |
| Inventory/payment/delivery | Availability, seat hold, payment, ticket delivery | Out of scope hiện tại |
| Fastify/Twilio gateway | Direct PCM, replay, PSTN media và webhook bridge | Legacy/optional seam |

## 7. Quyết định kiến trúc tổng thể

### 7.1 Phương án được chọn

**Modular monolith với realtime worker riêng.**

- Web/BFF và application layer cùng repository, cùng release train ở giai đoạn pilot.
- Domain rule nằm trong package thuần TypeScript, không phụ thuộc React, HTTP, DB hoặc provider.
- Worker Python tách deploy vì giữ WebRTC/WebSocket, VAD, STT/TTS và turn lifecycle dài hạn.
- Fastify chỉ bật khi transport không đi qua LiveKit.

### 7.2 Phương án không chọn

| Phương án | Lý do không chọn |
|---|---|
| Next.js-only | Long-lived media và Agent lifecycle không phù hợp request lifecycle; coupling UI deploy với media session |
| Full microservices | Tăng network boundary, schema coordination, deployment và vận hành trước khi có scale/ownership cần thiết |
| LLM làm booking owner | Không đảm bảo deterministic validation, evidence provenance, idempotency hoặc chống hallucination |
| Browser giữ provider secret | Vi phạm trust boundary và không thể kiểm soát credential |

## 8. Runtime profile

### 8.1 Local/public demo — Current, verified

~~~mermaid
flowchart LR
    subgraph Browser[Cùng một browser profile]
        Caller[/call - caller UI]
        Staff[/staff - staff cockpit]
        Channel[DemoCallChannel]
        Storage[BroadcastChannel + localStorage]
        Reducer[useCallSession + session reducer]
        Core[packages/core booking reducer]
        Caller --> Channel
        Staff --> Channel
        Channel <--> Storage
        Channel --> Reducer
        Reducer --> Core
    end
    Web[Next.js web server] --> Caller
    Web --> Staff
~~~

Đặc điểm:

- /console chỉ redirect sang /staff;
- hai tab dùng cùng session code, mặc định DEMO42;
- BroadcastChannel truyền event; localStorage giữ tối đa 100 event gần nhất theo session;
- khi BroadcastChannel không có, test/runtime fallback nội bộ dùng memory endpoint;
- text/preset là input bảo đảm; browser/device speech chỉ là progressive enhancement;
- reducer và booking core chạy trong client của từng tab, nên tính deterministic là điều kiện giữ state đồng nhất;
- không có server authentication, remote media, provider STT, durable booking transaction hoặc inventory thật;
- dữ liệu demo có thể còn trong localStorage trên thiết bị, dù không gửi lên server khi persistence tắt.

### 8.2 Credentialed pilot — Current code-ready, chưa verified end-to-end

~~~mermaid
flowchart TB
    Caller[Caller browser /call]
    Staff[Staff browser /staff]
    BFF[Next.js App Router / BFF]
    LK[LiveKit room]
    Worker[Python LiveKit Agent worker]
    STT[VALSEA RTT]
    LLM[OpenAI optional]
    TTS[VALSEA TTS]
    Repo[Session repository]
    DB[(Neon Postgres)]

    Caller -->|POST token| BFF
    Staff -->|POST token| BFF
    Caller <-->|WebRTC audio + vedi.events| LK
    Staff <-->|WebRTC audio + vedi.events| LK
    LK <-->|caller audio + reliable data| Worker
    Worker <-->|PCM16 / partial / final| STT
    Worker -->|Auto reply hoặc translation| LLM
    Worker -->|Approved/Auto speech| TTS
    Caller -->|POST non-partial event| BFF
    Staff -->|POST non-partial event| BFF
    BFF --> Repo --> DB
~~~

Đặc điểm current:

- server cấp token TTL 1.200 giây, scope đúng room vedi-{session-lowercase};
- caller identity cố định caller-{SESSION}; staff identity staff-{SESSION}-{random};
- caller token mới gắn named agent dispatch; staff join không dispatch worker lần hai;
- worker chỉ subscribe audio của caller identity và lọc staff.* theo staff identity prefix;
- audio được normalize mono PCM16 16 kHz, noise cancellation BVC, record=false;
- VALSEA partial/final được publish qua topic vedi.events;
- final transcript mới được dịch tùy chọn; translation dùng store=false và timeout 2,5 giây;
- UI client vẫn đang tính booking draft. BFF hiện lưu event/snapshot chứ chưa là canonical booking command owner;
- DATABASE_URL bật Neon repository; thiếu biến này dùng process-local memory repository;
- integration status hiện ghi nhận chưa có credentialed LiveKit/VALSEA/Neon smoke đầy đủ.

### 8.3 Production target

~~~mermaid
flowchart TB
    Passenger[Passenger clients]
    Staff[Authenticated staff console]
    Auth[Identity + session authorization]
    BFF[Next.js BFF]
    App[Booking application service]
    Core[Pure booking core]
    Repo[Transactional repository]
    DB[(Postgres)]
    LK[LiveKit]
    Worker[Agent worker]
    Provider[VALSEA / LLM / TTS]
    Catalog[Published catalog + inventory]
    Audit[Audit / metrics / alerts]

    Passenger --> Auth --> BFF
    Staff --> Auth
    BFF --> App --> Core
    App --> Repo --> DB
    App --> Catalog
    Passenger <-->|audio/data| LK
    Staff <-->|audio/data| LK
    LK <--> Worker <--> Provider
    Worker -->|service-auth normalized final command| App
    BFF --> Audit
    Worker --> Audit
    App --> Audit
~~~

Production target bắt buộc:

- authentication và authorization theo user, role, session assignment;
- signed caller invite có expiry, rate limit và abuse protection;
- incoming queue, atomic staff assignment, takeover/delegation audit;
- server-authoritative booking mutation thay cho client-only reducer;
- explicit confirmation record, accepted-summary hash và scoped idempotency transaction;
- catalog/inventory provider thật; code demo không được coi là vé;
- retention/deletion job, access review, incident response và measurable SLO;
- credentialed smoke, load test, reconnect test và disaster-recovery evidence.

## 9. Deployment view

| Deployable unit | Runtime | Lifecycle | Scale boundary | Secret owner |
|---|---|---|---|---|
| apps/web | Next.js 16, Node.js runtime, Vercel | Request/response và browser assets | Horizontal/stateless; memory repository không phù hợp multi-instance | Vercel project |
| agent | Python 3.11, LiveKit Agents | Long-lived room job | Theo concurrent caller/room; cần warm capacity | Worker platform |
| apps/api | Fastify Node.js | HTTP + long-lived WebSocket | Scale riêng theo connection; sticky/state policy nếu dùng | Gateway platform |
| Neon | Managed Postgres | Durable | Theo connection/query/storage | Data owner |
| LiveKit | Managed realtime | Room/participant | Theo room, participant, bandwidth | Realtime owner |

Quy tắc deploy:

- worker và Fastify không được nhúng vào Vercel request handler;
- web, worker và gateway có secret store, health check, rollback độc lập;
- cùng LiveKit project credential phải được cấu hình cho BFF và worker;
- migration chạy trước khi web bật durable write path;
- feature flag chỉ được bật sau health/smoke tương ứng;
- local profile phải còn hoạt động khi provider credential vắng mặt.

Chi tiết biến môi trường và rollout nằm tại [deployment.md](deployment.md).

## 10. Container và component ownership

| Container/component | Sở hữu | Không được sở hữu |
|---|---|---|
| apps/web/src/app | Route, server rendering, BFF handlers, integration status | Provider secret trong client, long-lived media |
| components/call | Caller UX, consent interaction, mic/text/preset control | Booking policy hoặc token signing |
| components/staff | Staff cockpit, transcript, evidence display, edit/confirm action | Canonical authorization hoặc DB transaction |
| hooks/use-call-session | Client orchestration, event send/receive, local state | Production source of truth |
| lib/call/demo-channel | Same-browser event transport và history | Cross-device delivery |
| lib/call/livekit-adapter | LiveKit data transport adapter | Token signing, booking rule |
| lib/livekit/server | Integration status, token creation, room/identity naming | Staff auth hiện chưa có; media processing |
| lib/db/session-repository | Event append/list, memory/Neon adapter, materialization | Domain validity decision |
| packages/contracts | Zod schema, discriminated union, inferred types | Side effect hoặc workflow |
| packages/core | Extraction, catalog demo, evidence, review item, suggestion, confirmation gate | React, HTTP, WebSocket, DB, SDK |
| agent/agent.py | Agent job, audio pipeline, Human/Auto voice policy, event publish | Booking confirmation hoặc inventory truth |
| agent/valsea_stt.py | VALSEA protocol, PCM validation, partial/final mapping | Booking mutation |
| packages/providers | VALSEA/Twilio/OpenAI/ERPNext adapter seam | Canonical bus booking state |
| apps/api | Direct media/PSTN/webhook bridge và legacy order API | Default BFF hoặc canonical booking owner |
| db | Drizzle schema, migration, DB client | Domain transition |

### 10.1 Dependency rule

~~~text
UI / worker / gateway
        |
        v
contracts + application ports
        |
        v
pure core

repository adapters ---> database
provider adapters  ---> external providers
~~~

packages/core không import UI, DB, provider hoặc transport. Adapter được phép phụ thuộc contract/core; chiều ngược lại bị cấm.

## 11. Data plane và control plane

### 11.1 Audio plane

~~~text
caller microphone
  -> LiveKit WebRTC
  -> worker AudioInput
  -> mono PCM16 16 kHz
  -> VALSEA RTT WebSocket
  -> partial/final transcript
  -> worker room event

approved staff/Auto text
  -> VALSEA TTS
  -> worker audio output
  -> LiveKit room
  -> caller/staff speakers
~~~

Audio plane không đi qua Next.js BFF. Ứng dụng đặt record=false và không có raw-audio persistence sink.

### 11.2 Realtime event plane

- Topic: vedi.events.
- Local transport: BroadcastChannel name vedi.events.{SESSION}.
- Live transport: reliable LiveKit room data.
- Mọi TypeScript ingress parse bằng roomEventSchema.
- UI reducer dedupe theo eventId, giữ cửa sổ 200 ID gần nhất.
- Local history giữ tối đa 100 event; LiveKit adapter không có history riêng.

### 11.3 Command/control plane

- POST /api/livekit/token: tạo participant token;
- GET /api/config: công bố trạng thái integration không chứa secret;
- GET/POST /api/sessions/{sessionCode}: replay/append room event;
- staff.preferences, staff.speak, staff.end_turn, staff.end_call: command room;
- target bổ sung authenticated booking command, assignment, delegation và confirmation API.

### 11.4 Persistence plane

- partial không được repository lưu;
- non-partial event được append và dedupe;
- final transcript materialize vào bus_call_messages;
- booking.snapshot materialize vào bus_bookings và booking_audit_events;
- memory mode chỉ tồn tại trong process;
- Neon mode dựa vào unique (call_id, event_id) và unique booking theo call.

## 12. Protocol vedi.events

### 12.1 Envelope chung

| Field | Kiểu/rule | Ý nghĩa |
|---|---|---|
| version | literal 1 | Version protocol |
| eventId | non-empty string | Dedupe identity |
| sessionCode | A-Z0-9, 4–12 ký tự | Session routing |
| occurredAt | ISO datetime | Event time |
| type | discriminant | Event/command kind |

### 12.2 Event từ hệ thống/worker

| Type | Payload chính | Consumer |
|---|---|---|
| session.status | transport, state, callerPresent, valsea, agent, detail | Caller/staff status UI, persistence |
| transcript.partial | realtime message | UI display only |
| transcript.final | caller/staff/agent message | Transcript, caller-only extraction, persistence |
| booking.snapshot | revision, booking | Shared state, persistence |
| reply.suggested | suggestion | Staff assistant rail |
| agent.state | idle/listening/thinking/speaking/offline | Status UI |
| agent.error | code, message, recoverable | Error UI/operations |

### 12.3 Command từ staff

| Type | Ý nghĩa | Current authorization |
|---|---|---|
| staff.preferences | Chọn human/auto và transcript language | Chỉ kiểm tra role phía UI và identity prefix trong worker |
| staff.speak | Phát câu nhân viên duyệt qua TTS | Như trên |
| staff.end_turn | Commit VALSEA/user turn | Như trên |
| staff.end_call | Kết thúc Agent session | Như trên |

**Gap:** Python worker chưa parse toàn bộ payload bằng schema generated tương đương Zod; nó kiểm tra JSON shape tối thiểu, sessionCode, event type và participant identity. Trước pilot thật cần JSON Schema/version compatibility test giữa TypeScript và Python.

## 13. State model

### 13.1 Session connection

~~~mermaid
stateDiagram-v2
    [*] --> waiting
    waiting --> connecting
    connecting --> connected
    connected --> reconnecting
    reconnecting --> connected
    connecting --> error
    reconnecting --> error
    connected --> ended
    error --> connecting: controlled retry
    error --> ended
~~~

Current realtime contract dùng waiting, connecting, connected, reconnecting, ended, error. Legacy busDemoWorkspace còn callStatus idle, connected, ended.

### 13.2 Reply authority

~~~mermaid
stateDiagram-v2
    [*] --> human
    human --> auto: staff.preferences
    auto --> human: takeover
    human --> human: staff.speak
    auto --> auto: staff.speak
~~~

- Human là mặc định.
- Human mode vẫn STT và suggestion, nhưng worker ném StopResponse để chặn spontaneous reply.
- Auto chỉ sinh LLM reply khi OPENAI_API_KEY hợp lệ.
- staff.speak được phép ở cả hai mode.
- Chuyển mode giữ nguyên session, transcript, draft, revision và evidence.
- Current chưa có staff assignment/owner authorization trước khi chuyển mode.

### 13.3 Booking

~~~mermaid
stateDiagram-v2
    [*] --> collecting
    collecting --> trip_proposed: route/date đủ và match catalog
    collecting --> awaiting_confirmation: mọi field current đủ
    trip_proposed --> collecting: correction hoặc conflict
    trip_proposed --> awaiting_confirmation: passenger + trip facts đủ
    awaiting_confirmation --> collecting: correction hoặc review mở
    awaiting_confirmation --> confirmed: staff confirm gate pass
    confirmed --> confirmed: repeat current demo confirmation
~~~

Current staff-first gate trong packages/core yêu cầu 11 field:

- origin, destination, travelDateLabel, timeWindow;
- passengerCount, passengerName, phone;
- pickupPoint, dropoffPoint, selectedTrip, seats.

totalFareVnd được dẫn xuất. Pilot Contract v1 trong spec dùng bảy readiness concept và coi time window/fare/seats là summary/catalog data. Hai contract chưa hoàn toàn đồng nhất; migration phải version rõ và có contract test trước khi pilot API trở thành canonical.

confirmed là terminal state trong MVP. Correction sau confirmation cần workflow mới, không update snapshot cũ.

## 14. Luồng nghiệp vụ chính

### 14.1 Khởi tạo và join LiveKit

~~~mermaid
sequenceDiagram
    participant C as Caller browser
    participant S as Staff browser
    participant B as Next.js BFF
    participant L as LiveKit
    participant W as Agent worker

    C->>B: POST /api/livekit/token (caller, session)
    B->>B: normalize session; create room-scoped token
    B-->>C: token TTL 20 phút + caller identity
    C->>L: join room; caller token dispatch named Agent
    L->>W: create job with session/caller metadata
    S->>B: POST /api/livekit/token (staff, session)
    B-->>S: token TTL 20 phút + random staff identity
    S->>L: join same room, không dispatch Agent lần hai
    W-->>C: session.status connecting/live
    W-->>S: session.status connecting/live
~~~

Current token endpoint không authenticate caller/staff và không kiểm tra assignment. Vì vậy session code chỉ dùng cho demo/pilot nội bộ có dữ liệu mẫu.

### 14.2 Audio, transcript và extraction

~~~mermaid
sequenceDiagram
    participant C as Caller
    participant L as LiveKit
    participant W as Worker
    participant V as VALSEA
    participant UI as Staff/Caller reducer
    participant Core as Booking core

    C->>L: microphone audio
    L->>W: caller track
    W->>W: mono + resample 16 kHz + noise cancellation
    W->>V: PCM16 stream
    V-->>W: transcript.partial
    W-->>UI: transcript.partial
    UI->>UI: display only
    V-->>W: transcript.final
    W-->>UI: transcript.final(role=caller)
    UI->>Core: applyBookingMessage(final caller)
    Core-->>UI: draft + evidence + review + suggestion
~~~

Invariant:

- partial không mutate draft và không persist;
- final không phải caller chỉ vào transcript;
- machine extraction chỉ dùng final caller;
- staff edit là action riêng, không giả làm caller message;
- catalog-derived field dùng evidence source catalog;
- conflict/ambiguous tạo review item thay vì đoán.

### 14.3 Human, Auto và staff-approved speech

~~~mermaid
sequenceDiagram
    participant S as Staff
    participant UI as Staff UI
    participant W as Worker policy
    participant LLM as OpenAI optional
    participant TTS as VALSEA TTS
    participant C as Caller

    S->>UI: chọn Human hoặc Auto
    UI->>W: staff.preferences
    alt Human
        W->>W: lưu final context; StopResponse
        S->>UI: duyệt/nhập câu trả lời
        UI->>W: staff.speak
        W->>TTS: synthesize approved text
    else Auto
        W->>LLM: final caller turn
        LLM-->>W: guarded reply text
        W->>TTS: synthesize Agent reply
    end
    TTS-->>C: spoken audio
~~~

LLM không nhận booking confirmation authority. Nếu LLM lỗi hoặc thiếu key, Human mode và text suggestion vẫn là safe path.

### 14.4 Staff edit và evidence

1. Staff chọn field và giá trị trong booking form.
2. applyStaffFieldEdit cập nhật draft.
3. Core tạo BookingFieldEvidence với source=staff_edit, confidence=1 và message ID riêng.
4. Field được thêm vào confirmedFields; review item cùng field được resolve.
5. UI tăng revision và phát booking.snapshot.
6. Repository lưu snapshot nếu persistence bật.

Staff edit là correction có audit intent, nhưng current API chưa xác thực staff identity hoặc permission. Target phải persist actor ID, reason và authorization.

### 14.5 Confirmation hiện tại

~~~mermaid
sequenceDiagram
    participant S as Staff
    participant UI as Staff UI
    participant Core as Booking core
    participant R as Session repository
    participant DB as Neon

    S->>UI: bấm Xác nhận đặt vé
    UI->>Core: confirmBooking(actor=staff)
    Core->>Core: getBookingConfirmationState
    Core-->>UI: confirmed draft + deterministic VD code
    UI->>R: booking.snapshot revision mới
    R->>DB: upsert bus_bookings + append audit
~~~

Current safety:

- gate chặn khi thiếu field, phone sai, ghế không đủ hoặc review item còn mở;
- repeat confirm trên cùng draft trả cùng deterministic code;
- eventId duplicate bị repository dedupe.

Current limitation:

- confirmation diễn ra ở client;
- chưa có explicit booking_confirmation record;
- chưa có authenticated actor/session assignment;
- chưa có accepted-summary hash, request hash hoặc scoped idempotency key;
- insert event, materialization và audit chưa được bọc trong một transaction thể hiện ở repository;
- event khác ID có thể tạo thêm audit confirmed dù code không đổi;
- code demo không phải seat hold hoặc ticket.

### 14.6 Confirmation target

1. Server nhận authenticated confirmation command.
2. Server derive scope từ session, draft, actor role và actor ID.
3. Transaction lock/read draft version, active evidence, authorization và accepted summary.
4. Nếu cùng scope/key/hash: trả booking đã tạo.
5. Nếu đổi payload/summary: IDEMPOTENCY_CONFLICT.
6. Nếu raw key thuộc scope khác: IDEMPOTENCY_SCOPE_CONFLICT, không lộ booking.
7. Nếu hợp lệ: ghi booking_confirmation, immutable booking, audit event và code đúng một lần.
8. Nếu DB fail: rollback toàn bộ; UI giữ unconfirmed.

Chi tiết logical schema nằm trong [data-model.md](data-model.md).

## 15. Data architecture

### 15.1 Current physical model

| Table | Vai trò hiện tại | Hạn chế |
|---|---|---|
| bus_calls | Session mode/status/transport/revision | Thiếu user/assignment/consent/correlation chuẩn |
| bus_call_events | Append room event, unique callId+eventId | Chưa có schema version migration/pagination |
| bus_call_messages | Final transcript và translation | Chưa có retention job/author identity chuẩn |
| bus_bookings | Mutable draft và confirmed snapshot trong cùng row | Conflate draft/booking; JSONB evidence; không atomic confirmation |
| booking_audit_events | Snapshot/confirmed audit theo booking | Scope hẹp, payload/actor chưa đủ enterprise |
| conversations/order_* | Legacy generic voice-to-order model | Migration debt, không phải canonical bus flow |

### 15.2 Target logical model

~~~text
call_session 1 ---- * call_message
call_session 1 ---- 1 booking_draft
booking_draft 1 --- * booking_evidence --- 1 call_message
booking_draft 1 --- * booking_confirmation
booking_confirmation 0..1 --- 1 immutable booking
call_session / draft / confirmation / booking --- * audit_event
~~~

### 15.3 Data ownership

- call_session: lifecycle, participants, mode, consent;
- call_message: ordered final content và provenance;
- booking_draft: mutable canonical state trước confirmation;
- booking_evidence: field-to-message reference;
- booking_confirmation: actor, authorization, summary hash, idempotency;
- booking: immutable accepted snapshot;
- audit_event: append-only control timeline.

### 15.4 Retention

Current:

- local demo lưu tối đa 100 room event trong localStorage theo session;
- partial không lưu repository;
- raw audio không lưu, worker record=false;
- final transcript/snapshot trong Neon không có automated retention evidence.

Target:

- consent trước provider audio;
- policy riêng cho local storage, final transcript, booking evidence, audit và backup;
- deletion/anonymization workflow;
- phone, name, transcript và booking code không xuất hiện nguyên dạng trong log;
- recording chỉ bật sau separate consent, retention và deletion control.

## 16. Consistency, ordering và idempotency

| Cơ chế | Current | Gap/target |
|---|---|---|
| Event validation | Zod roomEventSchema ở TypeScript ingress | Generated schema cho Python |
| Session isolation | sessionCode match; LiveKit room/identity naming | Authentication + authorization |
| Duplicate event | Client seenEventIds; DB unique callId+eventId | Durable consumer offset/metric nếu scale |
| Revision | UI bỏ snapshot revision cũ | DB upsert chưa guard revision cũ |
| Local history | 100 event | Không dùng làm durable replay |
| Live history | Không có trong adapter | Rehydrate từ authorized session API/snapshot |
| Confirmation retry | Deterministic code reuse trong draft | Scoped idempotency transaction |
| Event + materialization | Sequential repository writes | Atomic transaction/outbox hoặc recoverable replay |
| Multi-writer | Caller/staff client cùng tính deterministic reducer | Server-authoritative command owner |

Đặc biệt, bus_call_events có thể được insert trước khi materialization fail. Vì vậy target repository phải transaction hóa hoặc có projector replay idempotent. DB projector cũng phải chỉ apply booking.snapshot khi revision mới hơn revision hiện lưu.

## 17. API và interface inventory

### 17.1 Next.js current

| Interface | Runtime | Chức năng | Security status |
|---|---|---|---|
| GET /api/health | Node | Health cơ bản | Public |
| GET /api/config | Node, no-store | Public integration flags | Không lộ secret |
| POST /api/livekit/token | Node | Room token 20 phút | Chưa auth/rate limit |
| GET /api/sessions/{code} | Node, no-store | Replay persisted event | Chưa session authorization |
| POST /api/sessions/{code} | Node | Validate và append event | Chưa actor authorization |

### 17.2 Optional Fastify gateway

| Interface | Chức năng | Phân loại |
|---|---|---|
| GET /v1/health | Gateway health | Optional |
| WS /ws/media/{conversationId} | Browser/replay PCM → VALSEA | Legacy/optional |
| POST /v1/webhooks/twilio/voice | Verify webhook, trả TwiML stream | Optional PSTN |
| POST /v1/webhooks/twilio/status | Verify status webhook | Optional PSTN |
| WS /ws/telephony/{conversationId} | Twilio Media Stream → VALSEA | Optional PSTN |
| /v1/orders/* | Generic order correction/approval/export | Legacy, không thuộc canonical bus booking |

Production không được expose legacy endpoint như booking API nếu chưa có auth, rate limit, canonical contract và ownership review.

## 18. Security architecture

### 18.1 Trust zone

~~~mermaid
flowchart LR
    Z1[Zone 1: Browser không tin cậy]
    Z2[Zone 2: Next.js BFF]
    Z3[Zone 3: LiveKit room]
    Z4[Zone 4: Agent worker / gateway]
    Z5[Zone 5: Provider bên ngoài]
    Z6[Zone 6: Neon data]

    Z1 -->|HTTPS + token request| Z2
    Z1 <-->|short-lived room token| Z3
    Z3 <--> Z4
    Z4 -->|server credential| Z5
    Z2 -->|DATABASE_URL| Z6
~~~

### 18.2 Control hiện có

- provider và database secret chỉ ở server/worker env;
- LiveKit token room-scoped, identity-scoped, TTL 20 phút;
- caller-only named Agent dispatch;
- worker kiểm tra participant identity trước staff command/caller transcript;
- TypeScript boundary dùng strict Zod schema;
- VALSEA key không nằm trong web app;
- OpenAI translation dùng store=false;
- worker record=false;
- Twilio production webhook có signature verification khi đủ config.

### 18.3 Gap chặn pilot có dữ liệu thật

| Rủi ro | Current gap | Control bắt buộc |
|---|---|---|
| Giả mạo staff/caller | Client tự khai role khi xin token | Staff auth, signed caller invite, session assignment |
| Đọc/ghi session khác | Session API chỉ kiểm code format | Authorization theo actor và session |
| Abuse token endpoint | Chưa rate limit/challenge | Rate limit, audit, bot/abuse control |
| Command room giả | Worker kiểm prefix nhưng token issuer chưa auth | Signed role claim và server-side authorization |
| PII trong browser | localStorage giữ event | Sample data only, clear policy, expiry hoặc encrypted/disabled storage |
| PII trong DB/log | Phone/transcript lưu plain fields; chưa retention automation | Least access, encryption baseline, redaction, retention/deletion |
| Confirmation giả/replay | Client confirm, không actor auth | Server transaction + explicit confirmation + idempotency |
| Cross-language schema drift | Python không full-validate Zod contract | Generated JSON schema/model + compatibility CI |

Chi tiết control và incident response nằm tại [security-and-privacy.md](security-and-privacy.md) và [operations-runbook.md](operations-runbook.md).

## 19. Failure handling và degraded mode

| Failure | Current safe behavior | Gap/target recovery |
|---|---|---|
| Mic denied/unsupported | Text/preset vẫn dùng được | Consent UX và device diagnostics |
| LiveKit chưa config | Server chọn local transport | Đúng cho public demo |
| LiveKit đã config nhưng connect fail | UI báo error; LiveKit adapter queue event in-memory | Chưa automatic failover sang local; cần explicit retry/fallback policy |
| Worker chưa sẵn sàng | session.status/agent state báo dispatching/error | Worker health, warm capacity, dispatch timeout |
| VALSEA connect/stream fail | agent.error recoverable, status error, không tạo booking | Staff takeover/text path và retry budget |
| Partial bị mất/trùng | Không ảnh hưởng booking | Không cần persist |
| Final bị trùng | message/event dedupe ở UI/DB | Provider-event metric và replay test |
| LLM thiếu key/lỗi | Human mode; AUTO_LLM_UNCONFIGURED; giữ transcript | Không chặn STT/booking |
| Translation timeout/lỗi | Giữ original transcript | Đúng; không retry vô hạn |
| TTS lỗi | Text/suggestion còn trong UI | Error mapping và replay sau recovery |
| Persistence thiếu | memory mode, durable=false | Không được claim durable pilot |
| Persistence fail giữa event/projector | Có thể lệch event log và materialized row | Transaction hoặc replayable projector |
| Snapshot đến sai thứ tự | UI guard revision; DB chưa guard | Conditional update theo revision |
| Duplicate confirmation | Same draft code không đổi | Atomic scoped idempotency |
| Inventory/payment unavailable | Chỉ demo snapshot/code | Không claim hold/payment |

Mọi failure liên quan confirmation phải fail closed: không chuyển confirmed nếu durable transaction chưa thành công.

## 20. Observability và audit

### 20.1 Signal hiện có

- session.status cho transport, caller presence, VALSEA và Agent;
- agent.state và agent.error có recoverable flag;
- eventId, sessionCode, occurredAt;
- Python structured logger theo room/session;
- database event log và booking audit snapshot;
- /api/config công bố runtime readiness không chứa secret.

### 20.2 Gap

Current schema chưa có correlationId xuyên browser → BFF → LiveKit → worker → provider → database. Chưa có metric/trace chuẩn, dashboard, alert threshold hoặc retention cho log.

### 20.3 Target telemetry

Mỗi session có correlationId ổn định; mỗi event/provider request có ID riêng. Theo dõi:

- session create/join/accept/end;
- token issue/reject/rate-limit;
- LiveKit connection/reconnect và worker dispatch;
- VALSEA ready, first partial, first final, error/quota;
- Agent first-token/TTS first-audio và interruption;
- final transcript count, duplicate count, translation failure;
- booking revision, open review item, staff edit/takeover;
- confirmation accepted/rejected/idempotent/conflict;
- DB latency/error/projector lag;
- retention/deletion và security event.

Không log raw audio, token, authorization header, full phone, full transcript hoặc evidence quote mặc định. SLO threshold phải được owner phê duyệt trước production; chưa có threshold là production release blocker, không phải ngầm hiểu “best effort”.

## 21. Performance và scalability

| Area | Current characteristic | Scale implication |
|---|---|---|
| Local demo | Một browser profile, history 100 event | Không hỗ trợ hai thiết bị hoặc nhiều operator |
| UI reducer | Giữ messages và 200 seen event IDs trong memory | Cần pagination/snapshot cho session dài |
| LiveKit | Một room/session, một caller identity, nhiều staff identity | Cần participant limit và ownership rule |
| Worker | Một job theo caller dispatch; VAD + STT/TTS | Scale theo concurrent calls, cần warm capacity |
| VALSEA | PCM16 mono 16 kHz; ready wait 15 giây | Cần latency/quota benchmark bằng audio thật |
| Translation | Chỉ final, timeout 2,5 giây | Không chặn STT; cần concurrency/quota policy |
| Next.js | Stateless khi dùng Neon | Memory repository không dùng được nhiều instance |
| Session replay | GET trả toàn bộ event | Cần pagination, snapshot và retention |
| DB | JSONB snapshot/evidence và event log | Cần index/query plan, revision guard, archive |
| Fastify WebSocket | Long-lived connection | Deploy/scale riêng, không serverless request |

Không thêm queue/event bus chỉ vì dự đoán scale. Chỉ tách service khi có bằng chứng về throughput, ownership hoặc failure isolation.

## 22. Test và verification strategy

| Layer | Phạm vi | Vị trí |
|---|---|---|
| Unit | Core extraction, evidence, state, confirmation gate, audio parser | packages/core/test, apps/api/test, agent/test_* |
| Contract | Zod schema, event union, provider fixture | packages/contracts/test, packages/providers/test |
| Component | Caller/staff UI, partial/final, mode, confirm | apps/web/src/**/*.test.* |
| Repository integration | Memory/Neon adapter behavior, dedupe/materialization | apps/web/src/lib/db/*.test.ts, db/test |
| E2E | /call, /staff, design/accessibility | apps/web/e2e |
| Credentialed smoke | LiveKit two-device, VALSEA real Vietnamese audio, worker, Neon | Chưa có đầy đủ evidence |
| Security negative | Token role/session, webhook signature, replay, authorization | Một phần; target mở rộng |
| Load/resilience | Concurrent rooms, reconnect, provider timeout, DB failure | Target |

Release gate tối thiểu:

1. lint, typecheck, unit/contract/component/integration test pass;
2. production build pass;
3. local two-tab smoke pass không credential;
4. credentialed capability chỉ được claim khi smoke đúng provider/account/environment;
5. security/privacy checklist và no-secret scan pass;
6. confirmation transaction/retry/conflict test pass trước pilot có dữ liệu thật;
7. docs, ADR và release manifest khớp source SHA.

## 23. Current vs target gap và ưu tiên

### 23.1 P0 — chặn pilot có hành khách thật

| Gap | Current | Exit condition |
|---|---|---|
| Identity và authorization | Không có staff auth/signed caller invite | Authenticated role, session-bound grant, negative tests |
| Canonical write owner | Booking reducer chạy client | Server application command là source of truth |
| Confirmation integrity | Client confirm, deterministic code | Atomic explicit confirmation + scoped idempotency |
| Consent và PII | record=false nhưng chưa full consent/retention workflow | Consent evidence, retention/deletion, redaction |
| Provider evidence | Adapter có, credentialed smoke thiếu | Two-device LiveKit + VALSEA + worker + Neon smoke |
| API abuse control | Token/session route public | Rate limit, audit, session authorization |
| Contract parity | Python kiểm payload tối thiểu | Generated schema + compatibility CI |

### 23.2 P1 — pilot vận hành ổn định

| Gap | Exit condition |
|---|---|
| Incoming queue và staff assignment | ringing → accepted, atomic owner, reassignment audit |
| Reconnect/resync | Authorized snapshot replay, revision-safe projector |
| Observability | Correlation ID, metrics, alert, redacted logs |
| Worker availability | Health, warm capacity, graceful drain, rollout |
| Data lifecycle | Retention/deletion job và access review |
| Catalog management | Published route/trip/fare data với effective version |

### 23.3 P2 — production expansion

- real inventory và seat hold;
- payment orchestration;
- ticket/SMS/Zalo delivery;
- PSTN/SIP production;
- enterprise dashboard, analytics, search và role administration;
- multi-operator tenancy;
- disaster recovery và formal SLO/error budget.

## 24. Architecture governance

### 24.1 ADR map

| ADR | Quyết định |
|---|---|
| [0001](../adrs/0001-architecture-style.md) | Modular monolith + separate realtime worker |
| [0002](../adrs/0002-tech-stack.md) | Next.js/Node/TypeScript, Neon/Drizzle, Vitest/Playwright |
| [0003](../adrs/0003-contract-first.md) | Contract-first và provenance |
| [0004](../adrs/0004-test-strategy.md) | Test pyramid + credentialed smoke |
| [0005](../adrs/0005-definition-of-done.md) | Definition of Done và release evidence |
| [0006](../adrs/0006-realtime-voice-providers.md) | VALSEA-first, provider isolation |
| [0007](../adrs/0007-bus-ticket-web-call-demo.md) | Local demo vs LiveKit pilot |
| [0008](../adrs/0008-staff-first-livekit-valsea-agent.md) | Staff-first room, VALSEA cascade worker |

### 24.2 Khi nào phải tạo/supersede ADR

Tạo ADR mới khi:

- đổi source of truth hoặc ownership boundary;
- thêm deployable service/database/event broker;
- đổi provider chính hoặc transport realtime;
- đổi confirmation, evidence, idempotency hoặc authorization invariant;
- bắt đầu lưu raw audio;
- đổi retention/classification PII;
- đổi runtime từ Node sang runtime khác cho BFF path;
- bật real inventory/payment/delivery.

### 24.3 Checklist cập nhật tài liệu

Mỗi thay đổi kiến trúc phải cập nhật đồng thời:

1. ADR;
2. docs/architecture.md;
3. docs/data-model.md nếu đổi storage/ownership;
4. docs/security-and-privacy.md nếu đổi trust/data flow;
5. docs/deployment.md và operations runbook nếu đổi runtime/failure;
6. specs/api-contracts.md và contract tests nếu đổi payload;
7. current-vs-target và release manifest nếu capability status đổi.

## 25. Traceability từ yêu cầu đến component

| Yêu cầu | Component chính | Control/test |
|---|---|---|
| Transcript realtime tiếng Việt | LiveKit worker + valsea_stt.py | Provider fixtures + credentialed smoke |
| Partial không điền phiếu | contracts + session reducer | Unit/component tests |
| Field evidence | packages/core + booking form | Core tests |
| Human mặc định | booking_policy.py + staff preferences | Python policy tests + UI tests |
| Auto có kiểm soát | worker LLM + BOOKING_INSTRUCTIONS | Policy/failure tests |
| Staff-approved speech | staff.speak + VALSEA TTS | Worker command test + smoke |
| Confirmation gate | packages/core | Core/UI tests |
| Durable confirmation | Target booking application/repository | Transaction/idempotency tests |
| Không lộ secret | BFF/worker env ownership | Secret scan + deployment review |
| Không lưu audio | worker record=false | Config review + runtime evidence |
| Safe no-key demo | DemoCallChannel + text/preset | Component/E2E |

## 26. Thuật ngữ

| Thuật ngữ | Nghĩa |
|---|---|
| Session code | Mã 4–12 ký tự ghép UI/room; current không phải credential |
| Room | LiveKit realtime scope của một session |
| Partial transcript | Nội dung tạm thời để hiển thị, không evidence |
| Final transcript | Provider/user đã chốt một lượt nói |
| Evidence | Nguồn, quote, confidence và message ID hỗ trợ field |
| Booking draft | Trạng thái mutable trước confirmation |
| Booking snapshot | Bản serialize draft tại một revision |
| Confirmation | Action có actor chấp nhận summary; current client-side, target transactional |
| Human mode | Agent không tự sinh lời nói |
| Auto mode | Agent được staff cho phép sinh reply, không được confirm booking |
| Credentialed smoke | Test dùng credential thật trong environment xác định, có redacted evidence |
| Durable | State tồn tại qua process restart và multi-instance bằng database |

## 27. Kết luận

Kiến trúc hiện tại đã có boundary tốt cho demo và pilot: UI tách worker media, contract/core tách provider, partial/final rõ, Human mặc định, evidence theo field, LiveKit/VALSEA seam và Neon event persistence. Rủi ro lớn không nằm ở giao diện mà ở **authority và durability**: client vẫn quyết định booking, session API chưa auth, confirmation chưa transaction/idempotency chuẩn, Python contract chưa full-validated và live provider chưa có evidence.

Đường nâng cấp được giữ cố ý ngắn: không cần full microservices. Ưu tiên đưa booking command về server-authoritative application service, hoàn thiện identity/authorization/confirmation transaction, sau đó mới bật credentialed pilot và mở rộng inventory/payment.
