# VéĐi

VéĐi là demo staff-first cho tổng đài đặt vé nhà xe bằng tiếng Việt. Sản phẩm có hai route chính:

- `/staff?session=DEMO42`: bàn nhân viên với transcript realtime, gợi ý trả lời, phiếu đặt xe tự điền, bằng chứng từng trường và Human/Auto mode.
- `/call?session=DEMO42`: giao diện tối giản cho người gọi, phù hợp mở trên điện thoại.

`/console` chỉ còn là redirect tương thích sang `/staff`.

## Demo không cần key

```bash
pnpm install
pnpm dev:web
```

Mở hai tab cùng trình duyệt:

1. `http://localhost:3000/staff?session=DEMO42`
2. `http://localhost:3000/call?session=DEMO42`

Ở trang người gọi, bấm **Bắt đầu cuộc gọi** rồi gửi ba câu mẫu. Final transcript sẽ tự điền điểm đi, điểm đến, ngày, giờ, số vé, họ tên, điện thoại, điểm đón và điểm trả. Human mode không tự trả lời; Auto mode dùng agent xác định và giọng đọc của thiết bị trong fallback cục bộ.

Fallback này chỉ đồng bộ giữa các tab cùng browser. Hai thiết bị cần LiveKit.

## Kiến trúc

```text
apps/web                 Next.js 16: /staff, /call, token và session APIs
packages/contracts       Protocol Zod `vedi.events`
packages/core            Extraction đặt vé xác định, evidence, confirmation gate
packages/providers       VALSEA/Twilio/OpenAI seams
agent                    LiveKit worker: VALSEA RTT -> guarded LLM -> VALSEA TTS
db                       Neon/Drizzle schema, migration và audit
```

Worker mặc định Human-in-the-loop. Chỉ khi nhân viên bật Auto, LLM mới được phép tạo câu nói. Khi nhân viên chọn English, final transcript được dịch bằng OpenAI với `store: false`; thiếu key hoặc quá timeout thì UI giữ nguyên câu gốc và ghi nhãn fallback. STT production của worker luôn là VALSEA; browser STT chỉ là fallback có nhãn trong demo local.

## Cấu hình production

Web/Vercel:

| Biến | Bắt buộc khi |
|---|---|
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Gọi giữa hai thiết bị |
| `LIVEKIT_AGENT_NAME=vedi-booking-agent` | Dispatch voice worker |
| `VOICE_AGENT_ENABLED=true`, `VALSEA_ENABLED=true` | Worker đã deploy và smoke test xong |
| `DATABASE_URL` | Lưu final transcript, booking snapshot và audit vào Neon |

Worker `agent/.env`:

| Biến | Mục đích |
|---|---|
| `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Cùng LiveKit project với web |
| `VALSEA_API_KEY` | Bắt buộc cho VALSEA RTT STT và VALSEA TTS |
| `OPENAI_API_KEY` | Dịch final transcript sang English và tạo nội dung trả lời trong Auto mode |
| `OPENAI_MODEL` | Mặc định `gpt-4.1-mini` |

Không đưa secret vào `NEXT_PUBLIC_*`. Key OpenAI từng được dán trong hội thoại không được lưu hoặc sử dụng; cần revoke/rotate và cấp key mới.

## Kiểm thử

```bash
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build

cd agent
uv sync --all-extras
uv run pytest
uv run ruff check .
uv run python -m compileall .
```

## Deploy

Web deploy lên Vercel. Voice worker phải chạy trên LiveKit Cloud Agents hoặc host container có process/WebSocket lâu dài; không chạy worker bên trong Vercel Function.

- [Kiến trúc chi tiết](docs/architecture.md)
- [Kịch bản demo hai phía](docs/demo-script.md)
- [Deploy LiveKit + VALSEA](docs/livekit-valsea-deployment.md)
- [Trạng thái kiểm chứng tích hợp](docs/integration-test-status.md)
- [Đánh giá third party](docs/integration-feasibility.md)

Production web: [https://ordervoice-vn.vercel.app](https://ordervoice-vn.vercel.app)

Đây là demo hackathon: mã phiên chưa thay thế xác thực. Không nhập dữ liệu hành khách thật trên URL public; trước pilot thực tế cần staff auth, caller invite đã ký và rate limit cho token/session APIs.
