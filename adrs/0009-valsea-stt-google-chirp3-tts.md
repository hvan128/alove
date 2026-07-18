# ADR 0009: VALSEA STT và Google Chirp3-HD TTS

## Status

Accepted — 2026-07-18.

## Context

Alove cần nhận tiếng Việt tự nhiên, địa danh và số điện thoại trong cuộc gọi web
lẫn SIP. Provider runtime hiện chỉ nằm trong Python agent; web không proxy audio
và không giữ provider credentials.

## Decision

1. Cascade mặc định dùng `STT_PROVIDER=valsea`; giá trị trống cũng resolve về
   VALSEA, còn provider không hỗ trợ hoặc credential active bị thiếu làm worker
   dừng khởi động. Provider khác chỉ là lựa chọn A/B chủ động có warning.
2. TTS ưu tiên Google Cloud Chirp3-HD, locale `vi-VN`, voice mặc định `Kore`.
3. Speechmatics/OpenAI STT và Cartesia TTS chỉ là lựa chọn A/B cấu hình chủ động
   trong agent, không phải automatic failover hay runtime web riêng.
4. Google service account được mount/read từ secret file hoặc secret manager,
   không commit vào repository và không nhét giá trị JSON vào command line.
5. `agent/valsea_api.py` là HTTP adapter advisory cho annotation; kết quả của nó
   không thay transcript, entity hay booking fact.

## Consequences

- `agent/valsea_stt.py` là implementation VALSEA realtime STT duy nhất cần duy trì;
  `agent/valsea_api.py` chỉ phục vụ HTTP annotation advisory.
- Web chỉ nhận caption qua LiveKit và không biết provider nào đang chạy.
- VALSEA không cung cấp TTS, nên outbound voice luôn cần provider khác.
- Cần đo riêng chất lượng audio SIP 8 kHz, timeout, reconnect và quota đồng thời.
- Đổi provider là thay cấu hình worker và redeploy container; không cần thay API
  booking hay schema dữ liệu.

## Verification

Mỗi release agent phải có unit/compile check, Docker build smoke và một cuộc gọi
staging xác nhận STT, tool calls, TTS cùng persisted audit events hoạt động xuyên
suốt. Cũng phải kiểm tra annotation failure không chặn call và `latency.turn` chỉ
phát best-effort khi đã ghép đủ metric của cùng speech ID.
