# Đóng lỗ hổng rubric VALSEA — Vietnam AI Innovation Challenge

**Status:** Reviewed — đã có key + docs công khai, chờ chạy probe Phase 00
**Ngày lập:** 2026-07-18
**Vertical đã chốt:** Tổng đài nhà xe (Mai Anh) → phiếu đặt vé có thể thực thi

## Bối cảnh

Repo đã có VALSEA realtime ASR chạy thật, booking xác định phía server, DB audit,
dashboard live, LiveKit + PSTN seam. Đối chiếu rubric của brief thì phần hụt không
nằm ở "có chạy AI thật hay không" mà ở **bằng chứng trình bày được** và **độ phủ
API của VALSEA**.

Bốn khoản mất điểm lớn nhất:

1. Chỉ dùng một endpoint VALSEA (`wss://.../v1/realtime`). Brief dùng tên
   `/v1/asr/transcribe`, nhưng docs công khai hiện tại xác nhận endpoint batch là
   `/v1/audio/transcriptions`; repo chưa chạm endpoint này lẫn `/v1/annotations`
   (ăn thẳng vào tiêu chí "Best Use of VALSEA API" 15%).
2. Multilingual đồng thời bị brief đánh dấu **Mandatory** nhưng engine đang khoá
   cứng một ngôn ngữ mỗi session.
3. Phiếu vé chỉ là pixel — không export, không tích hợp ra hệ ngoài
   ("Workflow-Readiness" 15%).
4. Không có audio hard-case nào trong repo, không WER, không diff — chạm
   anti-pattern *"only works with clean/ideal data"*.

## Các phase

| Phase | Nội dung | Chặn bởi | Ước lượng |
|---|---|---|---|
| [00](phase-00-probe-valsea-api.md) | Probe API sandbox — xác minh endpoint nào thật sự tồn tại | — | 30–60p |
| [01](phase-01-valsea-compliance.md) | Hợp lệ hoá VALSEA: REST transcribe + sửa default cấu hình | 00 | 2–3h |
| [02](phase-02-valsea-understand.md) | Tầng nghĩa qua `/v1/annotations` | 00 | 3–4h |
| [03](phase-03-hard-case-evidence.md) | Bằng chứng hard-case ở `/engine`: fixture, diff, WER, nhãn accent | — | 4–5h |
| [04](phase-04-workflow-output.md) | Output thực thi được: QR thật, export JSON, webhook | — | 3–4h |
| [05](phase-05-latency-surface.md) | Đưa latency đã đo lên UI | — | 1–2h |
| [06](phase-06-cleanup-and-docs.md) | Dọn code chết, cập nhật roadmap, checklist rubric | 01–05 | 2h |

Phase 03, 04, 05 **không phụ thuộc** Phase 00–02 → chạy song song được nếu API
key về muộn. Đây là lý do xếp chúng tách khỏi nhánh VALSEA.

## Phụ thuộc ngoài

- **API key sandbox VALSEA** — đã có trong `.env` gốc (xác minh không rỗng ngày
  2026-07-18; không ghi giá trị vào plan/report).
- **Docs công khai VALSEA** — đã xác minh tại `https://valsea.ai/docs/api`,
  `https://valsea.ai/docs/api/transcribe`, `https://valsea.ai/docs/api/annotate`
  và `https://valsea.ai/docs/realtime`. Phase 00 vẫn probe live vì docs không thay
  thế bằng chứng credential/credits/schema thật của sandbox.
- **Clip audio hard-case** — Phase 03 cần 3 clip (giọng vùng miền, code-switch, điện thoại nhiễu).
  Tự thu được nếu bộ mẫu của VALSEA về muộn.

## Acceptance criteria

Plan coi là xong khi tất cả đúng:

- [ ] Ít nhất **2 endpoint VALSEA** khác nhau được gọi thật trong đường chạy demo,
      có log/timestamp chứng minh (không phải mock).
- [ ] `/engine` chạy được **3 clip hard-case** commit trong repo, hiện diff
      Alove↔baseline và số WER cho từng clip.
- [ ] Baseline Whisper chạy **có** `language: "vi"` — thắng một đối chứng đã được
      ưu ái, không phải đối chứng bị làm yếu.
- [ ] Phiếu vé xác nhận sinh QR quét được bằng điện thoại + tải được JSON đúng
      `bookingDraftSchema` + bắn được webhook ra endpoint ngoài.
- [ ] Latency mỗi lượt (eou/ttft/ttfb) hiện trên `/console`, không chỉ trong log.
- [ ] `agent/agent.py` mặc định `STT_PROVIDER=valsea` — thiếu `.env` không làm
      demo âm thầm chạy sai engine.
- [ ] `docs/rubric-checklist.md` map từng tiêu chí ↔ bằng chứng ↔ file:line.

## Điều kiện dừng (giữ nguyên từ pilot roadmap)

Không gọi một integration là "live" trước khi có credential test thật, timestamp,
deployment ID, latency và bằng chứng lỗi. Demo public phải tiếp tục chạy không key.

## Rủi ro đã biết

- `/v1/understand` không có trong API Reference công khai ngày 2026-07-18.
  Phase 02 dùng endpoint được tài liệu hoá `/v1/annotations`; Phase 00 vẫn ghi lại
  status của path trong brief để có bằng chứng nếu giám khảo hỏi.
- VALSEA có thể không hỗ trợ multilingual đồng thời thật. Nếu vậy: **không giả vờ có**.
  Ghi rõ giới hạn trên UI và chứng minh code-switch hoạt động bên trong session
  `vietnamese`. Trung thực về giới hạn ghi điểm cao hơn là một tuyên bố không đứng vững.
- Thêm REST call vào đường realtime có thể tăng độ trễ — Phase 01 giữ hai nhánh
  tách biệt, realtime không đi qua REST.
