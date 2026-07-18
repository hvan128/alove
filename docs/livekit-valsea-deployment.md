# Deploy LiveKit + VALSEA

## Mô hình khuyến nghị

- Vercel: Next.js web, token route và Neon session API.
- LiveKit Cloud: WebRTC room, TURN và named agent dispatch.
- LiveKit Cloud Agents hoặc container Singapore: Python voice worker.
- VALSEA: mandatory realtime STT và Vietnamese TTS.
- OpenAI: dịch final transcript khi chọn English và tạo nội dung trả lời Auto; không dùng cho STT.

LiveKit Cloud là đường demo nhanh vì self-host media server cần domain, TLS, UDP/TCP ports và TURN. Worker vẫn có thể deploy bằng image `agent/Dockerfile` lên host container gần Việt Nam.

## 1. LiveKit project

Tạo một LiveKit Cloud project và lấy:

```dotenv
LIVEKIT_URL=wss://<project>.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

Ba giá trị phải giống nhau ở Vercel và worker. Không đưa API key/secret vào client bundle.

## 2. Worker secrets

Tạo `agent/.env` từ `agent/.env.example`:

```dotenv
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_AGENT_NAME=vedi-booking-agent
VALSEA_API_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
VALSEA_TTS_VOICE=valsea-neutral
```

`VALSEA_API_KEY` bắt buộc. Thiếu `OPENAI_API_KEY`, Human mode và `staff.speak` vẫn hoạt động, nhưng English hiển thị câu gốc có nhãn fallback và Auto trả lỗi cấu hình rõ ràng thay vì tự bịa câu.

## 3. Chạy local

```bash
cd agent
uv sync --all-extras
uv run python agent.py dev
```

Dev worker tự đăng ký tên `vedi-booking-agent-dev`. Khi test local, đặt `LIVEKIT_AGENT_NAME=vedi-booking-agent-dev` ở web. Điều này ngăn worker local nhận nhầm job production.

## 4A. LiveKit Cloud Agents

```bash
cd agent
lk cloud auth
lk agent create
lk agent deploy
```

CLI tạo `livekit.toml` gắn với project. File thật được gitignore. Sau khi worker ở trạng thái running, test một room trước khi bật dispatch trên web.

## 4B. Container Singapore

```bash
docker build -t vedi-booking-agent ./agent
docker run --env-file agent/.env -p 8081:8081 vedi-booking-agent
```

Deploy image lên một dịch vụ container có always-on process, outbound WSS và region Singapore. Health port của AgentServer là 8081. Không đặt worker vào Vercel Function.

## 5. Vercel environment

```dotenv
LIVEKIT_URL=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_AGENT_NAME=vedi-booking-agent
VOICE_AGENT_ENABLED=true
VALSEA_ENABLED=true
DATABASE_URL=postgresql://...   # optional
```

`VALSEA_ENABLED` chỉ là public readiness flag; VALSEA secret ở worker. Chỉ bật `VOICE_AGENT_ENABLED=true` sau khi named worker đã chạy, vì caller token sẽ dispatch agent ngay khi join.

## 6. Neon

```bash
export DATABASE_URL='postgresql://...'
pnpm --filter @ordervoice/db migrate
```

Chạy cả `0001_vedi_bus_booking.sql` và `0002_staff_live_call.sql`. Kiểm tra `/api/config` trả `persistence: true`; `/api/sessions/DEMO42` phải trả `durable: true`.

## 7. Smoke test bắt buộc

1. Mở `/staff?session=LIVE42` trên laptop.
2. Mở `/call?session=LIVE42` trên điện thoại qua HTTPS.
3. Caller join và bật mic; staff thấy LiveKit connected, sau đó VALSEA live.
4. Nói một câu tiếng Việt; partial thay đổi nhưng chỉ final điền phiếu.
5. Human mode không có spontaneous agent audio.
6. Bấm **Nói câu này**; caller nghe đúng một audio TTS.
7. Bật Auto, nói lượt mới; caller nghe đúng một reply, không bị browser đọc chồng.
8. Tắt Auto và xác nhận vé thủ công.

Tham khảo: [LiveKit agent dispatch](https://docs.livekit.io/agents/server/agent-dispatch/), [custom STT pipeline](https://docs.livekit.io/agents/models/stt/), [self-host deployment](https://docs.livekit.io/deploy/custom/deployments/), [VALSEA RTT](https://valsea.ai/docs/realtime), [VALSEA TTS](https://valsea.ai/docs/api/speech), [OpenAI Responses](https://developers.openai.com/api/reference/resources/responses/methods/create).
