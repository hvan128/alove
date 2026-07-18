# Triển khai LiveKit: web + agent worker

**Ngày:** 2026-07-18

## Đang chạy ở đâu

| Lớp | Nơi chạy | Ghi chú |
|---|---|---|
| Media server (room/SFU) | **LiveKit Cloud** `wss://delta-sckf74o7.livekit.cloud` | dùng chung project với `interview-agent`; tách nhau bằng agent name |
| Web app | **Vercel** project `vedi` (team `vannh120802-4480s-projects`) | production alias `https://vedi-one.vercel.app` |
| Agent worker | **hermes-vm** (Oracle ARM64, Tailscale `ubuntu@100.77.225.68`) | `/opt/vedi-agent`, container Docker `vedi-agent` |
| Repo | `github.com/hvan128/vedi` (private) | |

Agent name là **`vedi`**, khác `interview` của project-4. Điều này bắt buộc: LiveKit
chia đều dispatch cho *mọi* worker đăng ký cùng một tên, nên trùng tên sẽ khiến hai
hệ cướp job của nhau.

## Cấu hình Vercel

Root Directory của project là `apps/web` (đặt qua API; nếu không, Vercel tìm `next`
trong `package.json` gốc của monorepo và báo "No Next.js version detected"). Deploy
bằng `vercel --prod` từ gốc repo.

Biến môi trường production đã đặt: `LIVEKIT_URL`, `NEXT_PUBLIC_LIVEKIT_URL`,
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_AGENT_NAME`, `AGENT_WEBHOOK_SECRET`,
`DASHBOARD_ACCESS_KEY`.

Lưu ý: Deployment Protection (SSO) đang bật cho URL deployment thô, nên worker phải
gọi qua **alias** `https://vedi-one.vercel.app`, không dùng URL dạng `vedi-<hash>-*`.

## Vận hành worker

```bash
ssh ubuntu@100.77.225.68
cd /opt/vedi-agent

docker logs -f vedi-agent            # xem log
docker build -t vedi-agent:latest .  # build lại sau khi đổi code
```

**Đổi cấu hình trong `.env` thì phải TẠO LẠI container, không được `docker restart`.**
`docker restart` giữ nguyên env đã nạp từ `--env-file` lúc `docker run`, nên sửa `.env`
mà chỉ restart sẽ chạy tiếp giá trị cũ (đã mất một vòng debug vì lỗi này):

```bash
docker rm -f vedi-agent
docker run -d --name vedi-agent --restart unless-stopped \
  --env-file /opt/vedi-agent/.env vedi-agent:latest
```

Đổi preset engine: sửa `AGENT_ENGINE` / `STT_PROVIDER` trong `.env` rồi tạo lại container.

## Đã xác minh

- `/api/booking/advance` trên production chạy đủ luồng thật: đề xuất chuyến → thông tin
  hành khách → xác nhận, trả mã vé và ghế. Không có bearer thì 401.
- Worker đăng ký được với LiveKit (`agent_name: vedi`), nhận dispatch, vào room và khởi
  tạo đúng engine cascade (Speechmatics → OpenAI → Cartesia, turn detector rules).
- `interview-agent` bên cạnh không bị ảnh hưởng.

## Chưa xác minh

Chưa có cuộc hội thoại âm thanh thật nào (cần trình duyệt có mic tham gia room). Những
thứ chỉ lộ ra khi gọi thật: chất lượng STT tiếng Việt, độ trễ, việc LLM có gọi tool
`advance_booking` đều đặn mỗi lượt hay không, và glue `stt.SpeechStream` của
`valsea_stt.py`.

## Giới hạn đã gặp

- **Speechmatics giới hạn stream đồng thời** — chạy nhiều room cùng lúc sẽ gặp
  `TranscriptionError: Concurrent Quota Exceeded`.
- **Agent bị dispatch vào room không có người sẽ nằm lại và retry STT**, đốt quota. Chỉ
  xảy ra khi tạo dispatch trần; luồng thật thì agent chỉ vào khi khách join.
- Key OpenAI của project-4 đã hết quota; VéĐi dùng key riêng trong `.env` của chủ dự án.
