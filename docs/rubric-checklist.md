# Bản đồ tiêu chí và bằng chứng VALSEA — Alove

Alove là voice agent tiếng Việt cho nghiệp vụ nhà xe: khách nói nhu cầu tự nhiên,
AI hiểu hội thoại và điều phối công cụ, còn API/Neon quyết định lịch, giá, ghế và
mã vé. Đây là bản đồ **36 tiêu chí → kết quả → nguồn kiểm chứng**, giúp giám khảo
đi thẳng từ claim đến bằng chứng chạy thật.

## Tóm tắt dành cho giám khảo

- **Sản phẩm đã triển khai:** web production, LiveKit agent, API đặt vé và Neon
  đều hoạt động; health check ghi nhận bốn dependency `ready`.
- **Workflow tạo giá trị thật:** luồng search → hold → confirm → verify → cancel
  đã chạy trên production, bao gồm kiểm tra sai số điện thoại và hoàn ghế.
- **VALSEA tạo khác biệt đo được:** trên cùng ba audio ca khó, WER của VALSEA tốt
  hơn baseline Whisper: tonal `0.1579 vs 0.3158`, code-switch `0.04 vs 0.28`,
  noisy telephone 8 kHz `0.1364 vs 0.1818`.
- **AI-native nhưng không giao fact cho LLM:** model điều phối hội thoại và tool;
  pricing, inventory, lifecycle và verification nằm trong API/DB deterministic.
- **Sẵn đường ra pilot:** roadmap 90 ngày, release/rollback, SIP runbook và
  scorecard go/no-go đã được tài liệu hoá.

Mốc kiểm tra production gần nhất là `2026-07-18T20:02:52Z`; probe VALSEA là
`2026-07-18T15:17:31.294Z`; benchmark hard-case được tạo lúc
`2026-07-18T16:56:59.872Z`.

## Cách đọc mức bằng chứng

- ✅ **T1 · Production verified:** URL/API hoặc thao tác production đã được kiểm
  tra trực tiếp và có log kiểm chứng.
- 🔵 **T2 · Measured:** artifact từ provider hoặc benchmark đã chạy thật, có input,
  output và metric truy vết được.
- 🟣 **T3 · Implemented:** code, test, contract hoặc tài liệu vận hành đã được
  review. T3 là bằng chứng triển khai, không phải ý tưởng trong backlog.
- ⬜ **T0 · Next validation:** bước cần thêm bằng chứng thực địa; không làm giảm
  giá trị của phần đã chứng minh ở T1–T3.

Mỗi dòng dưới đây có ít nhất một nguồn trong repository theo dạng `file:line`.
URL ngoài repo chỉ bổ sung, không thay thế trace này.

Production gate và smoke test được ghi tại
`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-verification.md` và
`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-73`.

## Deliverables

| Tiêu chí | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|
| Demoable prototype (live URL hoặc video) | ✅ T1 | 2026-07-18T20:02:52Z | Final Vercel deployment `dpl_B2KnVagS7EMdcyJccEw47sn4179W` READY; toàn bộ public surface gồm `/verify` trả 200 và health có bốn dependency `ready` tại `plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-24`. |
| Public GitHub repo | ✅ T1 | 2026-07-18T18:37:07Z | Repository trả 200 và được đánh dấu Public tại `plans/2026-07-18-valsea-rubric-gap/reports/phase-06-public-surface-check.md:8-14`; repo canonical tại `README.md:10`. |
| Explainable AI architecture | 🟣 T3 | 2026-07-19 | Luồng LiveKit → agent → authenticated API → Neon, trust boundaries và quyền sở hữu fact được mô tả rõ tại `docs/architecture.md:5-24`, `docs/architecture.md:78-90`. |
| Pilot roadmap 1–2 trang | 🟣 T3 | 2026-07-19 | Roadmap Alove tại `docs/pilot-roadmap.md` có scope pilot, gate 30/60/90 ngày, scorecard và điều kiện go/no-go. |

## Rubric chung

| Tiêu chí | Trọng số | Status | Timestamp | Bằng chứng và nguồn |
|---|---:|---|---|---|
| Problem Relevance | 20% | 🟣 T3 | 2026-07-19 | Alove giải quyết một workflow cụ thể có giá trị giao dịch: ba nhóm người dùng, nghiệp vụ nhà xe và booking outcome được định nghĩa tại `specs/product-vision.md:5-14`. |
| AI-Native Architecture | 20% | 🟣 T3 | 2026-07-19 | LLM hiểu hội thoại và chọn tool; API/Neon sở hữu giá, lịch, ghế và mã vé, giúp AI linh hoạt mà fact vẫn deterministic (`docs/architecture.md:45-54`, `specs/product-vision.md:18-23`). |
| Technical Execution | 15% | ✅ T1 / 🟣 T3 | 2026-07-18T20:02:52Z | Agent production joined, hiển thị lời chào tiếng Việt và ghi TTFT `2372 ms`, TTFB `176 ms` mà không có provider error. Phép smoke dùng audio giả lập; full-turn audio khách thật là bước validation tiếp theo (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Deployment | 15% | ✅ T1 | 2026-07-18T20:02:52Z | Main `841e269`, Vercel READY, public surfaces 200, four health services ready and LiveKit agent Running (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-35`). |
| Feasibility | 15% | ✅ T1 / 🟣 T3 | 2026-07-18T20:02:52Z | Production booking đã hoàn tất toàn bộ lifecycle search/hold/confirm/verify/cancel và release ghế. SIP/PSTN được tách thành gate pilot để không phụ thuộc vào demo web (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:39-52`). |
| Startup Potential | 15% | 🟣 T3 | 2026-07-19 | Nhà xe là beachhead đủ hẹp để pilot; lợi thế dữ liệu hội thoại là giả thuyết sẽ được kiểm chứng bằng scorecard và gate 30/60/90 ngày (`specs/product-vision.md:8-14`, `docs/pilot-roadmap.md:42-109`). |

## Tiêu chí riêng VALSEA

| Tiêu chí | Trọng số | Status | Timestamp | Bằng chứng và nguồn |
|---|---:|---|---|---|
| Best Use of VALSEA API | 15% | 🔵 T2 / 🟣 T3 | 2026-07-18T15:17:31.294Z | Realtime STT là đường nhận dạng của agent. Provider probe còn xác nhận batch và annotation; batch dành cho upload workflow tương lai, còn annotation là signal advisory bất đồng bộ có contract và integration test (`plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md:15-25,38-43`, `agent/tests/test_valsea_api.py:202-401`, `docs/architecture.md:45-54`). |
| Workflow-Readiness | 15% | ✅ T1 / 🟣 T3 | 2026-07-18T20:02:52Z | Production verify đúng số trả snapshot tối thiểu PII; sai số hoặc vé đã huỷ trả 404. Lifecycle đã khép kín; QR vật lý và receiver thật là validation tích hợp tiếp theo (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:39-52`). |

## Success outcomes

| Outcome | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|
| Cắt thời gian ghi chép thủ công từ giờ xuống phút | 🟣 T3 | 2026-07-19 | Hệ thống tự ghi EOU/STT/LLM/TTS theo từng lượt và chỉ ra chặng chậm nhất; aggregator cùng edge cases có test tại `agent/tests/test_latency_metrics.py:18-171` và `apps/web/src/components/bus-call/bus-call-workspace.test.tsx:278-303`. Baseline vận hành thật sẽ được đo trong pilot. |
| Xử lý đúng ít nhất một ca khó mà ASR generic làm hỏng | 🔵 T2 | 2026-07-18T16:56:59.872Z | Trên cùng audio, VALSEA giảm WER so với Whisper ở cả ba nhóm: tonal `50%`, code-switch `85.7%`, noisy 8 kHz `25%` (tính từ metric gốc `0.1579/0.3158`, `0.04/0.28`, `0.1364/0.1818`). Benchmark dùng synthetic có kiểm soát, không suy rộng thành claim accent vùng miền (`plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:38,163,318,473,660,800`). |
| Đầu ra cấu trúc doanh nghiệp dùng được ngay | ✅ T1 / 🟣 T3 | 2026-07-18T20:02:52Z | Production confirm tạo booking và verification snapshot PII-minimal dùng ngay; webhook có contract fail-closed và chờ receiver pilot (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:39-52`). |

## Ngôn ngữ và bối cảnh địa phương

| Yêu cầu | Mức | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|---|
| Tiếng Việt nói và thân mật | Mandatory | ✅ T1 / 🔵 T2 / 🟣 T3 | 2026-07-18T20:02:52Z | Agent production joined và hiển thị lời chào tiếng Việt; prompt hội thoại hỗ trợ xưng hô tự nhiên. Smoke production dùng audio giả lập, còn full-turn khách thật nằm trong pilot (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Giữ đúng dấu thanh | Mandatory | 🔵 T2 | 2026-07-18T16:56:59.872Z | Benchmark tonal có tone retention `0.8125`, kèm provenance và case ID tại `plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:9-17,145`. |
| Không rớt/méo từ tiếng Anh xen câu | Mandatory | 🔵 T2 | 2026-07-18T16:56:59.872Z | Dense code-switch đạt WER `0.04` và English retention `1.0`; benchmark synthetic giúp kiểm soát input công bằng (`plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:318,450`). |
| Tiếng Anh cho thuật ngữ | Preferred | 🔵 T2 | 2026-07-18T16:56:59.872Z | So sánh trên cùng input với Whisper baseline `language=vi`; provenance và điều kiện công bằng tại `plans/2026-07-18-valsea-rubric-gap/phase-03-hard-case-evidence.md:19-25,44-49`. |
| Đa ngôn ngữ đồng thời | Mandatory | 🔵 T2 | 2026-07-18T15:17:31.294Z | Realtime auto-detect đã `ready` và code-switch được đo; provider không nhận language-array, nên integration chủ động dùng auto-detect thay vì gửi contract sai (`plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md:23-25,38-43`). |
| Văn hoá và lễ phép Việt | Required | 🟣 T3 | 2026-07-19 | Prompt xưng “em”, gọi “anh chị” và bắt buộc xác nhận trước khi chốt tại `agent/agent.py:172-185`; manual conversation review là gate pilot. |
| Định dạng dữ liệu Việt | Required | 🟣 T3 | 2026-07-19 | Schema chuẩn hoá số điện thoại VN, giờ `HH:MM`, VND integer và fare invariant tại `apps/web/src/lib/call-contract.ts:3-63`. |
| Gọi endpoint ASR của VALSEA | Mandatory | ✅ T1 | 2026-07-18T15:17:31.294Z | Probe provider thật: batch 200 và realtime auto/vi ready tại `plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md:17-25`; credential đã redacted tại `:3-6`. |
| Gần thời gian thực | No hard SLA | ✅ T1 / 🟣 T3 | 2026-07-18T20:02:52Z | Production agent ghi TTFT `2372 ms`, TTFB `176 ms`; UI và aggregator đã sẵn để capture full-turn trong pilot (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |

## Anti-patterns

Status trong bảng này trả lời “Alove đã tránh anti-pattern bằng cơ chế nào”; mức
T1–T3 cho biết độ sâu của bằng chứng, không trộn code đã triển khai với backlog.

| Anti-pattern | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|
| Chỉ chạy với dữ liệu sạch/lý tưởng | 🔵 T2 | 2026-07-18T16:56:59.872Z | Benchmark bao gồm noisy telephone 8 kHz và dense code-switch tại `apps/web/public/evidence/fixtures/manifest.json:28-76`; accent vùng miền thật được giữ làm field-validation có consent. |
| Đòi người dùng có kỹ năng kỹ thuật cao | ✅ T1 / 🟣 T3 | 2026-07-18T20:02:52Z | Luồng vào bằng browser không yêu cầu cài đặt; production chứng minh session mở, agent joined và greeting hiển thị. Smoke dùng audio giả lập, vì vậy spoken full-turn với khách thật vẫn là gate pilot (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Phụ thuộc hoàn toàn API ngoại bất ổn/đắt | 🟣 T3 | 2026-07-19 | Booking core và fact vận hành nằm trong API/Neon riêng; agent có lựa chọn A/B provider chủ động. Voice provider là adapter có boundary rõ (`adrs/0009-valsea-stt-google-chirp3-tts.md:13-32`, `docs/architecture.md:47-54`). |
| Demo là mockup/slideshow không có AI thật | ✅ T1 / 🔵 T2 | 2026-07-18T20:02:52Z | LiveKit agent production joined, greeting tiếng Việt rendered và runtime/provider metrics được ghi nhận; đây là hệ thống chạy thật, không phải màn hình giả (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Không có kế hoạch triển khai thực tế | 🟣 T3 | 2026-07-19 | Release/rollback, SIP runbook và roadmap pilot 90 ngày đều sẵn tại `docs/deployment.md`, `docs/pstn-sip-runbook.md`, `docs/pilot-roadmap.md`. |
| Bỏ qua ngôn ngữ/bối cảnh địa phương | 🔵 T2 / 🟣 T3 | 2026-07-19 | Prompt Việt, schema dữ liệu Việt và hard-case metrics cùng tạo local fit; regional accent thật là bước mở rộng dataset có consent (`agent/agent.py:172-185`, `apps/web/src/lib/call-contract.ts:3-63`). |
| Dùng VALSEA như lớp bọc mỏng quanh chatbot | ✅ T1 / 🟣 T3 | 2026-07-19 | VALSEA xử lý speech signal; agent điều phối tool; API/Neon thực hiện search/hold/confirm atomic. Production API booking đã chạy, chứng minh workflow vượt khỏi chatbot (`docs/architecture.md:47-54,92-103`). |

## Bậc chất lượng

| Chiều | Đánh giá hiện tại | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|---|
| Xử lý ngôn ngữ | Good, có benchmark định lượng | 🔵 T2 | 2026-07-18T16:56:59.872Z | Ba fixture tonal/code-switch/noisy đều thắng baseline tại `plans/2026-07-18-valsea-rubric-gap/phase-03-hard-case-evidence.md:17-25`; accent thật là field validation tiếp theo. |
| Độ chính xác AI | Vượt baseline trên 3/3 ca khó | 🔵 T2 | 2026-07-18T16:56:59.872Z | Artifact complete có WER, diff, tone retention và English retention tại `plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:1-6,38-145,318-450,660-782`. |
| Triển khai | Main/web/agent/schema live | ✅ T1 | 2026-07-18T20:02:52Z | Vercel READY, LiveKit Running, public pages 200, four health dependencies ready và database integrity checks đạt (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-52`). |
| Bối cảnh địa phương | Good, thiết kế sâu theo vertical | 🔵 T2 / 🟣 T3 | 2026-07-19 | Nghiệp vụ nhà xe, prompt Việt và phone/time/VND format có bằng chứng tại `specs/product-vision.md:5-14`, `apps/web/src/lib/call-contract.ts:3-63`; accent và SIP thật thuộc pilot. |
| Khả năng mở rộng | Kiến trúc sẵn sàng cho pilot | 🟣 T3 | 2026-07-19 | Boundary agent/API/Neon tách lớp tại `docs/architecture.md:5-24`; multi-tenant chỉ được mở sau khi một operator đạt scorecard tại `specs/product-vision.md:38-44`. |

## Năm bước xác minh tiếp theo

Các mục sau là field validation để nâng độ sâu bằng chứng, không phải tính năng
được ngầm đánh dấu hoàn thành:

- Regional accent: chỉ có synthetic/no-PII; cần fixture thật có consent
  (`plans/2026-07-18-valsea-rubric-gap/phase-03-hard-case-evidence.md:49-54`).
- QR: cần scan bằng điện thoại trên deployment, thử đúng/sai phone và không ghi PII
  (`docs/deployment.md:76-79`).
- Webhook: cần receiver thật xác minh signature/idempotency và delivery; code/test
  không thay thế bằng chứng này (`specs/api-contracts.md:77-112`).
- Semantic annotation và latency: cần capture event/UI trong một cuộc gọi thật
  (`docs/architecture.md:109-123`).
- PSTN: runbook ghi rõ chưa có cuộc gọi thật (`docs/pstn-sip-runbook.md:3-12`).
