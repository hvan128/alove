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
- Docs công khai:
  - `https://valsea.ai/docs/api/transcribe`
  - `https://valsea.ai/docs/api/annotate`
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
   multilingual.
5. Ghi lại các endpoint workflow-ready khác trong docs (`clarifications`,
   `formatting`, translation, diarization), nhưng không gọi endpoint tốn credit nếu
   không cần cho quyết định Phase 01/02.

## Đầu ra

`plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md` — bảng
endpoint × status × schema thật × dùng được cho gì. **Không chứa API key.**

## Validation

- Mỗi endpoint có ít nhất một response thật dán vào report (đã lược PII).
- Ghi rõ timestamp probe và tên model/engine server trả về.

## Rủi ro

- Endpoint REST được docs công bố nhưng có thể chưa mở cho sandbox/thiếu credits →
  Phase 01 rút gọn còn phần sửa
  cấu hình, và ta ghi rõ trong docs rằng realtime WS **là** đường ASR của VALSEA
  mà mình dùng, kèm bằng chứng probe cho thấy REST không khả dụng. Giám khảo chấp
  nhận được lập luận đó khi có bằng chứng; không chấp nhận được khi mình im lặng.
- Nếu sandbox khác docs, hỏi Val (founder, có mặt qua Discord/Zalo suốt 48h) và ghi
  câu trả lời vào report.
