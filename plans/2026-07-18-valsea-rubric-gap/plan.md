---
title: Đóng lỗ hổng rubric VALSEA — Vietnam AI Innovation Challenge
status: in-progress
priority: P1
effort: high
branch: feat/livekit-agent
tags: [valsea, rubric, hackathon]
created: 2026-07-18
progress: 6/7 phases
---

# Đóng lỗ hổng rubric VALSEA — Vietnam AI Innovation Challenge

**Status:** In progress — Phase 00–03 và 05–06 hoàn tất; Phase 04 còn bằng chứng deploy/manual
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
| [01](phase-01-valsea-compliance.md) | VALSEA-first provider config + maintainer batch evidence | 00 | 1–2h |
| [02](phase-02-valsea-understand.md) | Advisory annotation event qua `/v1/annotations` | 01 | 3–4h |
| [03](phase-03-hard-case-evidence.md) | Synthetic hard-case harness + trang `/evidence` mới | 01 | 4–5h |
| [04](phase-04-workflow-output.md) | BookingSnapshot JSON + QR verification + server webhook | — | 4–5h |
| [05](phase-05-latency-surface.md) | `latency.turn` qua current Alove event contract | — | 2–3h |
| [06](phase-06-cleanup-and-docs.md) | Canonical docs/specs + rubric checklist theo bằng chứng | 01–05 | 2–3h |

Phase 03, 04, 05 **không phụ thuộc** Phase 00–02 → chạy song song được nếu API
key về muộn. Đây là lý do xếp chúng tách khỏi nhánh VALSEA.

## Tiến độ phase

- [x] Phase 00 — probe sandbox, report live, security review và clean-install verification
- [x] Phase 01 — VALSEA-first provider config + maintainer batch evidence
- [x] Phase 02 — advisory semantic annotation trên live call
- [x] Phase 03 — synthetic hard-case harness + trang `/evidence` mới
- [ ] Phase 04 — workflow output
- [x] Phase 05 — latency surface
- [x] Phase 06 — cleanup, docs và rubric checklist

## Phụ thuộc ngoài

- **API key sandbox VALSEA** — đã có trong `.env` gốc (xác minh không rỗng ngày
  2026-07-18; không ghi giá trị vào plan/report).
- **Docs công khai VALSEA** — đã xác minh tại `https://valsea.ai/docs/api`,
  `https://valsea.ai/docs/api/transcribe`, `https://valsea.ai/docs/api/annotate`
  và `https://valsea.ai/docs/realtime`. Phase 00 vẫn probe live vì docs không thay
  thế bằng chứng credential/credits/schema thật của sandbox.
- **Clip audio hard-case** — Phase 03 sẽ chỉ commit fixture synthetic/no-PII có
  provenance. Chưa có giọng vùng miền thật; checklist phải giữ mục đó ở trạng thái mở.

## Acceptance criteria

Plan coi là xong khi tất cả đúng:

- [x] Ít nhất **2 endpoint VALSEA** khác nhau được gọi thật trong đường live/evidence,
      có log/timestamp chứng minh (không phải mock).
- [x] `/evidence` chạy được **3 clip synthetic hard-case** commit trong repo, hiện diff
      Alove↔baseline và số WER cho từng clip.
- [x] Baseline Whisper chạy **có** `language: "vi"` — thắng một đối chứng đã được
      ưu ái, không phải đối chứng bị làm yếu.
- [ ] Phiếu xác nhận sinh QR tới flow verification có code + phone, tải JSON đúng
      `bookingSnapshotSchema`, và webhook server-side có idempotency khi được cấu hình.
- [x] Latency mỗi lượt (eou/ttft/ttfb) hiện trên `/console`, không chỉ trong log.
- [x] `agent/agent.py` mặc định `STT_PROVIDER=valsea` — thiếu `.env` không làm
      demo âm thầm chạy sai engine.
- [x] `docs/rubric-checklist.md` map từng tiêu chí ↔ bằng chứng ↔ file:line và
      không đánh ✅ cho bằng chứng giọng vùng miền chưa có.

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
- `AGENTS.md` coi dated plan là historical notes. Mọi thay đổi runtime Phase 01–06
  phải theo re-scout report `reports/260718-2245-alove-rescout.md`, không khôi phục
  module cũ chỉ vì chúng còn được nhắc trong lịch sử.
