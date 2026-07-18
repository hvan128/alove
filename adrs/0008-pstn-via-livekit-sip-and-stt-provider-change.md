# ADR 0008: PSTN qua LiveKit SIP và thay đổi STT provider mặc định

**Status:** Accepted (2026-07-18)
**Supersedes một phần:** ADR 0006 (VALSEA-first, Twilio Media Streams làm telephone adapter đầu tiên)

## Decision

1. Cuộc gọi số điện thoại đi vào hệ thống qua **LiveKit SIP** (inbound trunk +
   dispatch rule tạo room `booking-<id>` và dispatch agent `vedi`), không qua
   adapter Twilio Media Streams riêng. Trunk pilot: Telnyx hoặc Twilio Elastic
   SIP Trunking; đường nâng cấp số VN nội địa là SIP trunk thương mại VN trỏ
   về cùng SIP URI.
2. **VALSEA không còn là ASR bắt buộc.** Người dùng quyết định ngày 2026-07-18
   bỏ ràng buộc VALSEA-first của đề bài cũ. STT mặc định của agent là
   Speechmatics (tiếng Việt), A/B được với OpenAI realtime STT và Gemini Live
   speech-to-speech. Adapter VALSEA (`packages/providers`, `agent/valsea_stt.py`)
   giữ nguyên như legacy seam, không xoá.
3. Transcript/booking persistence nằm phía Next.js (Neon qua Drizzle); agent
   worker không giữ database credentials.

## Rationale

- Kênh web call và kênh điện thoại dùng chung một kiến trúc agent — một worker,
  một booking boundary, một dashboard — thay vì duy trì hai đường media (LiveKit
  và Twilio Media Streams) song song.
- LiveKit SIP xử lý resample narrowband 8 kHz ↔ room audio, đã có noise model
  riêng cho telephony (BVCTelephony), và dispatch rule tạo room đúng prefix
  `booking-` mà toàn hệ thống đã parse.
- Yêu cầu VALSEA đến từ đề bài challenge cũ; sản phẩm chuyển hướng pilot thực tế
  nên chọn provider có sandbox và tiếng Việt kiểm chứng được.

## Consequences

- Adapter Twilio Media Streams trong `apps/api` trở thành legacy seam thứ hai
  (cùng nhóm với VALSEA WS adapter); không đầu tư thêm trừ khi LiveKit SIP fail
  pilot.
- Chưa có cuộc gọi thật: mọi cấu hình SIP nằm trong `docs/pstn-sip-runbook.md`
  và phải chạy tay khi có tài khoản trunk. Không claim "phone live" trước bước 7
  của runbook.
- Chất lượng ASR tiếng Việt trên audio điện thoại phải được đo trong cuộc gọi
  thật đầu tiên và ghi vào `docs/integration-feasibility.md`.
