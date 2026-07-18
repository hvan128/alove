# Alove

Alove là ứng dụng đặt vé nhà xe Mai Anh bằng hội thoại tiếng Việt, với thông điệp “Alo là có vé”. Một màn hình trình bày đồng thời phía khách hàng và phía chăm sóc khách hàng, hỗ trợ hai chế độ:

- **Nhân viên:** khách gửi yêu cầu, nhân viên tự nhập và phát câu trả lời, sau đó xác nhận thủ công.
- **Agent tự động:** engine thu thập hành trình, đề xuất chuyến, hỏi thông tin hành khách, đọc lại và chỉ chốt sau câu xác nhận rõ ràng.

Demo Web Call chạy ngay trong trình duyệt, không cần số điện thoại, LiveKit, API key hay database. Mic STT và giọng đọc tiếng Việt dùng khả năng của trình duyệt/thiết bị khi có; câu mẫu và text là fallback bảo đảm.

## Đã triển khai

- Luồng mẫu Sài Gòn → Đà Lạt, hai vé, chuyến 22:00, thông tin hành khách và mã vé ổn định.
- Hai phía khách hàng và nhân viên chăm sóc trong cùng workspace responsive.
- Chuyển Human/Agent giữa cuộc gọi mà không mất transcript hoặc phiếu vé.
- Agent đặt vé xác định, không phụ thuộc LLM nên demo không bị lỗi do quota hoặc mạng.
- Web Speech Recognition `vi-VN` tùy chọn và device Speech Synthesis có phát lại/dừng.
- Điều kiện xác nhận đầy đủ, giữ ghế theo số hành khách và idempotency cho mã vé.
- Next.js App Router, design system SaaS trung tính (IBM Plex, icon lucide, token `oklch`, primary indigo, elevation ngữ nghĩa), light/dark mode, Playwright E2E.
- Các adapter VALSEA, OpenAI, Twilio và Neon từ kiến trúc trước được giữ làm seam cho pilot, không bị trình bày là live khi chưa có credentials.
- `/engine` — màn test độc lập cho lõi nhận diện giọng nói (UI gọi là "Lõi nhận diện giọng nói Alove"; thực chất là VALSEA realtime ASR, xem [ADR 0009](adrs/0009-valsea-stt-google-chirp3-tts.md)): tải file hoặc ghi âm mic, transcript cuối tự đổ vào `advanceBookingAgent` để ra phiếu đặt vé, đồng thời gửi cùng file sang OpenAI Whisper làm baseline đối chứng. Cần `apps/api` (gateway VALSEA) chạy cùng lúc — xem mục Environment.

## Kiến trúc

```text
apps/web                  Next.js 16, Web Call demo, browser voice, Vercel target
packages/contracts       Zod contracts cho cuộc gọi, chuyến xe và phiếu vé
packages/core            Booking agent xác định và quy tắc xác nhận
apps/api + providers     Seam VALSEA/Twilio/OpenAI cho pilot có credentials
agent                    LiveKit voice agent worker (Python) cho cuộc gọi thật
db                       Neon/Drizzle persistence boundary
```

Demo zero-key vẫn là mặc định. Khi có LiveKit credentials, đặt `NEXT_PUBLIC_LIVEKIT_URL` để `/console` (chế độ **Agent tự động**) chuyển sang cuộc gọi LiveKit thật do [`agent/`](agent/README.md) phục vụ; bỏ trống thì transport in-browser giữ nguyên. Booking vẫn xác định phía server: agent không tự bịa giá, chuyến, ghế hay mã vé mà gọi `POST /api/booking/advance` chạy `@ordervoice/core`. Chi tiết trong [`docs/livekit-bus-pilot.md`](docs/livekit-bus-pilot.md).

## Chạy local

```bash
pnpm install
pnpm dev:web
```

Mở `http://localhost:3000/console`:

1. Chọn **Agent tự động** rồi **Bắt đầu Web Call**.
2. Chạy lần lượt bốn câu demo từ yêu cầu đến xác nhận.
3. Quan sát mã vé, ghế và phản hồi phát bằng giọng thiết bị.
4. Tải lại trang, chọn **Nhân viên** để demo manual reply và xác nhận thủ công.

Kịch bản chi tiết: [`docs/vedi-demo-script.md`](docs/vedi-demo-script.md).

## Environment

Bản demo mặc định không cần biến môi trường. Chỉ thêm secret qua Vercel/host secret manager khi thử pilot; không đưa key vào source hoặc biến `NEXT_PUBLIC_*`.

| Biến | Mục đích |
|---|---|
| `DATABASE_URL` | Neon Postgres cho persistence pilot |
| `VALSEA_API_KEY` | VALSEA ASR/TTS server-side theo yêu cầu đề bài |
| `OPENAI_API_KEY` | Fallback phát triển, không thay thế compliance VALSEA |
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Token service và Agent worker LiveKit |
| `NEXT_PUBLIC_LIVEKIT_URL` | URL room công khai, tuyệt đối không chứa secret. Có giá trị = bật transport LiveKit cho `/console` |
| `LIVEKIT_AGENT_NAME` | Tên dispatch agent, phải khớp `agent/.env` (mặc định `alove`) |
| `AGENT_WEBHOOK_SECRET` | Secret chung bảo vệ `POST /api/booking/advance` — đường ghi duy nhất của agent vào booking core |
| `TWILIO_*` | Pilot số điện thoại và Media Streams |
| `NEXT_PUBLIC_GATEWAY_URL` | URL gateway `apps/api` (WS proxy VALSEA) cho `/engine`. Chạy `pnpm dev:api` cùng lúc, trỏ biến này về nó (vd `http://localhost:3001`); bỏ trống thì `/engine` chỉ phát audio cục bộ, không có transcript thật |
| `OPENAI_TRANSCRIBE_MODEL` | Model baseline đối chứng cho `/engine` (mặc định `whisper-1`) |

Credential từng được dán vào hội thoại không được dùng, lưu hoặc deploy. Chủ key nên revoke/rotate key đó.

## Quality gates

```bash
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Deploy

Web demo được deploy vào Vercel. Bản demo không cần deploy media server. Khi chuyển sang LiveKit, dùng LiveKit Cloud để pilot nhanh hoặc deploy LiveKit Server và Agent worker trên host hỗ trợ kết nối lâu dài; Vercel vẫn phục vụ Next.js và token endpoint.

Demo production: [https://ordervoice-vn.vercel.app/console](https://ordervoice-vn.vercel.app/console)

## Tài liệu chính

- [Kiến trúc hiện tại](docs/architecture.md)
- [Thiết kế sản phẩm](docs/superpowers/specs/2026-07-18-vedi-bus-ticket-voice-demo-design.md)
- [LiveKit và project-4 review](docs/livekit-bus-pilot.md)
- [Khả năng tích hợp third party](docs/integration-feasibility.md)
- [Design system](docs/design-system.md)
- [Demo script](docs/vedi-demo-script.md)
