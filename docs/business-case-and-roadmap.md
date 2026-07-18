# Business Case and Roadmap

## Tóm tắt điều hành

VéĐi có thể demo với chi phí hạ tầng công khai thấp, nhưng pilot/production không thể chốt tổng giá trước khi có báo giá VALSEA, traffic profile và customer inputs. Bảng này vì vậy tách:

- **known-cost subtotal:** chỉ cộng giá công khai và giả định đo được;
- **Cần báo giá:** VALSEA và contract/enterprise options không công khai;
- **Customer input required:** nhân sự, support, tax, workload và lợi ích nghiệp vụ;
- **contingency 15%/20%:** chỉ áp trên known-cost subtotal, không che phần thiếu.

Ba kịch bản đã duyệt:

- Demo: 100 calls/tháng, 500 call-minutes;
- Pilot: 100 calls/ngày, 3,000 calls/tháng, 15,000 call-minutes;
- Production: 1,000 calls/ngày, 30,000 calls/tháng, 150,000 call-minutes.

Tất cả số liệu là planning estimate, chưa gồm VAT/withholding tax, bank/FX fee, vendor discount, support/on-call, domain, external telephony hoặc external inventory.

## Giả định

**Ngày truy cập giá:** 2026-07-18.  
**Planning FX:** `1 USD = 26,450 VND`, dùng tỷ giá bán USD Vietcombank niêm yết 14/07/2026; nguồn truy cập 18/07/2026. Đây là reference budget, không phải tỷ giá thanh toán tương lai.

### Runtime assumptions

- Mỗi call dài trung bình 5 phút.
- Credentialed call có 2 human WebRTC participants trong toàn bộ 5 phút.
- Agent worker kết nối toàn bộ call: 1 agent session minute/call-minute.
- Raw audio recording tắt; recording/egress cost không tính.
- LiveKit Cloud host Agent; self-hosted worker compute không cộng riêng.
- VALSEA xử lý STT call audio và TTS theo response duration; public USD/credit rate chưa có.
- OpenAI model theo source hiện tại: `gpt-4.1-mini`.
- Neon workload là planning proxy, phải thay bằng CU-hour/storage đo từ pilot.
- Vercel dùng Pro với một deploying seat; overage ngoài credit cần usage dashboard.

### OpenAI token assumptions mỗi call

| Sensitivity | Input tokens | Output tokens | Cost/call tại $0.40 input + $1.60 output / 1M tokens |
|---|---:|---:|---:|
| Low | 1,000 | 300 | $0.00088 |
| Base | 2,500 | 600 | $0.00196 |
| High | 5,000 | 1,200 | $0.00392 |

Token assumptions gồm prompt/context và Auto reply text; không gồm VALSEA STT/TTS. Human-only session có thể thấp hơn.

## Kịch bản lưu lượng

| Kịch bản | Công thức calls | Calls/tháng | Call-minutes/tháng | Human WebRTC minutes | Agent session minutes |
|---|---:|---:|---:|---:|---:|
| **Demo** | 100 calls/tháng | 100 | **500** | 1,000 | 500 |
| **Pilot** | 100 × 30 ngày | 3,000 | **15,000** | 30,000 | 15,000 |
| **Production** | 1,000 × 30 ngày | 30,000 | **150,000** | 300,000 | 150,000 |

LiveKit làm tròn từng resource usage theo minimum increment; mỗi connection/session ngắn vẫn có thể bị làm tròn lên phút. Bảng dùng call trung bình đúng 5 phút nên chưa cộng rounding uplift.

## Mô hình chi phí

```text
monthly known cost =
  Vercel fixed/known usage
  + LiveKit plan and overage
  + OpenAI token estimate
  + Neon compute/storage estimate

complete monthly cost =
  monthly known cost
  + VALSEA STT/TTS quote
  + tax/FX/payment fees
  + support/on-call/monitoring extras
  + other customer-approved services
```

Không ghi `Cần báo giá` thành `$0`. Known-cost subtotal luôn kèm cảnh báo **tổng chưa hoàn chỉnh**.

## Chi phí theo provider

| Provider | Plan/unit dùng | Included/public rate | Cách áp dụng | Confidence |
|---|---|---|---|---|
| Vercel | Pro | $20/tháng, 1 deploying seat, $20 usage credit | $20 fixed; overage theo actual Active CPU/memory/invocation/data | Published; overage Formula-based |
| LiveKit | Build / Ship / Scale | $0 / $50 / $500; agent: 1,000 / 5,000 / 50,000 min included, paid overage $0.01/min; WebRTC: 5,000 / 150,000 / 1.5M min included | Chọn plan theo scenario; 2 human minutes/call-minute | Published |
| VALSEA | API credits | STT dùng credits; RTT options có multiplier; TTS tính generated duration, làm tròn phút | Cần account quote cho USD/credit, allowance và volume tier | **Quote required / Cần báo giá** |
| OpenAI | GPT-4.1 mini | $0.40/1M input; $0.10/1M cached input; $1.60/1M output | Bảng dùng uncached input để bảo thủ | Published + Formula-based |
| Neon | Free / Launch / Scale | Free: 100 CU-hour + 0.5 GB/project; Launch $0.106/CU-hour + $0.35/GB-month; Scale $0.222/CU-hour + $0.35/GB-month | Demo Free; Pilot Launch intermittent proxy; Production Scale medium proxy | Published + Formula-based |
| USD/VND | Vietcombank selling | 26,450 VND/USD tại 14/07/2026 | `USD × 26,450`, làm tròn VND | Published reference |

VALSEA docs xác nhận billing unit/credit behavior nhưng không công bố public USD rate trên các trang đã tra. Sales/account quote phải nêu STT realtime, TTS, translation/diarization multiplier, minimum top-up, tax và volume discount.

## Tổng chi phí theo kịch bản

### Demo — 100 calls/tháng

| Component | Pricing unit | Usage assumption | Included allowance | Estimated subtotal USD | Estimated subtotal VND | Confidence | Source |
|---|---|---:|---|---:|---:|---|---|
| Vercel Pro | tháng | 1 team/seat | $20 credit | $20.00 | 529,000 | Published | [Vercel](https://vercel.com/pricing) |
| LiveKit Build | agent + WebRTC minute | 500 agent; 1,000 WebRTC | 1,000 agent; 5,000 WebRTC | $0.00 | 0 | Published | [LiveKit](https://livekit.com/pricing) |
| VALSEA RTT + TTS | credit/minute | 500 STT min + TTS actual | Không công khai | **Cần báo giá** | **Cần báo giá** | Quote required | [VALSEA RTT](https://valsea.ai/docs/realtime), [TTS](https://valsea.ai/docs/api/speech) |
| OpenAI GPT-4.1 mini | token | Base: 250k input + 60k output | Không có monthly allowance giả định | $0.196 | 5,184 | Formula-based | [OpenAI](https://developers.openai.com/api/docs/models/gpt-4.1-mini) |
| Neon Free | CU-hour/storage | Demo dưới cap giả định | 100 CU-hour + 0.5 GB/project | $0.00 | 0 | Formula-based | [Neon](https://neon.com/pricing) |
| **Known-cost subtotal** |  |  |  | **$20.196** | **534,184** | Incomplete total |  |
| + 15% contingency |  | known subtotal only |  | **$23.23** | **614,312** | Formula-based |  |
| + 20% contingency |  | known subtotal only |  | **$24.24** | **641,021** | Formula-based |  |

**Cảnh báo:** chưa gồm VALSEA, Vercel overage, tax/FX và support; tổng thực không phải $20.196.

### Pilot — 100 calls/ngày

| Component | Pricing unit | Usage assumption | Included allowance | Estimated subtotal USD | Estimated subtotal VND | Confidence | Source |
|---|---|---:|---|---:|---:|---|---|
| Vercel Pro | tháng | 1 team/seat | $20 credit | $20.00 | 529,000 | Published | [Vercel](https://vercel.com/pricing) |
| LiveKit Ship | tháng + agent overage | $50 + (15,000−5,000)×$0.01 | 5,000 agent; 150,000 WebRTC | $150.00 | 3,967,500 | Formula-based | [LiveKit](https://livekit.com/pricing) |
| VALSEA RTT + TTS | credit/minute | 15,000 STT min + TTS actual | Không công khai | **Cần báo giá** | **Cần báo giá** | Quote required | [VALSEA API](https://valsea.ai/docs/api) |
| OpenAI GPT-4.1 mini | token | Base: 7.5M input + 1.8M output | Không giả định cached discount | $5.88 | 155,526 | Formula-based | [OpenAI](https://developers.openai.com/api/docs/models/gpt-4.1-mini) |
| Neon Launch | CU-hour + GB-month | 140 CU-hour + 1 GB | Paid usage starts từ 0 | $15.19 | 401,776 | Formula-based | [Neon](https://neon.com/pricing) |
| **Known-cost subtotal** |  |  |  | **$191.07** | **5,053,802** | Incomplete total |  |
| + 15% contingency |  | known subtotal only |  | **$219.73** | **5,811,872** | Formula-based |  |
| + 20% contingency |  | known subtotal only |  | **$229.28** | **6,064,562** | Formula-based |  |

**Cảnh báo:** chưa gồm VALSEA, tax/FX, production support, additional observability và Vercel overage. LiveKit concurrency phải validate theo arrival pattern, không suy từ monthly minutes.

### Production — 1,000 calls/ngày

| Component | Pricing unit | Usage assumption | Included allowance | Estimated subtotal USD | Estimated subtotal VND | Confidence | Source |
|---|---|---:|---|---:|---:|---|---|
| Vercel Pro baseline | tháng | 1 team/seat; actual usage chưa đo | $20 credit | $20.00 | 529,000 | Published baseline; Customer input required for overage | [Vercel](https://vercel.com/pricing) |
| LiveKit Scale | tháng + agent overage | $500 + (150,000−50,000)×$0.01 | 50,000 agent; 1.5M WebRTC | $1,500.00 | 39,675,000 | Formula-based | [LiveKit](https://livekit.com/pricing) |
| VALSEA RTT + TTS | credit/minute | 150,000 STT min + TTS actual | Không công khai | **Cần báo giá** | **Cần báo giá** | Quote required | [VALSEA RTT](https://valsea.ai/docs/realtime) |
| OpenAI GPT-4.1 mini | token | Base: 75M input + 18M output | Không giả định cached discount | $58.80 | 1,555,260 | Formula-based | [OpenAI](https://developers.openai.com/api/docs/models/gpt-4.1-mini) |
| Neon Scale | CU-hour + GB-month | Medium proxy: 720 CU-hour + 10 GB | Paid usage starts từ 0 | $163.34 | 4,320,343 | Formula-based | [Neon](https://neon.com/pricing) |
| **Known-cost subtotal** |  |  |  | **$1,742.14** | **46,079,603** | Incomplete total |  |
| + 15% contingency |  | known subtotal only |  | **$2,003.46** | **52,991,543** | Formula-based |  |
| + 20% contingency |  | known subtotal only |  | **$2,090.57** | **55,295,524** | Formula-based |  |

**Cảnh báo:** production tổng chưa hoàn chỉnh và Vercel Pro/LiveKit Scale không tự đáp ứng enterprise SLA/security/support. Load, region, concurrency, observability, data retention và contract terms có thể đổi plan.

## Chi phí triển khai một lần

Team planning assumption:

- 2 full-stack/AI engineers;
- 0.5 QA/automation;
- 0.25 DevOps/security;
- product/customer owner do nhà xe bố trí;
- specialist privacy/legal hoặc provider setup nếu scope yêu cầu.

```text
phase cost =
sum(role allocation × person-month rate × phase months)
+ external setup
+ contingency
```

Không có public benchmark đủ authoritative cho rate nhân sự cụ thể dự án Việt Nam. Vì vậy:

| Input | Giá trị | Confidence |
|---|---:|---|
| Full-stack/AI engineer rate | Do supplier/customer nhập | **Customer input required** |
| QA/automation rate | Do supplier/customer nhập | **Customer input required** |
| DevOps/security rate | Do supplier/customer nhập | **Customer input required** |
| Customer product owner | Internal loaded cost | **Customer input required** |
| Provider/account setup | Theo hợp đồng | **Quote required** |

Person-month envelope trước customer owner:

| Phase | Calendar range | Delivery allocation | Person-month range |
|---|---:|---:|---:|
| P0 | 1–2 tuần | 2.75 FTE | 0.69–1.38 |
| P1 | 4–6 tuần | 2.75 FTE | 2.75–4.13 |
| P2 | 6–10 tuần | 2.75 FTE | 4.13–6.88 |
| P3 | 8–16 tuần | 2.75 FTE | 5.50–11.00 |

Đây là capacity envelope, không phải báo giá hoặc cam kết lịch.

## Chi phí trên mỗi cuộc gọi/booking

```text
known cost per call = known monthly subtotal / monthly calls
complete cost per call = complete monthly cost / monthly calls
cost per completed booking = complete monthly cost / valid completed bookings
```

| Scenario | Known subtotal/call | Known subtotal/call VND | Chưa gồm |
|---|---:|---:|---|
| Demo | $0.202 | ~5,342 | VALSEA, tax/support |
| Pilot | $0.064 | ~1,685 | VALSEA, tax/support, failed/ineligible calls |
| Production | $0.058 | ~1,536 | VALSEA, tax/support, Vercel overage |

Không dùng known subtotal làm giá bán. Booking completion rate thấp sẽ làm cost/completed booking tăng.

## ROI và điểm hòa vốn

```text
monthly gross benefit =
(baseline handle minutes - assisted handle minutes)
× eligible monthly calls
× loaded staff cost per minute

monthly net benefit = monthly gross benefit - complete monthly operating cost

break-even months = one-time implementation cost / monthly net benefit
```

Chỉ tính break-even nếu monthly net benefit dương. Không giả định cắt giảm nhân sự; benefit có thể là tăng capacity, giảm rework hoặc nâng chất lượng.

### Planning sensitivity cho Pilot

Các input dưới đây chỉ minh họa công thức, **không phải market quote hoặc achieved result**.

| Case | Baseline → assisted | Eligible calls | Loaded staff cost | Gross benefit VND | Trừ known OPEX | Kết luận trước VALSEA/support |
|---|---:|---:|---:|---:|---:|---|
| Low | 6 → 5 phút | 3,000 | 500 VND/phút | 1,500,000 | 5,053,802 | Âm; không có break-even |
| Base | 8 → 5 phút | 3,000 | 1,000 VND/phút | 9,000,000 | 5,053,802 | 3,946,198 VND trước phần thiếu |
| High | 10 → 4 phút | 3,000 | 1,500 VND/phút | 27,000,000 | 5,053,802 | 21,946,198 VND trước phần thiếu |

Khách hàng phải thay baseline, assisted minutes, eligible calls, loaded rate, complete OPEX và one-time cost bằng dữ liệu pilot trước quyết định đầu tư.

## Phân tích độ nhạy

| Driver | Low | Base | High | Tác động |
|---|---:|---:|---:|---|
| Call duration | 3 phút | 5 phút | 8 phút | Tăng LiveKit/VALSEA và concurrency |
| OpenAI tokens/call | 1,000 in / 300 out | 2,500 / 600 | 5,000 / 1,200 | Pilot: $2.64 / $5.88 / $11.76 |
| Agent-enabled share | 25% | 70% | 100% | Giảm/tăng LLM/TTS và agent minutes tùy dispatch design |
| Booking completion | Customer input | Customer input | Customer input | Mẫu số cost/completed booking |
| VALSEA rate | Cần báo giá | Cần báo giá | Cần báo giá | Có thể là variable-cost driver chính |
| Neon workload | Scale-to-zero | Intermittent | Always-on/high load | Tăng CU-hour, storage/history |
| Concurrent calls | Arrival-dependent | Arrival-dependent | Peak/event-driven | Có thể đổi LiveKit plan/contract |

## Roadmap P0–P3

### Tổng quan

| Phase | Duration assumption | Main output | Approx. delivery PM |
|---|---:|---|---:|
| **P0** | 1–2 tuần | Demo/evidence/documentation readiness | 0.69–1.38 |
| **P1** | 4–6 tuần | Credentialed pilot và booking safety | 2.75–4.13 |
| **P2** | 6–10 tuần | Operator queue/dashboard/catalog/observability | 4.13–6.88 |
| **P3** | 8–16 tuần sau P2 | Inventory/telephony/SLO/DR expansion | 5.50–11.00 |

### P0 — Demo readiness

- **Scope:** canonical docs, 5-minute playbook, truthful status, local smoke, evidence manifest.
- **Dependencies:** stable sample, public web, repo access, presenter rehearsal.
- **Team:** 2 engineers shared, QA review, DevOps check.
- **Cost formula:** `0.69–1.38 PM × customer rates + external setup + contingency`.
- **Risks:** stale deployment claim, demo data leak, microphone failure.
- **Exit criteria:** local flow pass, links/evidence consistent, fallback rehearsal, no unsupported provider claim.
- **Rollback:** use text/preset, prior verified deployment và lower status claim.
- **Không claim:** credentialed VALSEA/LiveKit/Neon hoặc real booking.

### P1 — Credentialed pilot

- **Scope:** LiveKit two-device, VALSEA RTT/TTS, Neon, identity/authorization, consent/retention, durable confirmation/idempotency, monitoring và failure drills.
- **Dependencies:** provider accounts/quote, approved data sample, customer security/data decisions.
- **Team:** 2 engineers, 0.5 QA, 0.25 DevOps/security, customer owner.
- **Cost formula:** `2.75–4.13 PM × customer rates + provider setup + contingency`.
- **Risks:** accent quality, provider latency, PII exposure, duplicate confirmation.
- **Exit criteria:** positive/negative credentialed smoke, hard safety gates, KPI baseline, staff training, incident/rollback exercise.
- **Rollback:** disable provider flags/routing, Human/text mode, close confirmation for affected sessions, revert web/worker/migration.
- **Không claim:** enterprise operations, external inventory, PSTN hoặc payment.

### P2 — Operator operations

- **Scope:** incoming queue, staff assignment, multi-session dashboard, role model, catalog draft/validate/publish, vehicle templates, internal holds, observability/export.
- **Dependencies:** P1 accepted, operator data owner, normalized catalog, concurrency design.
- **Team:** same delivery core; add operator SME/customer admin time.
- **Cost formula:** `4.13–6.88 PM × customer rates + data migration/setup + contingency`.
- **Risks:** bad catalog publish, seat conflict, adoption/queue overload, audit gaps.
- **Exit criteria:** role tests, immutable publish, concurrent-hold one-winner, expiry/release/consume, dashboard load test và operator acceptance.
- **Rollback:** retire bad catalog version, stop new holds, release eligible holds, Human/manual operator workflow.
- **Không claim:** external seat guarantee, passenger seat map, telephony rollout hoặc payment.

### P3 — Production expansion

- **Scope:** approved inventory adapter, PSTN/SIP feasibility/rollout, SLO, regional design, load/capacity, DR, retention automation và enterprise support.
- **Dependencies:** P2 stability, commercial contracts, legal/consent decision, external operator APIs.
- **Team:** delivery core + security/DevOps tăng theo SLO; provider/operator specialists.
- **Cost formula:** `5.50–11.00 PM × customer rates + contracts/load/DR work + contingency`.
- **Risks:** external inconsistency, telephony quality, vendor lock-in, recovery failure, cost spikes.
- **Exit criteria:** reconciliation, load/SLO evidence, restore/failover drill, support agreement, production acceptance.
- **Rollback:** isolate adapter/channel, revert routing, reconcile pending records, return internal/manual workflow.
- **Không claim:** payment, delivery hoặc ticket guarantee nếu từng integration chưa có gate riêng.

## Team và timeline

Timeline trên giả định một delivery team làm tuần tự. Scope, provider procurement, customer approvals và production blackout có thể kéo dài calendar time mà không tăng coding effort tuyến tính. Không chạy P2/P3 chỉ vì P1 adapter đã tồn tại; promotion dựa evidence.

Decision cadence:

- weekly delivery review;
- daily pilot safety/KPI review trong Week 4;
- phase exit review có customer approver;
- pricing refresh trước procurement và mỗi quarter.

## Risk, dependency và rollback

| Risk/dependency | Early signal | Mitigation | Rollback owner |
|---|---|---|---|
| VALSEA quote/credential delay | Không có account/rate/sandbox date | Giữ local P0; không commit production cost | Product/provider owner |
| Accuracy/latency không đạt | First Final hoặc critical fields ngoài threshold | Human-only, sample stratification, tuning | AI engineering + operations |
| Duplicate/unauthorized booking | Mã đổi, actor/scope mismatch | Đóng gate, transaction fix, incident review | Engineering/security |
| PII/secret exposure | Scan/log/access alert | Dừng pilot, rotate, notify, delete theo policy | Security owner |
| Catalog/inventory conflict | Version mismatch/hold collision | Freeze publish/holds, reconcile/manual | Operator admin |
| Cost vượt budget | Usage alert/quote variance | Traffic cap, Auto share cap, spend limit | Product/finance |
| Provider outage | Readiness/error rate | Human/text fallback, disable integration flag | On-call/provider owner |

## Cách cập nhật bảng giá

1. Ghi access date và direct official URL cho từng provider.
2. Chụp plan, allowance, unit, overage, region, tax và contract term.
3. Thay actual calls, duration, concurrency, tokens, CU-hour và storage.
4. Giữ `Quote required` đến khi có văn bản; không nhập zero.
5. Dùng tỷ giá bán/settlement source mới, ghi timestamp.
6. Recalculate USD/VND, 15%/20%, cost/call và ROI low/base/high.
7. Hai người review formula; finance/customer owner duyệt procurement version.

## Nguồn

Truy cập 2026-07-18:

- [Vercel Pricing](https://vercel.com/pricing) — Pro $20/month, usage credit và on-demand model.
- [Vercel Pro Plan](https://vercel.com/docs/plans/pro-plan) — platform fee, seat và credit detail.
- [LiveKit Pricing](https://livekit.com/pricing) — Build/Ship/Scale, Agent session và WebRTC allowances/overages.
- [LiveKit Cloud Billing](https://docs.livekit.io/deploy/admin/billing/) — metering units và rounding.
- [VALSEA API Reference](https://valsea.ai/docs/api) — credit-based API billing boundary.
- [VALSEA Realtime](https://valsea.ai/docs/realtime) — RTT session/options và credit multiplier behavior.
- [VALSEA Text to Speech](https://valsea.ai/docs/api/speech) — duration billing, rounded whole minute.
- [OpenAI GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) — input/cached/output token rates.
- [Neon Pricing](https://neon.com/pricing) — Free allowance, Launch/Scale CU-hour và storage rates.
- [Vietcombank Exchange Rates](https://www.vietcombank.com.vn/en/To-Chuc/Trang-chu-DCTC/KHTC---Ti-gia---DCTC) — USD/VND reference; bảng dùng selling rate 26,450 ngày 14/07/2026.

Giá chưa gồm thuế/discount/FX fee trừ khi vendor source nói rõ. Enterprise/volume/SLA/on-prem options: **Cần báo giá**.
