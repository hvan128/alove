# VALSEA Voice Agent Evaluation Dataset

Đây là bộ test case tĩnh cho voice agent đặt vé xe khách liên tỉnh. Bộ dữ liệu tập trung vào khả năng hiểu hội thoại dài, hỏi làm rõ, sửa thông tin, dùng đúng tool, giữ trạng thái và chỉ thực hiện nghiệp vụ khi đủ điều kiện.

Phiên bản canonical hiện tại là `2.0`. Bộ này **không gồm runner, grader, SQL, audio hay kết quả chạy model**. Dev có thể dùng các expected field trong JSON để xây harness và sinh pass/fail sau.

## Phạm vi v2

- 30 cuộc gọi độc lập: 10 base case và 20 challenge case.
- Mỗi case có ít nhất 10 lượt khách hàng và 10 phản hồi agent mong đợi, ghép thành các exchange cùng số thứ tự.
- Có booking mới, hỏi làm rõ, sửa ngày/tuyến/số khách, thiếu ghế, không có chuyến, tuyến không hỗ trợ, tra cứu, hủy, hủy rồi đặt lại và kết thúc cuộc gọi.
- Có tiếng Việt vùng miền ở dạng chữ, Vietnamese–English code-switch và một case Vietnamese–English–Thai.
- Không giả lập tool thanh toán và không gán trạng thái đã thanh toán.
- Không dùng pseudo-action như một tool thật.

Đây là semantic/workflow dataset dạng text. Các nhãn như `telephone`, `background_noise`, `station_announcement` hoặc `regional_language` chỉ mô tả bối cảnh cần dựng khi có audio; chúng không chứng minh chất lượng ASR, accent robustness, WER/CER hay chống nhiễu.

## Cấu trúc

```text
VALSEA_Voice_Agent_Evaluation/
├── README.md
├── eval_base.json                 # canonical v2, CASE_001–CASE_010
├── eval_challenge.json            # canonical v2, CASE_011–CASE_030
├── migration_map.json             # nguồn và quyết định chuyển đổi v1 -> v2
├── fixtures/
│   ├── v2/
│   │   ├── catalog.json           # inventory/runtime-shaped trip data
│   │   ├── policies.json          # policy boundary cho câu trả lời
│   │   └── case_overrides.json    # deterministic tool results theo case/turn
│   ├── catalog.json               # legacy v1, giữ nguyên
│   └── policies.json              # legacy v1, giữ nguyên
├── scenarios/                     # 30 scenario Markdown legacy v1
├── expected_outputs/              # 30 expected-output JSON legacy v1
├── evaluation_metrics.md          # tài liệu legacy v1
├── validate_dataset.py            # validator legacy v1
└── tests/                          # test validator legacy v1
```

Hai file `eval_base.json` và `eval_challenge.json` là đầu vào canonical cho harness mới. Các thư mục/file ghi `legacy v1` chỉ được giữ để truy vết và không định nghĩa runtime contract v2.

Mọi canonical dataset, v2 fixture và migration map đều khai báo:

```json
{
  "schema_version": "2.0",
  "fixture_version": "2.0"
}
```

## Phương pháp thiết kế

Bộ v2 áp dụng cách làm failure-driven của repo lab:

1. Xác định lỗi cần bắt trước khi viết kỳ vọng.
2. Đặt đúng một `failure_type` chính và một `focus_turn` cho mỗi case.
3. Ghi input thực tế của khách theo hội thoại dài, kể cả nói thiếu, đổi ý và tự sửa.
4. Ghi response tham chiếu, facts bắt buộc, claim bị cấm, tool call và state delta theo từng turn.
5. Ground mọi kết quả tool vào fixture cố định thay vì để model tự bịa.
6. Ghi outcome cuối và chuỗi tool bắt buộc ở cấp case.
7. Lưu provenance của toàn bộ 60 file v1 trong `migration_map.json`, kể cả nội dung được giữ, viết lại, gộp hoặc bỏ.

Các failure family chính gồm:

- `missing_clarification`
- `wrong_arg_value`
- `unnecessary_tool`
- `wrong_tool`
- `stale_state_after_correction`
- `booking_without_confirmation`
- `premature_end_call`
- `hallucinated_inventory`
- `unsupported_policy_claim`
- `out_of_scope`
- `route_availability_confusion`
- `seat_shortfall_mishandled`
- `booking_lookup_boundary`

## Contract của một case

Mỗi case có các trường chính:

```text
id, phase, suite, title, failure_type, focus_turn,
preconditions, turns, expect, metadata
```

- `id`: `CASE_001` đến `CASE_030`.
- `phase`: giai đoạn dùng case trong chu trình eval.
- `suite`: `base` hoặc `challenge`.
- `failure_type`: lỗi chính mà case phải phát hiện.
- `focus_turn`: turn quan trọng nhất để kiểm tra failure.
- `preconditions.fixture_refs`: fixture cần thiết để replay case.
- `turns`: danh sách exchange theo thứ tự từ 1.
- `expect.required_tool_sequence`: chuỗi tool đúng của toàn cuộc gọi.
- `expect.forbidden_tool_calls`: tool tuyệt đối không được gọi trong case.
- `expect.final_state`: state tối thiểu phải đúng cuối cuộc gọi.
- `expect.final_outcome`: kết quả nghiệp vụ cuối.
- `metadata.what_it_tests`: mục tiêu kiểm tra bằng ngôn ngữ dễ đọc.
- `metadata.source_cases`: nguồn v1 được tái sử dụng.

Mỗi phần tử trong `turns` có:

```json
{
  "turn": 1,
  "customer": "...",
  "expect": {
    "agent_response": {
      "reference": "...",
      "must_include_facts": [],
      "must_not_claim": []
    },
    "forbidden_tool_calls": [],
    "state_set": {},
    "state_clear": [],
    "no_tool": true
  }
}
```

Nếu turn phải gọi tool, `no_tool` được thay bằng `tool_calls`. Hai trường này loại trừ nhau. Một tool call có dạng:

```json
{
  "name": "search_trips",
  "arguments": {
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "date": "2026-07-22",
    "passengers": 2
  },
  "arguments_match": "exact",
  "result_ref": "fixtures/v2/case_overrides.json#/tool_results/CASE_012/turn_03_search_trips"
}
```

`reference` là một cách trả lời đúng, không bắt buộc model phải lặp nguyên văn. Harness nên chấm deterministic facts/tool/state trước; similarity hoặc LLM-as-judge chỉ nên là lớp bổ sung cho cách diễn đạt.

## Runtime tool contract

Canonical v2 chỉ dùng sáu tool đang có trong branch mục tiêu:

| Tool | Arguments | Match |
|---|---|---|
| `search_trips` | `origin`, `destination`, `date`, `passengers` | exact |
| `hold_seats` | `trip_id`, `passengers` | exact |
| `confirm_booking` | `trip_id`, `passenger_name`, `phone` | exact |
| `find_booking` | `code`, `phone` | subset; ít nhất một giá trị có nội dung |
| `cancel_booking` | `code`, `phone` | subset; ít nhất một giá trị có nội dung trong case hủy |
| `end_call` | không có argument | exact |

Không có `VERIFY_PAYMENT`, `GREET_AND_DISCOVER` hoặc tool chọn ghế theo sở thích. Agent có thể hỏi/giải thích bằng lời, nhưng không được biểu diễn các hành vi đó như tool call.

Fixture kết quả bám response shape của runtime:

- Search thành công: `trips` và `routeServed`.
- Không có chuyến đúng ngày: `trips: []`, `routeServed: true`, `reason`, `otherDates`, `suggestedRoutes`.
- Tuyến không hỗ trợ: `trips: []`, `routeServed: false`, `reason`, `suggestedRoutes`.
- Hold thành công: `held`, `seatCodes`, `seatsHeld`, `shortfall`, `priceVnd`, `totalVnd`, `seatNoun`.
- Hold thất bại: `held: false` và `reason`.
- Confirm: `confirmed`, `code`, `seatCodes`, `totalVnd`, `departureLabel`, `pickupPoint`.
- Lookup: `bookings`.
- Cancel: `cancelled`, `code`, `seatCodes`.

Mỗi `result_ref` trỏ tới một object cố định trong `fixtures/v2/case_overrides.json`. Các case độc lập, không chia sẻ side effect.

## Outcome và kết quả test

`final_outcome` của v2 không giả định mọi cuộc gọi đều đặt vé thành công. Các giá trị hiện có:

```text
booking_confirmed
booking_not_confirmed
customer_declined
no_trip_available
unsupported_route
insufficient_seats
existing_booking_found
existing_booking_cancelled
```

Dataset tự chứa **expected result**, không chứa **actual result** của model. Khi dev nối runner, mỗi lần chạy nên tạo report riêng gồm ít nhất:

- model/prompt/tool-schema version và run ID;
- response thực tế theo turn;
- tool call, arguments và tool result thực tế;
- state cuối và outcome thực tế;
- pass/fail theo tool sequence, arguments, forbidden calls, required facts, forbidden claims và final outcome;
- lỗi theo `failure_type`, slice và case ID.

Không ghi actual result ngược vào các file canonical, vì như vậy sẽ làm lẫn gold expectation với kết quả của một lần chạy cụ thể.

## Code-switch coverage

Các case được đánh dấu profile bắt buộc:

| Case | Level | Mô tả |
|---|---|---|
| CASE_021 | light | chèn cụm tiếng Anh tự nhiên trong câu tiếng Việt |
| CASE_022 | medium | nhiều câu tiếng Anh hoàn chỉnh xen hội thoại Việt |
| CASE_023 | medium | sửa ngày/giờ và xác nhận bằng câu tiếng Anh hoàn chỉnh |
| CASE_024 | heavy | phần lớn lượt khách có English clause hoàn chỉnh |
| CASE_028 | medium | tra cứu booking bằng Việt–Anh |
| CASE_030 | heavy | hội thoại Việt–Anh–Thái, gồm câu Thái hoàn chỉnh |

`metadata.code_switch_profile` ghi rõ `switched_turns`, `full_foreign_clause_turns` và các count để harness kiểm tra coverage thay vì chỉ dựa vào tag.

## Migration và dữ liệu legacy

`migration_map.json` bao phủ đủ:

- `scenarios/CASE_001.md` đến `CASE_030.md`;
- `expected_outputs/CASE_001.json` đến `CASE_030.json`;
- từng turn hoặc top-level field của mỗi file;
- bốn assertion family cũ không còn tương thích runtime: pseudo-action, payment state, seat-preference tool argument và giả định mọi case đều thành công.

Disposition hợp lệ là `retained`, `rewritten`, `merged` hoặc `dropped`. Nội dung bị bỏ phải có lý do; nội dung còn dùng phải trỏ tới target v2.

Legacy validator vẫn chỉ kiểm tra corpus v1:

```powershell
python data/VALSEA_Voice_Agent_Evaluation/validate_dataset.py --strict-warnings
```

Nó không phải validator cho `eval_base.json` và `eval_challenge.json`.

## An toàn dữ liệu

- Tên, số điện thoại, mã booking, chuyến, giá và policy đều là synthetic.
- Không gọi API production, không đặt vé thật, không giữ ghế thật, không hủy booking thật và không thực hiện thanh toán.
- Không thêm API key, token, audio khách hàng thật hoặc dữ liệu nhạy cảm vào fixture.
- Muốn đánh giá speech/ASR phải bổ sung audio có quyền sử dụng, transcript tham chiếu, manifest codec/sample rate/noise và phép chấm riêng.
