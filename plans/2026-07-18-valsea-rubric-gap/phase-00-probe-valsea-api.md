---
title: Phase 00 — Probe API sandbox VALSEA
status: completed
priority: P1
effort: small
plan: 2026-07-18-valsea-rubric-gap
completed: 2026-07-18
---

# Phase 00 — Probe API sandbox VALSEA

**Mục tiêu:** Xác minh docs công khai khớp sandbox thật trước khi viết adapter.
Phase 01 và 02 đều dựa trên kết quả phase này; viết code trước khi probe là đoán mò.

## Vì sao cần

Brief mô tả `POST /v1/asr/transcribe` và `POST /v1/understand`, nhưng API Reference
công khai ngày 2026-07-18 ghi `POST /v1/audio/transcriptions` và các endpoint text
như `/v1/annotations`, `/v1/clarifications`, `/v1/formatting`. Repo hiện chỉ verify
được `wss://api.valsea.ai/v1/realtime` (probe live 2026-07-18, ghi tại
`agent/valsea_stt.py:10-31`). Cần ghi rõ chênh lệch giữa brief và API hiện hành.

Tiền lệ trong repo: giao thức realtime từng bị đoán sai và phải sửa lại toàn bộ
(xem `adrs/0009-valsea-stt-google-chirp3-tts.md`, mục Consequences). Không lặp lại.

## Cần có trước

- `VALSEA_API_KEY` sandbox — đã có, không rỗng trong `.env` gốc
- WAV fixture phải được xác nhận rõ bằng
  `VALSEA_PROBE_FIXTURE_PROVENANCE=synthetic-no-pii`; script từ chối mọi giá trị
  khác và không suy đoán provenance từ tên file
- Docs công khai:
  - `https://valsea.ai/docs/api/transcribe`
  - `https://valsea.ai/docs/api/annotate`
  - `https://valsea.ai/docs/api/clarify`
  - `https://valsea.ai/docs/api/format`
  - `https://valsea.ai/docs/api/translate`
  - `https://valsea.ai/docs/realtime`

## Việc phải làm

Viết `scripts/probe-valsea-endpoints.ts` (chạy bằng `tsx`, không commit output có key):

1. `POST https://api.valsea.ai/v1/audio/transcriptions` với một file WAV 16 kHz
   mono, model `valsea-transcribe`, language `vietnamese`,
   `response_format=verbose_json`, `enable_correction=true`, `enable_tags=true`.
   Ghi lại status, response shape, `detected_languages`, corrections, semantic tags,
   word timestamps và các response headers không nhạy cảm.
2. `POST https://api.valsea.ai/v1/annotations` với transcript đặt vé tiếng Việt có
   code-switch, model `valsea-annotate`, language `vietnamese`,
   `response_format=verbose_json`. Ghi lại `text`, `raw_text`,
   `accent_corrections`, `semantic_tags`, `annotations`.
3. Probe hai path ghi trong brief (`/v1/asr/transcribe`, `/v1/understand`) bằng
   request tối thiểu không chứa PII để ghi status; không dùng chúng trong code nếu
   docs không công bố hoặc sandbox không xác nhận.
4. Thử realtime theo các cấu hình docs công bố: `model: "valsea-auto"` không
   `language`; `model: "valsea-rtt", language: "vietnamese"`; và một negative
   probe `language: ["vietnamese", "english"]`. Ghi response thay vì suy đoán về
   multilingual. Với Node, credential chỉ đi trong `Authorization: Bearer ...`
   ở WebSocket handshake; không đặt API key trong query string.
5. Ghi lại các endpoint workflow-ready khác trong docs (`clarifications`,
   `formatting`, translation, diarization) trong inventory tĩnh với trạng thái
   `not called`, link docs và lý do chưa gọi; không gọi endpoint tốn credit nếu
   không cần cho quyết định Phase 01/02.
6. Trước request đầu tiên, xác thực fixture là RIFF/WAVE PCM, 16-bit, 16 kHz,
   mono và có `data` chunk không rỗng. Report không ghi local filename.
7. Lược credential, credit balance/remaining, phone và email cả lúc capture lẫn
   lúc render report; giữ `x-credits-used` để làm bằng chứng usage.

## Đầu ra

`plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md` — bảng
endpoint × status × schema thật × dùng được cho gì, cộng inventory tĩnh được phân
biệt rõ với probe live. **Không chứa API key, PII, credit balance hoặc local
fixture filename.**

## Validation

- Mỗi endpoint đã gọi có ít nhất một response thật dán vào report (đã lược PII);
  endpoint chỉ inventory phải ghi rõ `not called`, không có response giả.
- Ghi rõ timestamp probe và tên model/engine server trả về.

## Checklist hoàn tất

- [x] Probe live `/v1/audio/transcriptions` bằng WAV synthetic PCM16 16 kHz mono.
- [x] Probe live `/v1/annotations` và lưu schema thật đã redaction.
- [x] Ghi response thật cho hai path trong brief (`404`) và ba cấu hình realtime.
- [x] Xác minh `valsea-auto`, `valsea-rtt + vietnamese`, engine `valsea-4`.
- [x] Xác minh language array trả `INVALID_MESSAGE`; không tuyên bố hỗ trợ sai.
- [x] Inventory clarification, formatting, translation và diarization (`not called`).
- [x] Bắt buộc provenance synthetic/no-PII, kiểm WAV và auth WebSocket bằng header.
- [x] Test 10/10; tester gate 77/77; code review 9.3/10; domain-risk PASS.
- [x] Secret, balance, PII, local filename và clean-install dependency checks pass.
- `pnpm exec vitest run scripts/probe-valsea-endpoints.test.ts` pass cho redaction,
  provenance và WAV parsing; strict standalone TypeScript compile pass.

## Rủi ro

- Endpoint REST được docs công bố nhưng có thể chưa mở cho sandbox/thiếu credits →
  Phase 01 rút gọn còn phần sửa
  cấu hình, và ta ghi rõ trong docs rằng realtime WS **là** đường ASR của VALSEA
  mà mình dùng, kèm bằng chứng probe cho thấy REST không khả dụng. Giám khảo chấp
  nhận được lập luận đó khi có bằng chứng; không chấp nhận được khi mình im lặng.
- Nếu sandbox khác docs, hỏi Val (founder, có mặt qua Discord/Zalo suốt 48h) và ghi
  câu trả lời vào report.
