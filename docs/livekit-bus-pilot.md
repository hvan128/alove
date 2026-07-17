# LiveKit bus-ticket pilot và review project-4

**Ngày review:** 2026-07-18  
**Trạng thái public demo:** Web Call cùng trình duyệt, không claim LiveKit live.

## Kết luận

Không đưa LiveKit vào critical path của demo public. Demo hiện tại đã chứng minh hai phía, Human/Agent handoff, STT tùy chọn, booking state và Agent nói mà không cần credential. LiveKit được chọn cho pilot tiếp theo khi cần khách và nhân viên ở hai trình duyệt/thiết bị thật.

Lý do:

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

1. Tạo LiveKit Cloud project và secrets trong Vercel/Agent host.
2. Thêm token route Zod-validate room/identity, TTL ngắn, không nhận API secret từ browser.
3. Tách workspace thành customer route và staff route, cùng một booking session ID.
4. Dùng `LiveKitRoom`, `RoomAudioRenderer` và explicit start-audio control.
5. Deploy Agent worker; nối final STT vào booking core và publish TTS reply vào room.
6. Lưu final-only transcript và booking transitions vào Neon.
7. Test reconnect, duplicate final events, participant leave, agent crash và human takeover.
8. Chỉ đổi nhãn UI sang “LiveKit live” sau test hai thiết bị trên production.

## Tại sao chưa deploy server LiveKit lúc này

Không có LiveKit project credentials hoặc STT/TTS sandbox credentials trong workspace. Tự tạo một media server public mà không có domain/network plan sẽ không chứng minh Agent hoạt động và tăng rủi ro vận hành. Public demo hiện tại đã deploy được không cần server này; pilot checklist ở trên là đường nâng cấp cụ thể.

Nguồn chính thức: [LiveKit self-hosting](https://docs.livekit.io/transport/self-hosting/), [token endpoint](https://docs.livekit.io/frontends/build/authentication/endpoint/), [custom Agent deployments](https://docs.livekit.io/deploy/custom/deployments/).
