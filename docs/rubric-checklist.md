# Checklist rubric VALSEA — Alove

Audit này tách trạng thái sản phẩm khỏi ý định trong các plan lịch sử. Mốc kiểm
tra production gần nhất là `2026-07-18T20:02:52Z`; mốc probe VALSEA là
`2026-07-18T15:17:31.294Z`; artifact hard-case được tạo lúc
`2026-07-18T16:56:59.872Z`.

## Quy ước bằng chứng

- ✅ **Live/manual (T1):** URL/API/public repo đã được kiểm tra trực tiếp hoặc thao
  tác tay đã được ghi nhận.
- 🟡 **Có bằng chứng, chưa live E2E (T2/T3):** T2 là provider artifact đã chạy
  thật; T3 là code/contract/tài liệu đã review. Một dòng có thể kết hợp T1 với T3
  khi một phần chạy production nhưng vẫn còn bước thủ công chưa được chứng minh.
- ⬜ **Mở/blocked (T0):** chưa có bằng chứng cần thiết. Không suy diễn từ code, mock
  hay tài liệu dự định.

Mỗi dòng dưới đây có ít nhất một nguồn trong repository theo dạng `file:line`.
URL ngoài repo chỉ bổ sung, không thay thế trace này.

Gate cuối và production smoke được ghi tại
`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-verification.md` và
`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-73`.

## Deliverables

| Tiêu chí | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|
| Demoable prototype (live URL hoặc video) | ✅ T1 | 2026-07-18T20:02:52Z | Final Vercel deployment `dpl_B2KnVagS7EMdcyJccEw47sn4179W` READY; toàn bộ public surface gồm `/verify` trả 200 và health có bốn dependency `ready` tại `plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-24`. |
| Public GitHub repo | ✅ T1 | 2026-07-18T18:37:07Z | Repository trả 200 và được đánh dấu Public tại `plans/2026-07-18-valsea-rubric-gap/reports/phase-06-public-surface-check.md:8-14`; repo canonical tại `README.md:10`. |
| Explainable AI architecture | 🟡 T3 | 2026-07-19 | Luồng LiveKit → agent → authenticated API → Neon và trust boundaries được mô tả tại `docs/architecture.md:5-24`, `docs/architecture.md:78-90`; chưa có review thủ công của giám khảo. |
| Pilot roadmap 1–2 trang | 🟡 T3 | 2026-07-19 | Roadmap evergreen mới của Alove tại `docs/pilot-roadmap.md`; tài liệu ghi rõ không khôi phục roadmap OrderVoice cũ, có scope, 90-day gates, scorecard và go/no-go. |

## Rubric chung

| Tiêu chí | Trọng số | Status | Timestamp | Bằng chứng và nguồn |
|---|---:|---|---|---|
| Problem Relevance | 20% | 🟡 T3 | 2026-07-19 | Vertical nhà xe, ba nhóm người dùng và outcome booking thật được ghi tại `specs/product-vision.md:5-14`; chưa có xác nhận chấm live. |
| AI-Native Architecture | 20% | 🟡 T3 | 2026-07-19 | LLM chọn tool nhưng API/Neon sở hữu giá, lịch, ghế, mã vé tại `docs/architecture.md:45-54`, `specs/product-vision.md:18-23`. |
| Technical Execution | 15% | ✅ T1 / 🟡 T3 | 2026-07-18T20:02:52Z | Agent production joined, rendered a Vietnamese greeting and reported TTFT 2372 ms/TTFB 176 ms without provider errors; fake mic means customer STT/full-turn evidence remains open (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Deployment | 15% | ✅ T1 | 2026-07-18T20:02:52Z | Main `841e269`, Vercel READY, public surfaces 200, four health services ready and LiveKit agent Running (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-35`). |
| Feasibility | 15% | ✅ T1 / 🟡 T3 | 2026-07-18T20:02:52Z | Controlled production booking completed search/hold/confirm/verify/cancel and seat release; PSTN remains untested (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:39-52`). |
| Startup Potential | 15% | 🟡 T3 | 2026-07-19 | Nhu cầu và scope nhà xe rõ tại `specs/product-vision.md:8-14`, `specs/product-vision.md:38-44`; chưa có commercial pilot hoặc bằng chứng mở rộng vertical. |

## Tiêu chí riêng VALSEA

| Tiêu chí | Trọng số | Status | Timestamp | Bằng chứng và nguồn |
|---|---:|---|---|---|
| Best Use of VALSEA API | 15% | 🟡 T2/T3 | 2026-07-18T15:17:31.294Z | Probe thật xác nhận batch transcription, annotation và realtime tại `plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md:15-25`; annotation contract/integration test tại `agent/tests/test_valsea_api.py:202-306`, `:320-401`. Semantic UI event trên live call vẫn mở. |
| Workflow-Readiness | 15% | ✅ T1 / 🟡 T3 | 2026-07-18T20:02:52Z | Production correct-phone verify trả 200 PII-minimal, wrong-phone/post-cancel trả 404 và booking được hủy; physical QR scan và receiver delivery vẫn mở (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:39-52`). |

## Success outcomes

| Outcome | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|
| Cắt thời gian ghi chép thủ công từ giờ xuống phút | 🟡 T3 | 2026-07-19 | Aggregator/edge cases tại `agent/tests/test_latency_metrics.py:18-171`; UI test từng stage và chặng lâu nhất tại `apps/web/src/components/bus-call/bus-call-workspace.test.tsx:278-303`. Chưa có baseline làm tay hay capture cuộc gọi thật. |
| Xử lý đúng ít nhất một ca khó mà ASR generic làm hỏng | 🟡 T2 | 2026-07-18T16:56:59.872Z | Cùng synthetic audio: tonal WER 0.1579 vs 0.3158, code-switch 0.04 vs 0.28, noisy 8 kHz 0.1364 vs 0.1818; metric tại `plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:38`, `:163`, `:318`, `:473`, `:660`, `:800`. Không coi synthetic là bằng chứng accent vùng miền. |
| Đầu ra cấu trúc doanh nghiệp dùng được ngay | ✅ T1 / 🟡 T3 | 2026-07-18T20:02:52Z | Production confirm và minimal verification snapshot đã chạy; webhook disabled đúng contract, chưa có receiver thật (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:39-52`). |

## Ngôn ngữ và bối cảnh địa phương

| Yêu cầu | Mức | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|---|
| Tiếng Việt nói và thân mật | Mandatory | ✅ T1 / 🟡 T2/T3 | 2026-07-18T20:02:52Z | Agent production joined and rendered a Vietnamese greeting; fake mic means customer Vietnamese STT/conversation remains open (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Giữ đúng dấu thanh | Mandatory | 🟡 T2 | 2026-07-18T16:56:59.872Z | Case tonal synthetic có VALSEA tone retention 0.8125 tại `plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:145`; provenance/case ID tại `:9-17`. |
| Không rớt/méo từ tiếng Anh xen câu | Mandatory | 🟡 T2 | 2026-07-18T16:56:59.872Z | Case dense code-switch đạt WER 0.04 và English retention 1.0 tại `plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:318`, `:450`; chỉ là synthetic. |
| Tiếng Anh cho thuật ngữ | Preferred | 🟡 T2 | 2026-07-18T16:56:59.872Z | Cùng case code-switch và baseline `language=vi`; provenance/điều kiện công bằng tại `plans/2026-07-18-valsea-rubric-gap/phase-03-hard-case-evidence.md:19-25`, `:44-49`. |
| Đa ngôn ngữ đồng thời | Mandatory | 🟡 T2 | 2026-07-18T15:17:31.294Z | Auto-detect realtime đã ready, nhưng language-array bị `INVALID_MESSAGE` tại `plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md:23-25`, `:38-43`; chỉ có code-switch synthetic, không claim array support. |
| Văn hoá và lễ phép Việt | Required | 🟡 T3 | 2026-07-19 | Prompt xưng “em”, gọi “anh chị”, xác nhận trước khi chốt tại `agent/agent.py:172-185`; chưa có manual conversation review. |
| Định dạng dữ liệu Việt | Required | 🟡 T3 | 2026-07-19 | Số điện thoại VN, giờ `HH:MM`, VND integer và fare invariant tại `apps/web/src/lib/call-contract.ts:3-63`. |
| Gọi endpoint ASR của VALSEA | Mandatory | ✅ T1 | 2026-07-18T15:17:31.294Z | Probe provider thật: batch 200 và realtime auto/vi ready tại `plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md:17-25`; credential đã redacted tại `:3-6`. |
| Gần thời gian thực | No hard SLA | ✅ T1 / 🟡 T3 | 2026-07-18T20:02:52Z | Production agent metrics ghi TTFT 2372 ms và TTFB 176 ms; customer-speech full-turn/UI capture chưa có (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |

## Anti-patterns

Status trong bảng này trả lời “đã tránh được chưa”; 🟡 nghĩa là có cơ chế nhưng
chưa đủ bằng chứng live để đánh ✅.

| Anti-pattern | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|
| Chỉ chạy với dữ liệu sạch/lý tưởng | 🟡 T2 | 2026-07-18T16:56:59.872Z | Có synthetic noisy telephone 8 kHz và code-switch tại `apps/web/public/evidence/fixtures/manifest.json:28-76`; regional accent vẫn mở tại `plans/2026-07-18-valsea-rubric-gap/phase-03-hard-case-evidence.md:44-54`. |
| Đòi người dùng có kỹ năng kỹ thuật cao | ✅ T1 / 🟡 T3 | 2026-07-18T20:02:52Z | Browser public session mở, agent joined và greeting hiển thị; fake mic nên chưa chứng minh một customer turn hoàn chỉnh (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Phụ thuộc hoàn toàn API ngoại bất ổn/đắt | 🟡 T3 | 2026-07-19 | Agent có lựa chọn A/B provider chủ động, không automatic failover; booking facts nằm trong Neon/API riêng tại `adrs/0009-valsea-stt-google-chirp3-tts.md:13-32`, `docs/architecture.md:47-54`. Voice AI vẫn cần external providers. |
| Demo là mockup/slideshow không có AI thật | ✅ T1 / 🟡 T2 | 2026-07-18T20:02:52Z | LiveKit agent production joined, greeting Vietnamese rendered, runtime route/provider metrics recorded; customer speech remains open (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:26-37`). |
| Không có kế hoạch triển khai thực tế | 🟡 T3 | 2026-07-19 | Release/rollback, SIP runbook và roadmap pilot 90 ngày tồn tại tại `docs/deployment.md`, `docs/pstn-sip-runbook.md` và `docs/pilot-roadmap.md`. |
| Bỏ qua ngôn ngữ/bối cảnh địa phương | 🟡 T2/T3 | 2026-07-19 | Prompt Việt và schema VN tại `agent/agent.py:172-185`, `apps/web/src/lib/call-contract.ts:3-63`; regional accent chưa được chứng minh. |
| Dùng VALSEA như lớp bọc mỏng quanh chatbot | 🟡 T3 | 2026-07-19 | Agent không sở hữu fact vận hành; search/hold/confirm đi qua API/Neon tại `docs/architecture.md:47-54`, lifecycle atomic tại `:92-103`. Đã có controlled production API booking; speech-driven booking capture vẫn mở. |

## Bậc chất lượng

| Chiều | Đánh giá hiện tại | Status | Timestamp | Bằng chứng và nguồn |
|---|---|---|---|---|
| Xử lý ngôn ngữ | Good trên synthetic; accent mở | 🟡 T2 | 2026-07-18T16:56:59.872Z | Ba fixture tonal/code-switch/noisy tại `plans/2026-07-18-valsea-rubric-gap/phase-03-hard-case-evidence.md:17-25`; giới hạn accent tại `:44-54`. |
| Độ chính xác AI | Đã đo, chưa claim Outstanding | 🟡 T2 | 2026-07-18T16:56:59.872Z | Artifact status complete và có WER/diff/tone/English retention tại `plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json:1-6`, `:38-145`, `:318-450`, `:660-782`; dataset synthetic chỉ có ba cases. |
| Triển khai | Main/web/agent/schema live | ✅ T1 | 2026-07-18T20:02:52Z | Vercel READY, LiveKit Running, public pages 200, four health dependencies ready và database integrity checks đạt (`plans/2026-07-18-valsea-rubric-gap/reports/phase-06-production-rollout.md:11-52`). |
| Bối cảnh địa phương | Good; chưa Outstanding | 🟡 T2/T3 | 2026-07-19 | Nghiệp vụ nhà xe, prompt Việt, phone/time/VND format có bằng chứng tại `specs/product-vision.md:5-14`, `apps/web/src/lib/call-contract.ts:3-63`; accent và SIP thật còn mở. |
| Khả năng mở rộng | Chưa xếp hạng live | 🟡 T3 | 2026-07-19 | Boundary agent/API/Neon tách lớp tại `docs/architecture.md:5-24`, nhưng scope hiện là một operator/vertical và chưa có pilot đa tenant tại `specs/product-vision.md:38-44`. |

## Khoảng trống không được đánh dấu đạt

- Regional accent: chỉ có synthetic/no-PII; cần fixture thật có consent
  (`plans/2026-07-18-valsea-rubric-gap/phase-03-hard-case-evidence.md:49-54`).
- QR: cần scan bằng điện thoại trên deployment, thử đúng/sai phone và không ghi PII
  (`docs/deployment.md:76-79`).
- Webhook: cần receiver thật xác minh signature/idempotency và delivery; code/test
  không thay thế bằng chứng này (`specs/api-contracts.md:77-112`).
- Semantic annotation và latency: cần capture event/UI trong một cuộc gọi thật
  (`docs/architecture.md:109-123`).
- PSTN: runbook ghi rõ chưa có cuộc gọi thật (`docs/pstn-sip-runbook.md:3-12`).
