# Phase 02 — Tầng nghĩa qua `/v1/annotations`

**Mục tiêu:** Ăn trọn tiêu chí "Best Use of VALSEA API" (15%) bằng endpoint semantic,
đồng thời giảm phụ thuộc OpenAI (chạm anti-pattern *"dependent on foreign APIs"*).

**Chặn bởi:** Phase 00

## Tình trạng hiện tại

Tầng nghĩa hoàn toàn là code riêng + OpenAI:

- `packages/core/src/bus-booking.ts:83` — `advanceBookingAgent()` rule-based
- `agent/agent.py:58` — `LLM_PROVIDER = "openai/gpt-4.1"` cho hội thoại
- `packages/providers/src/openai.ts:16` — `proposeOpenAiOrderPatch()`

Rubric ghi thẳng: *"plus any additional VALSEA endpoint used to go from speech to
a workflow-ready output"*. Zero endpoint thứ hai = mất phần lớn 15% này.

## Nguyên tắc thiết kế — quan trọng

**Không** thay `advanceBookingAgent` bằng `/v1/annotations`. Booking xác định phía
server là điểm mạnh kiến trúc của dự án (agent không bịa giá/ghế/mã vé) và là thứ
ADR đã chốt. Vứt nó đi để nhét VALSEA vào là đánh đổi sai.

Thay vào đó, `/v1/annotations` làm **tầng ngữ nghĩa đứng trước** lõi xác định:

```
VALSEA ASR  →  VALSEA /v1/annotations  →  advanceBookingAgent  →  phiếu vé
   (text)       (correction + semantic tags)  (xác thực + tra kho)   (xác định)
```

VALSEA lo phần khó và mờ mà API công khai cam kết: sửa ngôn ngữ/giọng địa phương,
giữ semantic tag cùng span/phrase/meaning. Text đã sửa được đưa vào lõi booking;
tags là bằng chứng/giải thích, không được coi là dữ liệu đã xác thực. Lõi xác định
vẫn tự parse và lo phần phải đúng tuyệt đối: chuyến nào còn ghế, giá bao nhiêu,
mã vé gì. Không tuyên bố API trả entity/intent nếu response thật không có.

Đây cũng là câu chuyện kể trên sân khấu tốt hơn hẳn "chúng em gọi thêm một API".

## Việc phải làm

1. `packages/providers/src/valsea-annotate.ts` — client cho endpoint, schema
   request/response theo đúng kết quả Phase 00 (không đoán trước).
2. Zod contract cho output trong `packages/contracts` — mọi thứ từ ngoài vào đều
   phải qua schema, giống `bookingDraftSchema` đang làm.
3. Adapter đưa corrected text vào `advanceBookingAgent`; semantic tags chỉ là
   context giải thích và không được bypass validation/tra kho.
4. Hiển thị trên `/console` và `/engine`: một panel nhỏ "VALSEA hiểu được gì"
   liệt kê correction + semantic tags, **trước khi** thành phiếu vé. Đây chính là bằng
   chứng trực quan cho cả "Best Use of VALSEA API" lẫn "explainable AI architecture"
   (một deliverable bắt buộc).
5. Feature flag `VALSEA_ANNOTATE_ENABLED` — demo public không key vẫn phải chạy.

## Files

- Tạo: `packages/providers/src/valsea-annotate.ts`
- Tạo: `packages/providers/test/valsea-annotate.test.ts`
- Sửa: `packages/contracts/src/index.ts` (schema mới)
- Sửa: `packages/core/src/bus-booking.ts` (nhận entity gợi ý, vẫn tự xác thực)
- Tạo: `apps/web/src/components/bus-call/understanding-panel.tsx`
- Sửa: `apps/web/src/components/engine/engine-workspace.tsx`

## Validation

- Unit test adapter với payload thật đã lược dữ liệu lấy từ report Phase 00.
- Chạy 3 clip hard-case (Phase 03) qua đường đầy đủ, so phiếu vé có/không có
  `/v1/annotations` — ghi kết quả vào `reports/`.
- Tắt flag → demo vẫn chạy y như cũ.

## Fallback nếu `/v1/annotations` không khả dụng trong sandbox

Không giả vờ có. Hai lựa chọn, theo thứ tự ưu tiên:

1. Dùng semantic tags/corrections trả ngay từ `/v1/audio/transcriptions`, hoặc
   endpoint VALSEA khác mà Phase 00 xác minh (clarification, formatting/subtitles,
   translation…)
   cho một phần workflow thật — subtitle chẳng hạn ăn thẳng vào ví dụ "subtitle file"
   mà brief liệt kê là workflow-ready output.
2. Nếu sandbox chỉ mở ASR: ghi rõ trong docs + slide rằng mình đã probe và
   endpoint semantic chưa khả dụng cho key hiện tại, kèm bằng chứng. Rồi dồn điểm vào
   Workflow-Readiness (Phase 04) và chiều sâu ASR (Phase 01, 03).

Trường hợp 2 vẫn ổn: brief ghi endpoint thứ hai là *optional*, chỉ "Best Use of
VALSEA API" thưởng thêm cho nó.
