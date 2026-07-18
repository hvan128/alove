# Alove

Alove là tổng đài AI tiếng Việt giúp khách tìm chuyến và đặt vé thật cho nhà xe
Mai Anh. Sản phẩm chỉ có một runtime: trình duyệt gọi qua LiveKit, Python agent
điều phối hội thoại, còn API và Neon trong `apps/web` quyết định toàn bộ chuyến,
giá, ghế và mã vé.

Production duy nhất: <https://vedi-one.vercel.app/>

Public repository: <https://github.com/hvan128/alove>

## Kiến trúc hiện hành

```text
Khách trên web / SIP
        |
        v
LiveKit room + token ngắn hạn do server cấp
        |
        v
Python agent (STT -> LLM tools -> TTS)
        |
        v
Next.js booking API có bearer auth
        |
        +----> Neon inventory + bookings
        |
        +----> call audit + dashboard
```

- `apps/web`: Next.js 16, token service, booking API, Drizzle schema, dashboard
  và giao diện cuộc gọi.
- `agent`: LiveKit Python worker; hiểu hội thoại nhưng không được tự tạo dữ liệu
  vận hành.
- `apps/web/drizzle`: migration duy nhất của hệ thống.
- `data/mai-anh-seed`: dữ liệu vận hành để seed Neon.

Các gateway cũ, browser fallback và luồng demo không authoritative đã được loại bỏ.

## Nguyên tắc dữ liệu và bảo mật

- Browser không được chọn room, role hoặc participant identity. Server tạo call
  session và cấp token LiveKit ngắn hạn.
- Chỉ LiveKit agent participant được phép phát booking/state event mà UI tin cậy.
- Agent gọi booking API bằng `AGENT_WEBHOOK_SECRET`; provider secret không bao giờ
  đi xuống browser.
- Search, hold, confirm và cancel dùng inventory Neon. Xác nhận/hủy phải atomic;
  hold hết hạn không được bán hoặc xác nhận nhầm.
- Tra cứu hay hủy vé của cuộc gọi trước cần cả mã vé và số điện thoại. Vé vừa tạo
  trong cuộc gọi hiện tại có thể hủy bằng call session đó.
- QR chỉ chứa `/verify?code=…`; trang verify yêu cầu số điện thoại khớp trước khi
  trả snapshot tối thiểu, bất biến của vé đã xác nhận.
- JSON tải xuống dùng contract versioned. Webhook `booking.confirmed` là tùy chọn,
  ký HMAC và đi qua durable outbox; lỗi giao webhook không hủy booking.
- Dashboard là dữ liệu audit; nó không được dùng làm input quyết định booking.

## Chạy local

Yêu cầu Node.js 20+, pnpm 10, Python 3.11+ và `uv`.

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
# Điền giá trị local, rồi export cho Drizzle và script seed.
set -a
source apps/web/.env.local
set +a
pnpm --dir apps/web exec drizzle-kit migrate
pnpm --dir apps/web seed:operator ../../data/mai-anh-seed
pnpm dev:web
```

Chạy worker trong terminal khác:

```bash
cp agent/.env.example agent/.env
cd agent
uv sync
uv run python agent.py dev
```

Web local: <http://localhost:3000>. Các ngữ cảnh được tách riêng:

- `/` và `/console`: hành trình của hành khách.
- `/ban-to-chuc`: lối vào chấm thi, dẫn tới từng góc nhìn theo thứ tự rõ ràng.
- `/evidence`: bằng chứng kỹ thuật dành cho bước đánh giá.
- `/verify?code=…`: cổng xác minh vé công khai, luôn yêu cầu số điện thoại khớp.
- `/dashboard`: màn vận hành nhà xe có access key, không phải dashboard của hành khách
  hay ban tổ chức.

Trên production, ban tổ chức bắt đầu tại
<https://vedi-one.vercel.app/ban-to-chuc/>.

## Biến môi trường

### Web/Vercel

| Biến | Bắt buộc | Mục đích |
|---|---:|---|
| `DATABASE_URL` | Có | Neon Postgres cho inventory, booking và call audit |
| `LIVEKIT_URL` | Có | URL LiveKit server, chỉ đọc ở server |
| `LIVEKIT_API_KEY` | Có | Ký participant token và dispatch agent |
| `LIVEKIT_API_SECRET` | Có | Ký participant token và call-session capability |
| `LIVEKIT_AGENT_NAME` | Có | Tên dispatch, mặc định `alove` |
| `AGENT_WEBHOOK_SECRET` | Có | Secret ngẫu nhiên tối thiểu 32 byte bảo vệ booking/audit API |
| `BOOKING_VERIFICATION_SECRET` | Có | HMAC key riêng cho rate-limit phân tán của `/verify`; tối thiểu 32 byte |
| `BOOKING_WEBHOOK_URL` | Không | HTTPS endpoint nhà xe nhận `booking.confirmed` |
| `BOOKING_WEBHOOK_SECRET` | Khi có URL | HMAC key riêng để ký webhook; tối thiểu 32 byte |
| `BOOKING_WEBHOOK_ALLOWED_HOSTS` | Khi có URL | Allowlist hostname chính xác, phân tách bằng dấu phẩy |
| `CRON_SECRET` | Khi có webhook | Bảo vệ Vercel Cron drainer của outbox; tối thiểu 32 byte |
| `DASHBOARD_ACCESS_KEY` | Có nếu dùng dashboard | Khóa pilot tối thiểu 32 ký tự |

### Python agent

Xem [`agent/.env.example`](agent/.env.example). Tối thiểu cần LiveKit credentials,
`NEXTJS_API_URL`, `AGENT_WEBHOOK_SECRET` và credentials cho STT/LLM/TTS đã chọn.
Web production phải được gọi qua `https://vedi-one.vercel.app/`.

Với cascade, `STT_PROVIDER` trống hoặc không khai báo sẽ dùng `valsea`; giá trị
không được hỗ trợ làm worker dừng khởi động. `speechmatics` và `openai` chỉ là lựa
chọn A/B chủ động. `VALSEA_WS_URL` và `VALSEA_MODEL` là override tùy chọn; runtime
mặc định chỉ cần `VALSEA_API_KEY` cho VALSEA.

### Probe VALSEA độc lập

`scripts/probe-valsea-endpoints.ts` là công cụ chẩn đoán dành cho maintainer, không
phải route của web production. App hiện không có màn/route upload audio để so sánh
batch; audio cuộc gọi vẫn đi qua VALSEA realtime trong Python agent.

Probe gọi API thật và có thể tiêu tốn credits. Chỉ dùng WAV synthetic không chứa
PII, PCM 16-bit, mono, 16 kHz; script sẽ từ chối fixture khác và yêu cầu provenance
được khai báo chính xác. Nạp `VALSEA_API_KEY` vào environment (không đặt secret
trong argv), rồi chạy:

```bash
set -a
source .env
set +a
VALSEA_PROBE_FIXTURE_PROVENANCE=synthetic-no-pii \
  pnpm exec tsx scripts/probe-valsea-endpoints.ts /absolute/path/to/synthetic.wav
```

HTTP và WebSocket đều gửi credential bằng `Authorization` header. Report được
lọc credential, balance, email, số điện thoại và tên file local; không commit
fixture hoặc output chưa được kiểm tra.

### Bằng chứng hard-case

`pnpm evidence:evaluate` gửi cùng ba WAV synthetic/no-PII (thanh điệu,
code-switch và noisy telephone 8 kHz) tới VALSEA và Whisper với baseline
`language=vi`, rồi cập nhật WER/diff/tone/English-retention cho `/evidence`.
Lệnh gọi provider thật và tiêu tốn credits. Bộ synthetic này không chứng minh
khả năng nhận giọng vùng miền; chỉ fixture thật có consent mới đóng được gap đó.

## Quality gates

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
cd agent && uv run python -m unittest discover -s tests
```

## Deploy

- Web: Vercel project có Root Directory là `apps/web`; chạy `pnpm deploy:web` từ
  repository root.
- Agent: build `agent/Dockerfile` và chạy trên worker có kết nối lâu dài tới
  LiveKit Cloud.
- Migration phải chạy trước khi đưa web/agent dùng schema mới. Không sửa migration
  đã áp dụng; luôn thêm migration mới.

## Tài liệu

- [Kiến trúc](docs/architecture.md)
- [Triển khai](docs/deployment.md)
- [Dữ liệu nhà xe](docs/operator-data-format.md)
- [LiveKit SIP runbook](docs/pstn-sip-runbook.md)
- [Quyết định STT/TTS](adrs/0009-valsea-stt-google-chirp3-tts.md)
- [Checklist rubric và mức bằng chứng](docs/rubric-checklist.md)
