# Khả năng tích hợp third party cho VéĐi

**Kiểm tra lại:** 2026-07-18

Bảng này tách rõ code seam, anonymous connectivity và live credential test. Bản Web Call public không cần third party và không mô phỏng thành công provider.

| Tích hợp | Đã có | Chưa chứng minh live | Quyết định |
|---|---|---|---|
| Browser Web Call | Hai phía, preset/text, optional STT/TTS | Hai thiết bị qua mạng | Dùng cho demo public |
| LiveKit | Kiến trúc/token/room pattern đã review từ project-4; token route + agent worker đã có trong repo | Cuộc gọi hai thiết bị trên production | Pilot recommended cho multi-device |
| LiveKit SIP (PSTN) | Trunk/dispatch templates + runbook (`pstn-sip-runbook.md`), agent nhận SIP participant | Thiếu tài khoản trunk (Telnyx/Twilio) và cuộc gọi thật | Kênh điện thoại chính theo ADR 0008 |
| VALSEA | Realtime adapter + fixture protocol tests | Thiếu sandbox key | Không còn bắt buộc (ADR 0008); giữ làm legacy seam |
| OpenAI | Adapter fallback phát triển | Key dán trong chat không được dùng | Chỉ opt-in fallback |
| Twilio | Media Streams μ-law adapter + hooks | Thiếu account, number, public WSS | Pilot PSTN nếu cần số thật |
| Stringee | Đã đánh giá là lựa chọn Việt Nam | Raw server media stream chưa xác minh công khai | Hỏi commercial/support trước khi đổi |
| Zalo | Replay file có consent trong code cũ | Không có entitlement raw call audio | Không claim live Zalo call |
| Neon | Drizzle boundary | Thiếu `DATABASE_URL` | Bật cho pilot persistence |
| Vercel | Next.js deploy | Không dùng làm Agent worker dài hạn | Host public web/token route |

## LiveKit

LiveKit phù hợp khi khách và nhân viên cần tham gia từ hai browser. Token phải được ký server-side. Agent worker là process riêng kết nối outbound WebSocket và giữ job sống; self-host media server cần TLS/TURN/network setup. Không có credentials nên không thể test room hoặc deploy Agent thành công trong lần này.

Recommended: LiveKit Cloud cho pilot, Next.js token endpoint trên Vercel, Agent worker trên host container lâu dài. Chi tiết: [`livekit-bus-pilot.md`](livekit-bus-pilot.md).

Nguồn: [LiveKit authentication endpoint](https://docs.livekit.io/frontends/build/authentication/endpoint/), [self-hosting](https://docs.livekit.io/transport/self-hosting/), [Agent deployments](https://docs.livekit.io/deploy/custom/deployments/).

## VALSEA và OpenAI

**Cập nhật 2026-07-18 (ADR 0008):** VALSEA không còn là provider bắt buộc — người dùng đã bỏ ràng buộc đề bài cũ. STT mặc định của agent là Speechmatics (tiếng Việt), A/B với OpenAI realtime STT và Gemini Live. Adapter VALSEA giữ nguyên làm legacy seam; đoạn dưới chỉ còn giá trị lịch sử.

Adapter hiện có xử lý PCM16 16 kHz mono và partial/final event fixture. Anonymous request chỉ chứng minh endpoint có auth boundary, không chứng minh transcript. Nếu quay lại VALSEA cần `VALSEA_API_KEY` sandbox để chạy live smoke với audio có consent.

OpenAI là fallback phát triển, không được dùng để claim VALSEA compliance. Credential từng xuất hiện trong chat không được copy vào source, command, env hoặc Vercel. Chủ key cần revoke/rotate.

Nguồn: [VALSEA Realtime](https://valsea.ai/docs/realtime), [OpenAI voice agents](https://platform.openai.com/docs/guides/voice-agents).

## Điện thoại tại Việt Nam

### Twilio

Twilio Media Streams có protocol rõ, base64 μ-law 8 kHz qua secure WebSocket, và adapter cũ đã có fixture tests. Live PSTN cần account SID/token, số được provision/verified, webhook HTTPS và public WSS. Test credentials không chứng minh được Media Streams audio callback.

Nguồn: [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams), [test credentials](https://www.twilio.com/docs/iam/test-credentials), [Vietnam Voice pricing](https://www.twilio.com/en-us/voice/pricing/vn).

### Stringee

Stringee có Call API/Web SDK hướng thị trường Việt Nam và có thể thuận lợi hơn về số/gọi nội địa. Tài liệu public đã review chưa xác lập một raw server audio stream tương đương Twilio Media Streams cho voice-agent pipeline. Vì vậy chưa thay adapter chỉ dựa trên giả định. Cần xác nhận entitlement, audio egress format, latency, recording consent và pricing với Stringee trước pilot.

Nguồn: [Stringee Call API overview](https://developer.stringee.com/docs/call-api-overview).

## Zalo audio

Không tìm thấy public contract đảm bảo app được truy cập raw audio của cuộc gọi Zalo tùy ý. Hướng an toàn vẫn là file replay do người vận hành chọn và có consent, hoặc chương trình partner/OA được xác nhận bằng văn bản. Không dùng chữ “live Zalo” cho replay.

Nguồn: [Zalo Developers](https://developers.zalo.me/docs/).

## Neon

Demo hiện tại dùng state trong browser để không phụ thuộc credential. Neon nên lưu final transcript, booking snapshot và audit transition trong pilot; không lưu partial transcript hoặc raw audio mặc định. Live database test bị chặn vì chưa có `DATABASE_URL`.

Nguồn: [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver).

## Checklist khi có credentials

1. Rotate mọi key từng chia sẻ ngoài secret manager.
2. Cấp STT/TTS credentials (Speechmatics/OpenAI/Gemini/Google TTS) trong encrypted environment.
3. Deploy token endpoint và Agent worker; test room giữa hai thiết bị thật.
4. Chạy Vietnamese STT/TTS sample có consent, đo transcript final latency và barge-in.
5. Tạo tài khoản trunk (Telnyx/Twilio), chạy `docs/pstn-sip-runbook.md` đủ 7 bước; đo chất lượng ASR trên audio điện thoại. Đường số VN nội địa: xác nhận SIP trunk thương mại VN (FPT/CMC/iTel…).
6. Bật Neon migration (`cd apps/web && pnpm exec drizzle-kit migrate`); xác nhận duplicate final/confirm không tạo booking thứ hai.
7. Ghi ngày, account mode, region, latency và outcome vào file này trước khi đổi nhãn UI.
