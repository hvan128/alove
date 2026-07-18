# Trạng thái kiểm chứng tích hợp

**Cập nhật:** 2026-07-18

Đọc [Capabilities and Evidence](capabilities-and-evidence.md) để phân biệt **Verified**, **Code-ready**, **Roadmap** và **Out of scope**. File này chỉ ghi provider/runtime evidence; adapter hoặc fixture không tự chứng minh integration live.

| Thành phần | Kiểm chứng không credential | Live credential test | Trạng thái trung thực |
|---|---|---|---|
| Local two-tab call | Unit/component tests | Không cần | Hoạt động cùng browser |
| LiveKit token | Token claims, room scope, TTL, named dispatch | Chưa có project credentials | Code ready, chưa claim room live |
| LiveKit worker | Import, policy, protocol, compile, container source | Chưa đăng nhập LiveKit Cloud | Worker ready, chưa deploy |
| VALSEA RTT | Official message fixtures, PCM guard, partial/final parser | Chưa có `VALSEA_API_KEY` | Mandatory path implemented, chưa đo live |
| VALSEA TTS | Official OpenAI-compatible model/voice config | Chưa có `VALSEA_API_KEY` | Config ready, chưa nghe provider audio |
| OpenAI translation/Auto LLM | `store:false`, timeout/failure tests, guarded Auto config | Key cũ không được dùng | Cần key mới đã rotate |
| Neon | Schema, migration, memory repository, dedupe tests | Chưa có `DATABASE_URL` | Persistence ready, live DB chưa migrate |
| Operator dashboard/catalog/seat | Unit/component + Playwright 6/6 tại `5af9745` | Chưa có operator API/Neon credentials | Memory story verified; production durability chưa claim |
| Vercel web | Build production + health/config | `dpl_9ZZXQxgRgHaJrkXPYg7RYPH2W6Ce` Ready | Public alias hoạt động; không dùng làm voice worker |
| Twilio PSTN | Adapter/fixture ở provider package | Thiếu account, number, public WSS | Không nằm trong demo bắt buộc |
| Zalo audio | File replay seam cũ | Không có raw-call entitlement | Không claim live Zalo |

## Lý do chưa thể live-test provider

- LiveKit: không có project URL/API key/secret hoặc quyền Cloud Agent trong workspace.
- VALSEA: không có sandbox key. Anonymous request chỉ chứng minh auth boundary, không chứng minh STT/TTS.
- Neon: không có connection string nên không thể migrate hoặc query database thật.
- OpenAI: key đã xuất hiện trong hội thoại bị xem là compromised; không lưu, không chạy và phải rotate.
- Twilio/Zalo: demo hiện tại dùng WebRTC; PSTN cần account/số/webhook, Zalo cần quyền raw audio không có trong public contract.

Khi có credential, làm theo smoke test trong [`livekit-valsea-deployment.md`](livekit-valsea-deployment.md) và ghi thêm account mode, region, thời gian final transcript, TTS first-byte và kết quả barge-in vào file này.

## Evidence operator workflow 2026-07-18

- Source: `5af9745` trên `feature/vedi-operations`.
- Command: `pnpm test:e2e`.
- Kết quả: 6 browser tests passed trong Chromium, gồm overflow smoke 390/768/1440 và keyboard vehicle grid.
- Flow: `/operations` → `/admin/catalog` validate/publish → `/staff` + `/call` → inventory → giữ ghế → confirmation.
- Runtime: `OPERATOR_DEMO_MODE=true`, process-level memory store, nhãn `Mô phỏng · không bền vững`.
- Failure behavior đã kiểm tra bằng unit/API: thiếu auth trả 503; role sai 403; seat conflict 409; hold hết hạn 410; catalog revision conflict 409.
- Chưa kiểm chứng: Neon concurrency/rollback, external operator API, LiveKit two-device và VALSEA credentialed audio.

## Evidence bản web production

- Public: `https://ordervoice-vn.vercel.app`
- Unique URL: `https://ordervoice-grq60lmfs-sireals-projects.vercel.app`
- `/api/health`: `{"status":"ok"}`.
- Production `/api/config`: `transport=local`, `livekit=false`, `valsea=false`, `voiceAgent=false`, `persistence=false`, `operatorDemo=false`, `localFallback=true`.
- Browser smoke 390px: hai tab cùng browser gửi hai final, tự điền Sài Gòn → Đà Lạt, 24/07/2026 22:00, 2 khách, Nguyễn Minh Anh, số điện thoại, điểm đón/trả, chuyến và ghế; nhân viên xác nhận mã `VD-240718-3010`.
- Không có framework overlay, page error, horizontal overflow hoặc error log Vercel trong cửa sổ kiểm tra.
- `pnpm audit --prod --audit-level moderate`: không có vulnerability đã biết sau khi nâng Next.js lên 16.2.10 và pin PostCSS 8.5.19.
