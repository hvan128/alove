# Trạng thái kiểm chứng tích hợp

**Cập nhật:** 2026-07-18

| Thành phần | Kiểm chứng không credential | Live credential test | Trạng thái trung thực |
|---|---|---|---|
| Local two-tab call | Unit/component tests | Không cần | Hoạt động cùng browser |
| LiveKit token | Token claims, room scope, TTL, named dispatch | Chưa có project credentials | Code ready, chưa claim room live |
| LiveKit worker | Import, policy, protocol, compile, container source | Chưa đăng nhập LiveKit Cloud | Worker ready, chưa deploy |
| VALSEA RTT | Official message fixtures, PCM guard, partial/final parser | Chưa có `VALSEA_API_KEY` | Mandatory path implemented, chưa đo live |
| VALSEA TTS | Official OpenAI-compatible model/voice config | Chưa có `VALSEA_API_KEY` | Config ready, chưa nghe provider audio |
| OpenAI translation/Auto LLM | `store:false`, timeout/failure tests, guarded Auto config | Key cũ không được dùng | Cần key mới đã rotate |
| Neon | Schema, migration, memory repository, dedupe tests | Chưa có `DATABASE_URL` | Persistence ready, live DB chưa migrate |
| Vercel web | Local production build | Deploy cần chạy lại sau thay đổi | Không dùng làm voice worker |
| Twilio PSTN | Adapter/fixture ở provider package | Thiếu account, number, public WSS | Không nằm trong demo bắt buộc |
| Zalo audio | File replay seam cũ | Không có raw-call entitlement | Không claim live Zalo |

## Lý do chưa thể live-test provider

- LiveKit: không có project URL/API key/secret hoặc quyền Cloud Agent trong workspace.
- VALSEA: không có sandbox key. Anonymous request chỉ chứng minh auth boundary, không chứng minh STT/TTS.
- Neon: không có connection string nên không thể migrate hoặc query database thật.
- OpenAI: key đã xuất hiện trong hội thoại bị xem là compromised; không lưu, không chạy và phải rotate.
- Twilio/Zalo: demo hiện tại dùng WebRTC; PSTN cần account/số/webhook, Zalo cần quyền raw audio không có trong public contract.

Khi có credential, làm theo smoke test trong [`livekit-valsea-deployment.md`](livekit-valsea-deployment.md) và ghi thêm account mode, region, thời gian final transcript, TTS first-byte và kết quả barge-in vào file này.
