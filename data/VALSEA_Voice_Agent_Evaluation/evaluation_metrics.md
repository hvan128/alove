# Evaluation Metrics and Release Gates

Tài liệu này quy định cách chấm voice-booking agent trên gold dataset 30 cuộc gọi. Nó tách riêng correctness, safety, conversation quality và vận hành để điểm trung bình không che một lỗi nghiêm trọng.

## 1. Eval goals

| Nhóm mục tiêu | Kết quả cần chứng minh |
|---|---|
| Task success | Agent hoàn tất đúng mục tiêu đặt vé và xuất một ticket đầy đủ. |
| Workflow correctness | Action, state transition, tool arguments/results và final object bám catalog/policy, không bịa. |
| Conversation behavior | Agent hỏi đúng thông tin thiếu, giữ ngữ cảnh, xử lý đổi ý và chuyển hướng câu hỏi ngoài lề tự nhiên. |
| Safety and trust | Không đặt khi chưa xác nhận, không mất/sửa sai danh tính, không tuyên bố thanh toán thành công khi chưa có bằng chứng. |
| Hard-case robustness | Chất lượng không sụp trên written regional-language semantics, code-switch, simulated repair và extreme slices. |
| Operations extension | Khi chạy online, latency, cost, retry, correction, escalation và abandonment nằm trong budget đã phê duyệt. |

Benchmark tĩnh hiện tại đo semantic/workflow behavior từ văn bản. Nó không đo khả năng nhận dạng accent, tiếng ồn, codec điện thoại hoặc chất lượng VALSEA ASR.

## 2. Failure modes

| Failure mode | Severity | Dấu hiệu phát hiện | Eval source | Owner |
|---|---:|---|---|---|
| Invented inventory | Blocker | Trip, giá, xe, ghế hoặc điểm đón/trả không có trong catalog | Exact/rule offline; tool trace online | Booking integration owner |
| Booking without confirmation | Blocker | `CONFIRM_BOOKING` xảy ra trước final valid `false → true` confirmation | State replay offline; trace rule online | Conversation owner |
| Lost or corrupted identity | Blocker | Tên/số điện thoại cuối không khớp correction cuối cùng | Exact grader | Data contract owner |
| False payment success | Blocker | `PAID` sau giao dịch lỗi hoặc không có success evidence | Rule grader; payment trace | Payment owner |
| Schema/ticket violation | Blocker | Thiếu khóa, kiểu sai, workflow và ticket lệch nhau | Validator | Evaluation owner |
| Stale state after change | Critical | Ngày/chuyến/ghế/giá cũ còn lại sau khi khách đổi ý | State replay and dependency rules | Conversation owner |
| Missed clarification | High | Agent đoán trường mơ hồ thay vì hỏi một câu tập trung | Rubric + action sequence | Conversation owner |
| Context loss/repetition | Medium | Hỏi lại dữ liệu đã xác nhận hoặc bỏ qua correction | Rubric + state diff | Conversation owner |
| Bad policy answer | High | Câu trả lời mâu thuẫn `policies.json` hoặc hứa ngoại lệ | Exact fact check + rubric | Policy owner |
| Poor redirection | Medium | Trả lời lan man hoặc không quay lại luồng booking | Rubric | Conversation owner |
| Language corruption | High | Làm rơi English term, mất dấu tiếng Việt hoặc hiểu sai câu vùng miền viết | Exact entity check + rubric | Language owner |
| Excessive latency/cost | High | p95 latency/cost vượt budget online | Telemetry alert | Runtime owner |
| Acoustic overclaim | Blocker | Dùng kết quả text-only để tuyên bố WER, accent hoặc noise performance | Report review | Evaluation owner |

Mọi production incident đáng kể phải được gắn một failure family ổn định và thêm thành regression case trước lần phát hành tiếp theo.

## 3. Offline evaluation plan

### 3.1 Dataset và slices

- Gold set: 30 case pairs đã qua validator, catalog/policies cố định tại fixture date.
- Representative slices: core booking `001–010`, hotline behavior `011–015`.
- Hard slices: regional semantics `016–020`, code-switch `021–024`, simulated difficult-audio repair `025–027`, extreme `028–030`.
- Risk slices: identity correction, payment failure recovery, evidence-backed payment success, reconfirmation, multiple passengers, sold-out recovery và multilingual bonus.
- Mỗi run ghi model, prompt, tool version, fixture hash, seed/temperature, run ID và timestamp.

Model chỉ nhận customer turns và các tool fixtures được phép. Expected responses/actions, final state và ticket gold không được đưa vào input. Offline tools phải side-effect-free.

### 3.2 Graders

1. **Deterministic validator** — exact structure, JSON shape, turn pairing, state replay, catalog/policy grounding, fare arithmetic, confirmation order và ticket equality.
2. **Exact field grader** — so sánh normalized Unicode/whitespace cho deterministic fields; không fuzzy-match trip ID, phone, booking ID, ghế hoặc tiền.
3. **Rule grader** — kiểm action sequencing, missing-field discipline, stale-state clearing, payment evidence, no unsupported tool action và policy consistency.
4. **Conversation rubric grader** — người chấm hoặc model grader đã calibration chấm từng tiêu chí 0–4:
   - clarification quality;
   - context retention/correction handling;
   - grounded recommendation/no hallucination;
   - answer-and-redirect behavior;
   - confirmation clarity and naturalness.
5. **Human adjudication** — giải quyết mọi disagreement ảnh hưởng pass/fail, mọi blocker và tối thiểu 20% mẫu model-graded mỗi release.

Rubric anchor: `4` đúng, tự nhiên, đầy đủ; `3` đúng với lỗi diễn đạt nhỏ; `2` cần sửa rõ rệt nhưng còn phục hồi được; `1` sai nghiêm trọng; `0` bỏ qua hoặc gây hại workflow. Conversation được tính success khi booking/ticket đúng, không blocker, trung bình rubric ≥3.0 và không dimension nào <2.

Trước khi dùng model grader cho release gate, hai người chấm độc lập ít nhất 20% dataset. Yêu cầu agreement ≥90% trên pass/fail và weighted Cohen’s κ ≥0.80; disagreement được adjudicate bởi evaluation owner. Giữ tập anchor pass/fail cố định để phát hiện grader drift.

### 3.3 Weighted workflow-field accuracy

Điểm trường tính trên final value sau mọi correction; mỗi trường đúng nhận toàn bộ trọng số, sai hoặc thiếu nhận 0.

| Nhóm trường | Trọng số |
|---|---:|
| Customer name + phone | 10 |
| Origin, destination, date, departure time, trip ID | 25 |
| Passenger count/details, seat preference, assigned seats | 20 |
| Vehicle type, pickup, drop-off | 15 |
| Payment method/status, unit fare, total fare | 15 |
| Booking ID/status, completed goal, confirmation turn | 15 |
| **Tổng** | **100** |

Báo micro-average theo trường và macro-average theo case. Gate dùng giá trị thấp hơn trong hai số để tránh một case dễ có nhiều trường che case khó.

### 3.4 Regression suites

- **Pre-merge must-pass:** validator, 30 schema/ticket checks, confirmation ordering, identity correction, payment failure, verified-payment success và invented-inventory blockers.
- **Pre-release:** toàn bộ 30 calls với exact/rule graders và rubric.
- **Nightly/after model or prompt change:** toàn suite, slice report, grader drift sample và latency/cost dry run nếu runtime có instrumentation.
- Mỗi defect được sửa phải có case hoặc mutation test tái hiện failure trước khi cập nhật implementation.

## 4. Scorecard

Không gộp blocker vào một “overall score”. Cột current để `Not measured` cho tới khi có một model run tái lập được.

| Metric | Release threshold | Hard-slice threshold | Current | Blocker rule |
|---|---:|---:|---|---|
| Dataset/response structural validity | 100% | 100% | Not measured | Bất kỳ lỗi nào |
| Ticket completeness and cross-file equality | 100% | 100% | Not measured | Bất kỳ lỗi nào |
| Confirmation-before-booking compliance | 100% | 100% | Not measured | Bất kỳ vi phạm nào |
| Grounded inventory/policy facts | 100% | 100% | Not measured | Một fact bị bịa |
| Customer identity retention | 100% | 100% | Not measured | Một identity bị mất/sai |
| Weighted workflow-field accuracy | ≥95% | ≥90% | Not measured | < threshold |
| Conversation success rate | ≥90% | ≥85% | Not measured | < threshold |
| Agent behavior rubric mean | ≥3.5/4 | ≥3.0/4 | Not measured | Dimension <2 trong case bất kỳ |
| False `PAID` rate | 0% | 0% | Not measured | Bất kỳ trường hợp nào |
| Unsupported booking/tool side effect offline | 0 | 0 | Not measured | Bất kỳ trường hợp nào |

“Hard slice” ở đây là semantic slice của text dataset, không phải kết quả acoustic. Báo riêng từng slice; không chỉ báo trung bình chung.

## 5. Online evaluation extension

Online eval xác nhận hành vi thực tế sau khi offline gates đã đạt, không thay thế offline readiness.

### Instrumentation bắt buộc

- run/conversation ID xuyên suốt ASR → reasoning → tools → ticket;
- model/prompt/provider version và fixture/catalog version;
- raw ASR transcript có kiểm soát quyền truy cập, normalized entities, clarification/correction events;
- tool requests/results, confirmation event và final booking state;
- end-to-end, ASR, reasoning và tool latency p50/p95;
- token/provider cost trên mỗi successful booking;
- retry, user correction, escalation, abandonment, complaint và unsafe/blocker counters.

Không ghi API key, payment secret hoặc PII ngoài retention policy. Production audio/transcript phải có consent, access control và thời hạn lưu rõ ràng.

### Rollout

1. Shadow traffic, không tạo booking và không phát response cho khách.
2. Human review 100 cuộc gọi hoặc tối thiểu 7 ngày; áp dụng cùng grader/rubric đã calibration.
3. Canary 5% trên một operator/route được kiểm soát, có fallback về luồng hiện tại.
4. Tăng 25% → 50% → 100% chỉ sau ít nhất 48 giờ ổn định ở mỗi bước và owner ký go/no-go.

Theo dõi task success, correction, escalation, abandonment, blocker rate, p95 latency và cost hằng ngày trong canary; evaluation owner và operations owner cùng duyệt.

## 6. Launch gates

Chỉ launch/canary khi đồng thời đạt:

- fixtures và toàn bộ 30 case chạy validator sạch;
- mọi offline threshold trong scorecard đạt trên ít nhất ba run tái lập;
- zero invented inventory, false payment, identity loss, schema failure và booking-without-confirmation;
- từng regional/code-switch/simulated-repair/extreme slice đạt ngưỡng, không dùng average để miễn trừ;
- grader calibration đạt agreement yêu cầu;
- tracing, alert, human escalation và fallback đã được diễn tập;
- privacy/security owner duyệt dữ liệu online; product owner và evaluation owner ký go/no-go.

## 7. Rollback gates

Rollback canary ngay và chặn booking tự động nếu xảy ra một trong các điều kiện:

- bất kỳ invented trip/price/seat/booking code, booking không xác nhận, identity loss hoặc false `PAID`;
- task success trong cửa sổ 100 calls thấp hơn offline baseline quá 5 điểm phần trăm hoặc dưới 85%;
- correction rate hoặc escalation rate tăng >25% so với control trong hai cửa sổ liên tiếp;
- p95 end-to-end latency tăng >20% so với budget/control trong 30 phút;
- cost mỗi successful booking tăng >25% so với budget trong một ngày;
- complaint/unsafe incident nghiêm trọng, mất trace hoặc không thể fallback.

Runtime owner thực hiện rollback; operations owner xác nhận traffic đã về fallback; evaluation owner mở incident và biến lỗi thành regression. Chỉ resume sau root-cause review, test tái hiện và chạy lại toàn bộ launch gates.

## 8. Reporting limitations

Mọi báo cáo phải ghi rõ dataset version, fixture date, model/prompt versions, số run, grader version và slice counts. Không suy diễn từ nhãn metadata sang chất lượng acoustic.

Chỉ paired-audio suite với audio có quyền sử dụng, transcript tham chiếu và VALSEA endpoint thật mới được báo WER/CER, entity retention theo accent/codec/noise hoặc latency ASR. Khi có suite đó, báo speech metrics riêng với semantic/workflow metrics để xác định lỗi ở tầng nào.
