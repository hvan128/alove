# ADR 0009: VALSEA STT và Google Chirp3-HD TTS

## Status

Accepted — 2026-07-18.

## Context

Alove cần nhận tiếng Việt tự nhiên, địa danh và số điện thoại trong cuộc gọi web
lẫn SIP. Provider runtime hiện chỉ nằm trong Python agent; web không proxy audio
và không giữ provider credentials.

## Decision

1. Cascade mặc định dùng `STT_PROVIDER=valsea`.
2. TTS ưu tiên Google Cloud Chirp3-HD, locale `vi-VN`, voice mặc định `Kore`.
3. Speechmatics/OpenAI STT và Cartesia TTS chỉ là fallback cấu hình trong agent,
   không phải runtime web hoặc `/engine` riêng.
4. Google service account được mount/read từ secret file hoặc secret manager,
   không commit vào repository và không nhét giá trị JSON vào command line.

## Consequences

- `agent/valsea_stt.py` là implementation VALSEA duy nhất cần duy trì.
- Web chỉ nhận caption qua LiveKit và không biết provider nào đang chạy.
- VALSEA không cung cấp TTS, nên outbound voice luôn cần provider khác.
- Cần đo riêng chất lượng audio SIP 8 kHz, timeout, reconnect và quota đồng thời.
- Đổi provider là thay cấu hình worker và redeploy container; không cần thay API
  booking hay schema dữ liệu.

## Verification

Mỗi release agent phải có unit/compile check, Docker build smoke và một cuộc gọi
staging xác nhận STT, tool calls, TTS cùng persisted audit events hoạt động xuyên suốt.
