# VéĐi Adoption Guide

## Tóm tắt

Guide này giúp nhà xe chuyển từ demo dữ liệu mẫu sang pilot có kiểm soát. Mục tiêu không phải bật mọi integration cùng lúc; mục tiêu là chốt use case, owner, data boundary, KPI, fallback và go/no-go trước cuộc gọi thật đầu tiên.

Điểm xuất phát được khuyến nghị:

- một nhóm tuyến giới hạn;
- nhân viên đã đào tạo, Human mặc định;
- dữ liệu tổng hợp hoặc cuộc gọi có consent;
- credentialed smoke tách khỏi production traffic;
- daily review với khả năng dừng pilot ngay.

## Phù hợp với ai

**Phù hợp:** nhà xe có đội CSKH/điều phối, quy trình đặt vé qua điện thoại, catalog đủ ổn định và owner cho dữ liệu/security.

**Chưa phù hợp:** tổ chức muốn Agent tự xác nhận, cần payment/PSTN/external inventory ngay, không có consent/retention owner, hoặc không thể bố trí Human fallback trong pilot.

## Trạng thái có thể triển khai

| Profile | Có thể dùng | Điều kiện |
|---|---|---|
| Demo local/public | Có | Dữ liệu mẫu, hai tab cùng browser, không PII thật |
| Credentialed technical smoke | Sau setup | LiveKit/VALSEA/Neon credentials, approved environment, synthetic sample và evidence capture |
| Limited pilot | Sau P1 gates | Identity, consent, retention, transaction safety, monitoring, training và rollback được duyệt |
| Production operations | Chưa | P2/P3 capabilities, SLO, DR, load/security review và customer acceptance |

Xem [Capabilities and Evidence](capabilities-and-evidence.md) để biết status từng feature.

## Vai trò và trách nhiệm

| Vai trò | Hành động được phép | Trách nhiệm khách hàng | Trách nhiệm product/team | Escalation path |
|---|---|---|---|---|
| Passenger | Cung cấp/sửa facts, nghe summary, xác nhận rõ ràng | Consent và cung cấp dữ liệu đúng | Hiển thị fallback, bảo vệ session boundary | Customer-care staff |
| Customer-care staff | Nhận phiên được giao, trả lời, sửa/lock, delegate/takeover, xác nhận theo quyền | Tuân thủ script, không nhập dữ liệu ngoài scope, báo lỗi | UI, evidence, safe state, training material | Dispatcher/supervisor |
| Dispatcher/supervisor | Phân công, giám sát, dừng Agent/pilot, review audit | Bảo đảm roster, queue owner, go/no-go ca | Dashboard/alert roadmap, incident support | Product owner + incident lead |
| Bus-operator admin | Duyệt catalog/version, staff roles, lịch/giá | Chính xác dữ liệu và publish approval | Validation/version/publish workflow | Operations owner |
| Product support | Triage usage, hướng dẫn fallback, thu correlation ID | Cung cấp mô tả đã redacted | Runbook, SLA pilot, defect routing | Engineering owner |
| Security/data owner | Duyệt consent, access, retention, deletion, incident notification | Quyết định lawful basis, retention và recipients | Triển khai controls/evidence theo quyết định | Security incident lead |
| Engineering/provider owner | Deploy, monitor, rotate secrets, recover service | Cấp provider account/contract khi thuộc customer | Integration, smoke, rollback, vendor escalation | Technical lead + provider support |

Không giao một người vừa tự duyệt data policy, tự deploy và tự xác nhận go-live nếu có thể tách nhiệm vụ.

## Quy trình hiện tại và quy trình với VéĐi

| Bước | Hiện tại | Với VéĐi pilot | Human control |
|---|---|---|---|
| Tiếp nhận | Nhân viên nghe và ghi chú | Session vào scope đã phê duyệt | Staff nhận/giữ ownership |
| Thu thập dữ kiện | Hỏi và nhập thủ công | Final transcript tự điền kèm evidence | Staff review, sửa và lock |
| Hỏi phần thiếu | Dựa kinh nghiệm | Suggestion từ deterministic workflow | Human nói hoặc delegate Agent |
| Đề xuất chuyến | Tra cứu catalog | Chỉ dùng catalog version đã publish | Staff kiểm giá/chuyến/ghế |
| Xác nhận | Đọc lại và nhập hệ thống | Summary + explicit confirmation gate | Staff/passenger có authority; Agent không có |
| Failure | Gọi lại/chuyển kênh | Human/text fallback, giữ safe state | Supervisor quyết định tiếp tục/dừng |
| Review | Tổng hợp thủ công | KPI + sampled evidence + incident log | Daily review trong pilot |

## Chuẩn bị pilot

Không go-live nếu thiếu bất kỳ owner hoặc quyết định bắt buộc nào:

| Hạng mục | Cần chốt | Owner/approval evidence |
|---|---|---|
| Use case và tuyến | Route, giờ, loại khách, excluded call | Product owner + operations |
| Sample calls | Synthetic hoặc consented; accent/noise mix | Data owner |
| Provider runtime | LiveKit, VALSEA, Neon và LLM credentials trong approved secret store | Engineering/provider owner |
| Staff identity | Authentication, role, session assignment và confirmation authorization | Security + operations |
| Consent copy | Vietnamese notice, purpose, processor, recording off, text alternative | Legal/data owner |
| Retention | Final transcript/evidence period, backup expiry, deletion owner | Data owner |
| Catalog version | Tuyến/chuyến/giá/điểm đón-trả đã kiểm và publish | Bus-operator admin |
| Staff roster | Ca trực, trained users, supervisor và replacement | Operations |
| KPI | Baseline, target, sample size, exclusion và go/no-go threshold | Product + customer owner |
| Fallback | Human/text procedure, queue owner, customer communication | Dispatcher |
| Incident | P1 contact tree, notification time, provider escalation | Incident lead |
| Release | Source SHA, deployment IDs, smoke evidence, rollback approval | Technical lead + customer approver |

Credential không gửi qua email/chat hoặc lưu trong repo. Mỗi runtime chỉ nhận secret cần thiết; browser không nhận service secret.

## Onboarding theo tuần

| Tuần | Kết quả | Hoạt động chính | Exit evidence |
|---|---|---|---|
| **Week 0** | Discovery, data/privacy review, KPI agreement | Chốt scope, workflow, sample, baseline, consent/retention owner | Signed scope + KPI/data decision log |
| **Week 1** | Environment, credentials, sample catalog, staff roles | Tạo env, secret ownership, role map, version catalog | Config review + access list + catalog approval |
| **Week 2** | Credentialed technical smoke và fallback validation | Two-device, VALSEA, Neon, reconnect, provider failure, duplicate confirm | Redacted smoke report + rollback result |
| **Week 3** | Staff training và shadow-mode calls | Human-first rehearsal, evidence review, takeover, incident drill | Training completion + scored scenarios |
| **Week 4** | Limited pilot, daily review, go/no-go | Traffic cap, daily KPI/defect review, change freeze | Pilot report + go/hold/rollback decision |

Lịch phụ thuộc P1 gaps, provider account readiness, customer security review và catalog quality. Không rút ngắn bằng cách bỏ consent, identity hoặc rollback gate.

## Quy trình hằng ngày

### Mở ca

1. Supervisor kiểm health/readiness, runtime profile và on-call contacts.
2. Staff đăng nhập bằng identity riêng; xác nhận assignment scope.
3. Kiểm catalog version/effective date và fallback channel.
4. Chạy synthetic smoke: transcript → evidence → Human takeover; không tạo dữ liệu khách thật.

### Trong ca

1. Staff nhận phiên, xác minh consent state.
2. Giữ Human khi confidence thấp, identity mơ hồ hoặc provider degraded.
3. Review evidence cho critical fields; sửa/lock với audit reason.
4. Đọc lại summary; không cho Agent tự xác nhận.
5. Gắn correlation ID khi escalation; không copy transcript/phone đầy đủ vào ticket.

### Cuối ca

1. Reconcile session state, booking outcome và unresolved incidents.
2. Review sampled calls theo KPI; redacted export only.
3. Kiểm retention/deletion queue và secret/access anomaly.
4. Supervisor ghi go/hold cho ca sau.

## Human, Auto và takeover

| Mode/action | Khi dùng | Quyền | Trigger quay về Human |
|---|---|---|---|
| Human | Mặc định; training; degraded; sensitive case | Staff nói/sửa/xác nhận | Không áp dụng |
| Auto | Session đã nhận, consent hợp lệ, integrations ready | Agent hỏi/trả lời theo policy; không xác nhận | Low confidence, repeated question, provider error, passenger request, staff judgment |
| Takeover | Bất kỳ lúc nào | Thu hồi Agent reply authority; giữ transcript/draft | Staff kiểm xong mới re-delegate |

Takeover phải nhanh, có owner/reason và không làm mất state. Nếu UI chưa chứng minh authorization/audit, pilot giữ Human-only.

## Chuẩn bị catalog và dữ liệu

- Chỉ import route/trip/fare/pickup/dropoff đã có owner và effective date.
- Dùng `draft → validated → published`; published version bất biến cho booking đã dùng.
- CSV phải dry-run, báo lỗi từng dòng và không ghi trực tiếp production version.
- Demo static seats không phải real inventory hoặc external seat guarantee.
- P2 seat hold cần per-trip state, expiry/release/consume và conflict test trước claim live.
- Dữ liệu training/test phải synthetic hoặc consented, có source và expiry.

## Đào tạo

| Module | Học viên | Pass criteria |
|---|---|---|
| Product truth và status labels | Tất cả | Phân biệt local, Code-ready và provider live |
| Receive/Human/Auto/takeover | Staff, supervisor | Thực hiện đúng 3 scenario, không mất state |
| Evidence và confirmation | Staff | Review critical fields, phát hiện mismatch, không cho Agent confirm |
| Fallback | Staff, support | Chuyển text/Human trong thời gian đã chốt |
| Privacy và redaction | Tất cả | Không đưa PII/secrets vào log/ticket |
| Incident/rollback | Supervisor, engineering | Hoàn thành tabletop + recovery evidence |

Training dùng synthetic sessions. Chỉ người pass scenario và có active role mới tham gia limited pilot.

## KPI và review pilot

KPI chuẩn: Critical Field Accuracy, Booking Completion Rate, Average Handle Time, Agent Assist Rate, Takeover Rate, First Final Latency và Cost per Completed Booking. Công thức nằm trong [Product Brief](product-brief.md).

Daily review phải tách:

- denominator và excluded calls;
- Human-only so với Agent-delegated sessions;
- provider/fallback profile;
- field-level error severity;
- latency percentile, không chỉ average;
- incident, privacy và duplicate-confirmation count.

Không công bố improvement nếu baseline/sample không cùng scope. Go/no-go ưu tiên safety threshold trước tốc độ hoặc cost.

## Support và escalation

| Severity | Ví dụ | Hành động tức thì | Owner |
|---|---|---|---|
| SEV-1 | PII/secret exposure, unauthorized confirmation, duplicate booking | Dừng pilot/route, revoke credential, giữ redacted evidence, notify theo plan | Security/incident lead |
| SEV-2 | LiveKit/VALSEA/Neon outage, nhiều session degraded | Chuyển Human/text, cap traffic, provider escalation | Engineering + supervisor |
| SEV-3 | Một session lỗi, field quality issue | Takeover, hoàn tất thủ công, mở defect có correlation ID | Staff + product support |
| SEV-4 | Copy/UI/documentation issue | Workaround, backlog | Product owner |

Ticket chỉ chứa session/correlation reference đã redacted. Recovery cần signal quan sát được và smoke trước mở lại traffic.

## Go-live checklist

- [ ] Scope, route và traffic cap được duyệt.
- [ ] Staff authentication, role và session owner hoạt động.
- [ ] Signed caller/session boundary và rate limit được test.
- [ ] Consent copy, recording policy và text alternative hiển thị.
- [ ] Retention period, deletion owner và backup expiry được chốt.
- [ ] LiveKit/VALSEA/Neon credentialed positive + negative smoke pass.
- [ ] Catalog version được admin publish; static demo data không lẫn pilot.
- [ ] Confirmation authorization/idempotency transaction pass conflict/retry tests.
- [ ] Monitoring, correlation, on-call và provider contact sẵn sàng.
- [ ] Staff training/fallback drill hoàn tất.
- [ ] Release manifest ghi SHA/deployments/runtime profile.
- [ ] Rollback được exercise và customer approver ký go.

Thiếu gate: chọn **hold** hoặc **Human-only/shadow mode**, không tự đánh dấu pass.

## Giới hạn hiện tại

- Public demo dùng session code và local fallback; không dùng PII thật.
- LiveKit/VALSEA/Neon vẫn Code-ready đến khi có credentialed evidence.
- Queue/assignment, role-complete enterprise dashboard, catalog publish và seat hold thuộc roadmap.
- Durable confirmation transaction, retention automation và full observability là blocker trước real passenger pilot.
- Payment, external inventory guarantee, PSTN/SIP, Zalo raw-call audio, SMS delivery và autonomous confirmation ngoài phạm vi hiện tại.

Đọc tiếp: [Business Case and Roadmap](business-case-and-roadmap.md), [Trust and Operations](trust-and-operations.md), [Deployment Guide](deployment.md).
