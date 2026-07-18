# Alove

Alove là ứng dụng đặt vé nhà xe Mai Anh bằng hội thoại tiếng Việt, với thông điệp “Alo là có vé”. Khách vào trang nhà xe, bấm một nút là nói chuyện được với tổng đài viên AI và cầm mã vé về.

Luồng khách gồm ba màn: trang chủ nhà xe → khung cuộc gọi (nút gọi phình ra thành chính khung đó) → màn vé kèm mã QR. Cuộc gọi chạy trong trình duyệt, không cần số điện thoại.

## Đã triển khai

- Luồng khách một chạm từ trang chủ tới cuộc gọi, phiếu vé điền dần theo lời nói.
- Màn vé sau khi chốt: mã vé, QR lên xe, lưu ảnh vé về máy, đặt chuyến khác.
- Trang chủ đọc tuyến/giờ/giá từ cùng catalog agent dùng, nên con số trên trang luôn khớp con số agent tư vấn.
- Agent đặt vé xác định phía server, không tự bịa giá, chuyến, ghế hay mã vé.
- Chờ mãi không ai bắt máy thì dừng chuông, báo tổng đài bận kèm nút gọi lại.
- Màn hẹp: nút gọi bám đáy màn, phiếu vé thu thành thanh tóm tắt chạm-để-mở.
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

Demo zero-key vẫn là mặc định. Khi có LiveKit credentials, đặt `NEXT_PUBLIC_LIVEKIT_URL` để mọi cuộc gọi (từ trang chủ lẫn `/console`) chuyển sang LiveKit thật do [`agent/`](agent/README.md) phục vụ; bỏ trống thì transport in-browser giữ nguyên. Booking vẫn xác định phía server: agent không tự bịa giá, chuyến, ghế hay mã vé mà gọi `POST /api/booking/advance` chạy `@ordervoice/core`. Chi tiết trong [`docs/livekit-bus-pilot.md`](docs/livekit-bus-pilot.md).

## Chạy local

```bash
pnpm install
pnpm dev:web
```

Mở `http://localhost:3000`:

1. Trang chủ là trang bán vé của nhà xe: tuyến, giờ chạy và giá đọc thẳng từ
   catalog dùng chung với agent.
2. Bấm **Gọi để đặt xe** — nút phình ra thành khung cuộc gọi và tự bắt đầu, không
   phải bấm thêm lần nữa.
3. Nói hoặc chạy hết lượt hội thoại tới khi xác nhận; phiếu vé điền dần theo lời nói.
4. Chốt vé xong màn **Vé của bạn** hiện mã vé, QR và nút lưu vé về máy.

`/console` giữ nguyên làm màn cuộc gọi độc lập cho demo kỹ thuật và nội bộ.

Kịch bản trình bày cho giám khảo: [`docs/vedi-demo-script.md`](docs/vedi-demo-script.md).

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

Demo production: [https://ordervoice-vn.vercel.app](https://ordervoice-vn.vercel.app)

## Tài liệu chính

- [Kiến trúc hiện tại](docs/architecture.md)
- [Thiết kế sản phẩm](docs/superpowers/specs/2026-07-18-vedi-bus-ticket-voice-demo-design.md)
- [LiveKit và project-4 review](docs/livekit-bus-pilot.md)
- [Khả năng tích hợp third party](docs/integration-feasibility.md)
- [Design system](docs/design-system.md)
- [Demo script](docs/vedi-demo-script.md)
