# Phase 01 — Hợp lệ hoá VALSEA

**Mục tiêu:** Không để mất điểm mandatory vì lý do hình thức hoặc vì một dòng default sai.

**Chặn bởi:** Phase 00

## 1.1 — Sửa default `STT_PROVIDER` (làm trước, 5 phút)

`agent/agent.py:57` hiện là:

```python
STT_PROVIDER = os.getenv("STT_PROVIDER", "speechmatics").lower()
```

Thiếu `.env` → agent chạy Speechmatics, mất luôn tiêu chí mandatory mà không ai
nhận ra trên sân khấu. `agent/.env.example:27` đã ghi `valsea`, nên default đang
mâu thuẫn với chính cấu hình mẫu.

Đổi default thành `"valsea"`. Thêm log cảnh báo lúc khởi động khi provider được
resolve ra thứ khác VALSEA, để nếu có A/B thì người chạy demo vẫn thấy.

## 1.2 — Adapter REST `/v1/audio/transcriptions`

**Chỉ làm nếu Phase 00 xác nhận endpoint tồn tại.**

File mới: `packages/providers/src/valsea-batch.ts`

```
transcribeWithValsea(audio: File, opts: { language?: string }): Promise<ValseaBatchResult>
```

- Giữ hoàn toàn tách khỏi `valsea.ts` (realtime). Đường cuộc gọi live **không**
  đi qua REST — không thêm độ trễ vào `/console`.
- Gửi model `valsea-transcribe`, `response_format=verbose_json`, correction + tags;
  trả text, raw transcript, detected languages, corrections, semantic tags và
  metadata timing nếu sandbox thật sự trả về để Phase 03 dùng.
- Map lỗi theo đúng kiểu `valsea.ts` đang làm: message tiếng Việt, không nuốt lỗi.

Đấu vào `/engine`: nhánh upload file dùng REST batch, nhánh ghi mic giữ realtime WS.
Ăn được cả hai: hợp lệ tuyệt đối với brief, và trình bày được rằng mình làm chủ cả
hai chế độ — đúng cái "depth and correctness of VALSEA ASR usage" mà rubric đo.

## 1.3 — Baseline công bằng

`packages/providers/src/openai.ts:40-47` đang cố ý chạy Whisper **không** hint
tiếng Việt (comment dòng 36-39 giải thích lý do).

Lập luận đó hợp lý về mặt kỹ thuật nhưng **thua trên sân khấu**: giám khảo kỹ tính
sẽ thấy so sánh giữa một engine có `language` hint và một engine bị bỏ hint là
không công bằng, và toàn bộ bằng chứng Outcome 2 mất giá trị.

Đổi thành `language: 'vi'`. Thắng một baseline đã được ưu ái mới là bằng chứng
đứng vững. Sửa luôn comment cho khớp lý do mới.

Cân nhắc thêm: hiện baseline là REST batch còn Alove là WS streaming — sau 1.2 thì
nhánh upload file của cả hai đều là REST batch, so sánh trở nên cùng điều kiện.

## Files

- Sửa: `agent/agent.py` (dòng 57 + log khởi động)
- Sửa: `packages/providers/src/openai.ts` (dòng 40-47)
- Sửa: `packages/providers/src/index.ts` (export mới)
- Sửa: `apps/web/src/components/engine/engine-workspace.tsx` (chọn nhánh REST/WS)
- Tạo: `packages/providers/src/valsea-batch.ts`
- Tạo: `packages/providers/test/valsea-batch.test.ts`
- Tạo: `apps/web/src/app/api/engine/valsea-batch/route.ts`

## Validation

- `pnpm --filter @ordervoice/providers test`
- Chạy `/engine` với một file thật: cả hai panel ra text, không panel nào lỗi.
- Khởi động agent **không** có `.env` → log phải nói rõ đang dùng VALSEA.

## Rollback

Mỗi mục 1.1/1.2/1.3 độc lập, revert riêng được. 1.2 là thứ duy nhất thêm bề mặt
API mới; nếu endpoint chập chờn thì cho `/engine` fallback về realtime WS và ghi
lý do lên UI thay vì để trắng panel.
