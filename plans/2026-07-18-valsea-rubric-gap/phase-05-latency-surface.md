# Phase 05 — Đưa latency lên UI

**Mục tiêu:** Brief ghi *"aim near-real-time (a few seconds per utterance)"* và
Outcome 1 đo *"time-to-output vs. a manual baseline, timed on stage"*. Số đã đo rồi,
chỉ đang nằm sai chỗ.

**Không chặn bởi phase nào.** Rẻ nhất trong tất cả các phase.

## Tình trạng hiện tại

`agent/agent.py:848-869` đã đo đầy đủ và chuẩn xác:

- `eou` — từ lúc khách ngừng nói tới lúc chốt lượt
- `ttft` — từ chốt lượt tới chữ đầu của mô hình
- `ttfb` — từ có chữ tới mẫu âm thanh đầu

Nhưng cả ba chỉ đi vào `logger.info`. Không data-channel, không DB, không UI nào
đọc được. Trên sân khấu chúng vô hình.

Trong khi đó `EVENTS_TOPIC = "alove-events"` (`agent/agent.py:117`) đã tồn tại và
`booking.update` đã chạy qua đó (`agent/agent.py:620, 667, 736`). Đường ống có sẵn.

## Việc phải làm

1. `agent/agent.py` — trong `_on_metrics`, ngoài `logger.info` thì publish thêm
   `{"type": "latency.turn", "eou": …, "ttft": …, "ttfb": …, "speech": …}` qua
   `EVENTS_TOPIC`. Gom theo `speech_id` để ba chặng của cùng một lượt về chung một
   sự kiện thay vì ba sự kiện rời.
2. Contract Zod cho `latency.turn` trong `packages/contracts`.
3. `livekit-call.tsx` — nhận và forward lên workspace, cạnh chỗ đang xử lý
   `booking.update` (dòng 184-193).
4. `call-stage.tsx` — hiện chỉ số nhỏ, kín đáo, gần chỉ báo trạng thái agent
   (dòng 105-117). Dạng "1,2s" cho tổng mỗi lượt, hover ra chi tiết ba chặng.

## Nguyên tắc trình bày

Hiện **tổng ba chặng** làm số chính, không hiện riêng một chặng đẹp nhất. Comment
tại `agent/agent.py:843` đã ghi đúng: *"Độ trễ mỗi lượt là tổng của ba chặng, không
phải riêng chặng nào"* — giữ đúng tinh thần đó trên UI. Khoe `ttft=200ms` trong khi
người dùng đợi 2,5s là tự bịa.

Không làm cái đồng hồ to đùng nhấp nháy. Một con số nhỏ, luôn hiện, đủ để giám khảo
liếc thấy trong suốt cuộc gọi — thuyết phục hơn nhiều một biểu đồ hào nhoáng.

## Files

- Sửa: `agent/agent.py` (`_on_metrics`, ~dòng 848-869)
- Sửa: `packages/contracts/src/index.ts`
- Sửa: `apps/web/src/components/bus-call/livekit-call.tsx`
- Sửa: `apps/web/src/components/bus-call/call-stage.tsx`
- Sửa: `apps/web/src/components/bus-call/bus-call-workspace.tsx` (state)

## Validation

- Chạy một cuộc gọi LiveKit thật, đối chiếu số trên UI với `[latency]` trong log
  worker — phải khớp.
- Nhánh demo không LiveKit: không có số → UI ẩn hẳn chỉ số, không hiện "0ms".

## Rủi ro

- `_on_metrics` chạy trong hot path; publish_data là async. Bọc try/except và
  không bao giờ để lỗi publish làm hỏng cuộc gọi — giống cách `call-store.ts:11-13`
  đang nuốt lỗi DB có chủ ý.
