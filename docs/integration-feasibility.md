# Đánh giá third party cho VéĐi

**Cập nhật:** 2026-07-18

| Tích hợp | Phù hợp | Quyết định |
|---|---|---|
| LiveKit Cloud | WebRTC hai thiết bị, named agent, TURN managed | Chọn cho pilot; worker đã implement |
| VALSEA | Tiếng Việt RTT STT và TTS, đúng yêu cầu đề bài | Bắt buộc ở worker production |
| OpenAI | Dịch final transcript và LLM tạo câu trả lời ngắn | Downstream có timeout; không thay VALSEA STT |
| Neon | Serverless Postgres hợp Vercel | Lưu final/snapshot/audit; không lưu audio/partial |
| Twilio | PSTN Media Streams có protocol rõ | Để sau Web Call; cần số và account thật |
| Stringee | Hướng thị trường Việt Nam | Chỉ đổi khi xác minh raw media egress và SLA |
| Zalo | Kênh người dùng phổ biến | Không claim live call vì chưa có raw audio entitlement |

## LiveKit

LiveKit đáp ứng đúng demo điện thoại ↔ nhân viên: token server-side, room audio/data và explicit dispatch tới `vedi-booking-agent`. Cloud được ưu tiên cho pilot để tránh tự vận hành TLS, UDP/TURN và NAT. Nếu phải self-host, cần một deployment riêng; Vercel chỉ phục vụ web/token.

Nguồn: [authentication endpoint](https://docs.livekit.io/frontends/build/authentication/endpoint/), [agent dispatch](https://docs.livekit.io/agents/server/agent-dispatch/), [self-hosting](https://docs.livekit.io/transport/self-hosting/).

## VALSEA

RTT dùng `wss://api.valsea.ai/v1/realtime`, Bearer auth, `session.start` với `valsea-rtt`/`vietnamese`, PCM16 mono 16 kHz, `audio.commit`, partial/final và `session.stop`. Worker đợi `session.created` rồi `session.ready` trước khi gửi audio. TTS dùng OpenAI-compatible `/v1/audio/speech`, model `valsea-tts` và voice alias `valsea-neutral`.

Chưa có key nên chưa claim accuracy/latency live. Browser recognition trong fallback được gắn nhãn không phải VALSEA.

Nguồn: [VALSEA RTT](https://valsea.ai/docs/realtime), [VALSEA TTS](https://valsea.ai/docs/api/speech).

## Điện thoại Việt Nam

Twilio Media Streams rõ về μ-law 8 kHz và WebSocket, nhưng cần account, số được phép gọi, webhook HTTPS/WSS và kiểm tra giá/khả năng gọi Việt Nam. Stringee có lợi thế thị trường Việt Nam nhưng chỉ nên thay khi vendor xác nhận raw bidirectional audio stream phù hợp voice agent, codec, latency và consent/recording policy.

Nguồn: [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams), [Twilio Vietnam pricing](https://www.twilio.com/en-us/voice/pricing/vn), [Stringee Call API](https://developer.stringee.com/docs/call-api-overview).

## Zalo

Không có public contract chứng minh một app tùy ý được lấy raw audio từ cuộc gọi Zalo. Vì vậy chỉ giữ hướng replay file có consent hoặc partner program đã xác nhận bằng văn bản. Không dùng nhãn “live Zalo” cho file replay.

Nguồn: [Zalo Developers](https://developers.zalo.me/docs/).

## Bảo mật key

Credential từng dán vào chat không được đưa vào source, log, shell history, `.env` hoặc Vercel. Revoke/rotate trước khi cấp key mới qua secret manager. Web không cần VALSEA/OpenAI secret; hai key đó chỉ đặt ở voice worker.
