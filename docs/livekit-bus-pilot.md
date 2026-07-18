# LiveKit bus-ticket pilot và review project-4

**Ngày review:** 2026-07-18  
**Cập nhật:** 2026-07-18 — đã port luồng agent LiveKit từ project-4 vào repo này.  
**Trạng thái public demo:** Web Call cùng trình duyệt (mặc định, zero-key). LiveKit bật bằng env, chưa chạy thật vì workspace không có credentials.

## Trạng thái

Luồng agent LiveKit đã được port và nối vào booking core (xem "Đã triển khai" bên dưới).
Nó **tắt theo mặc định**: chỉ khi `NEXT_PUBLIC_LIVEKIT_URL` có giá trị thì `/console`
(chế độ Agent tự động) mới chuyển transport sang LiveKit; bỏ trống thì demo in-browser
zero-key giữ nguyên, nên bản public đang deploy không bị ảnh hưởng.

Lý do giữ fallback thay vì thay cứng:

- LiveKit room cần URL, API key/secret và token endpoint; Agent còn cần một worker riêng.
- Self-host media server cần TLS, TURN/network ports và vận hành realtime, không phải một Vercel Function đơn lẻ.
- Agent worker kết nối outbound WebSocket đến LiveKit và phải giữ tiến trình sống trong suốt job.
- Zero-key demo phải chạy ổn định cả khi mic/STT không được trình duyệt hỗ trợ.

## Điều học từ project-4

Các pattern hữu ích đã đọc và đưa vào quyết định:

1. `src/app/api/livekit/token/route.ts` giữ API secret server-side và cấp token ngắn hạn theo room/participant.
2. `src/components/interview/livekit-room.tsx` chỉ kết nối room sau khi có token, render audio của room, có bước mở audio rõ ràng và hiển thị trạng thái kết nối.
3. `src/lib/livekit/token.ts` tách token acquisition khỏi component UI.
4. `src/lib/realtime/webrtc-client.ts` tách transport state khỏi transcript/agent state, giúp có fallback transport.
5. `docs/live-interview-agent-hosting.md` chỉ ra Agent worker là deployment độc lập, không nên nhét vào request lifecycle ngắn.

VéĐi áp dụng cùng tinh thần: booking core không biết transport, message final là boundary chung, device speech là fallback, và LiveKit sau này chỉ thay lớp media/participant.

## Đã triển khai

Nguyên tắc: booking **xác định** ở `@ordervoice/core` là nguồn sự thật duy nhất cho
giá, chuyến, ghế, mã vé và điều kiện xác nhận. Agent worker không tự quyết định các
trường đó — mỗi lượt khách nói được chuyển về core, agent chỉ đọc lại câu core trả về.

| Thành phần | Đường dẫn |
|---|---|
| Token lib (room `booking-<conversationId>`, dispatch agent) | `apps/web/src/lib/livekit/token.ts` |
| Token endpoint | `apps/web/src/app/api/livekit/token/route.ts` |
| Seam booking (đường ghi duy nhất của agent) | `apps/web/src/app/api/booking/advance/route.ts` |
| Client room (audio, caption, booking badge) | `apps/web/src/components/bus-call/livekit-call.tsx` |
| Agent worker + 3 engine mode | `agent/agent.py` |
| VALSEA realtime ASR → LiveKit STT | `agent/valsea_stt.py` |
| EOU tiếng Việt xác định (~0ms, không model) | `agent/turn_rules.py` |

Contract giữa hai phía:

- `POST /api/livekit/token` — `{ conversationId, role }` → `{ token, serverUrl, roomName }`.
- `POST /api/booking/advance` — auth `Bearer AGENT_WEBHOOK_SECRET`,
  `{ conversationId, draft|null, text }` → `{ draft, reply }`. Stateless: agent giữ
  draft giữa các lượt, `draft=null` thì core khởi tạo.
- Data-channel `vedi-events`: agent → web `booking.update` / `agent.state` / `call.end`;
  web → agent `user.end_turn`.
- Caption đọc thẳng từ `useTranscriptions()` nên pilot không cần database.

Ba engine A/B test qua env `AGENT_ENGINE` + `STT_PROVIDER` (chi tiết `agent/.env.example`):
VALSEA-first (`cascade`+`valsea`), cascade parity project-4 (`cascade`+`speechmatics`),
và `gemini-sts` speech-to-speech.

## Chưa xác minh

Workspace không có LiveKit/VALSEA/OpenAI/Gemini credentials nên đường audio thật chưa
chạy lần nào. Đã xác minh được: typecheck, unit test cho `/api/booking/advance` (đi hết
luồng tới vé xác nhận), `next build`, và `py_compile` cho agent. Phần cần kiểm chứng khi
có key: glue `stt.SpeechStream` của `valsea_stt.py` với version `livekit-agents` đã cài,
độ ổn định của việc LLM gọi tool mỗi lượt, và latency từng preset.

## Kiến trúc pilot được đề xuất

```text
Customer browser                Staff browser
       |                             |
       +--------- LiveKit room ------+
                       |
                 Agent worker
              STT -> tools -> TTS
                       |
             VéĐi booking core
                       |
                 Neon audit log
```

### Thành phần

- Next.js/Vercel: UI và `POST /api/livekit/token`.
- LiveKit Cloud: lựa chọn recommended để pilot nhanh; tự host chỉ khi có yêu cầu dữ liệu/hạ tầng.
- Agent worker: Node hoặc Python process chạy trên Railway, Fly.io, Cloud Run hoặc VM/container tương đương.
- STT/TTS: VALSEA-first khi có sandbox key; OpenAI chỉ là fallback phát triển được gắn nhãn.
- LLM: chỉ chọn bước hội thoại/tool call. Giá, chuyến, seat count và confirmation đi qua `@ordervoice/core`.
- Neon: lưu room, participant, final transcript, booking snapshot và audit event.

## Credentials và hạ tầng bắt buộc

| Hạng mục | Cần có |
|---|---|
| LiveKit | `LIVEKIT_URL`, API key, API secret |
| Browser | `NEXT_PUBLIC_LIVEKIT_URL`; participant token từ server |
| Agent | LiveKit credentials, STT/LLM/TTS credentials, outbound WebSocket |
| Self-host server | Domain/TLS, TURN, firewall/UDP ports, monitoring và upgrades |
| Persistence | Neon `DATABASE_URL` và migration |

LiveKit khuyến nghị bắt đầu Agent deployment khoảng 4 CPU/8 GB cho 10 đến 25 jobs đồng thời; pilot một room có thể nhỏ hơn nhưng vẫn phải đo CPU/audio latency thực tế. Nguồn: [Agent custom deployment](https://docs.livekit.io/deploy/custom/deployments/).

## Trình tự triển khai pilot

1. [ ] Tạo LiveKit Cloud project và secrets trong Vercel/Agent host.
2. [x] Token route Zod-validate room/identity, TTL ngắn, không nhận API secret từ browser.
3. [ ] Tách workspace thành customer route và staff route, cùng một booking session ID.
4. [x] Dùng `LiveKitRoom`, `RoomAudioRenderer` và mic/end-turn control.
5. [x] Agent worker nối final STT vào booking core và phát TTS reply vào room *(code xong, chưa chạy thật)*.
6. [ ] Lưu final-only transcript và booking transitions vào Neon.
7. [ ] Test reconnect, duplicate final events, participant leave, agent crash và human takeover.
8. [ ] Chỉ đổi nhãn UI sang “LiveKit live” sau test hai thiết bị trên production.

## Còn lại trước khi gọi là “live”

Workspace không có LiveKit project credentials hoặc STT/TTS sandbox credentials, nên
các bước chưa tick ở trên vẫn mở. Đặc biệt: phía nhân viên hiện vẫn chạy client-side
trong cùng workspace (chưa tách participant thứ hai vào room), và chưa có persistence.
Đừng đổi nhãn UI sang “LiveKit live” trước khi test thật trên hai thiết bị.

Nguồn chính thức: [LiveKit self-hosting](https://docs.livekit.io/transport/self-hosting/), [token endpoint](https://docs.livekit.io/frontends/build/authentication/endpoint/), [custom Agent deployments](https://docs.livekit.io/deploy/custom/deployments/).
