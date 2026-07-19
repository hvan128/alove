# Alove

Alove là nền tảng **speech-to-workflow** biến hội thoại giọng nói thành quy trình
vận hành có trạng thái. Hệ thống không dừng ở transcript: một cuộc gọi có thể trở
thành vé xe với hành trình, ghế, giá, mã vé và dấu vết xác nhận; hoặc mở rộng thành
đơn hàng, lịch hẹn và ticket chăm sóc khách hàng.

Đặt vé xe là vertical pilot đầu tiên. Pilot hiện dùng dữ liệu nhà xe Mai Anh cho
tuyến Sài Gòn ⇄ Đà Lạt để chứng minh tinh thần **speech-to-meaning**: giọng nói đi
qua lớp hiểu ngôn ngữ rồi cập nhật workflow thực tế, thay vì chỉ tạo văn bản.
Alove không được định vị như sản phẩm chỉ dành cho một nhà xe, tuyến đường hoặc
ngành nghề.

Production duy nhất: <https://vedi-one.vercel.app/>

Public repository: <https://github.com/hvan128/alove>

## 1. Mô tả bài toán

Khách hàng thường đặt vé xe qua điện thoại vì nhanh, thuận tiện và quen thuộc.
Nhân viên phải đồng thời nghe yêu cầu, tìm chuyến, kiểm tra ghế, ghi thông tin
hành khách và xác nhận đặt vé. Quy trình thủ công dễ gây bỏ sót hoặc nhập sai
tuyến đường, ngày giờ, số lượng vé, điểm đón và số điện thoại.

Khó khăn tăng khi khách nói nhanh, dùng giọng Bắc, Trung, Nam, tiếng Việt mang âm
sắc nước ngoài, xen tiếng Anh hoặc chuyển đổi Việt–Anh liên tục trong cùng câu.
Ví dụ: “Cho tôi book hai vé đi Đà Lạt vào Friday night.” Âm thanh nhiễu và cách
diễn đạt tự nhiên, không theo mẫu cũng khiến hệ thống nhận diện giọng nói thông
thường dễ hiểu sai.

Vào giờ cao điểm, số lượng cuộc gọi lớn khiến khách phải chờ lâu, trong khi nhà xe
khó duy trì chất lượng phục vụ ổn định.

**Bài toán cần giải quyết:** tự động hóa quy trình đặt vé qua điện thoại nhưng vẫn
bảo đảm thông tin chính xác, giá và ghế đúng với dữ liệu nhà xe, đồng thời cho phép
nhân viên kiểm soát hoặc tiếp quản khi cần.

## 2. Giải pháp

Alove là trợ lý hội thoại giọng nói hoạt động như nhân viên tổng đài tự động 24/7.
Khách có thể gọi trên web hoặc qua SIP — cuộc gọi điện thoại tới số tổng đài — và
nói nhu cầu bằng ngôn ngữ tự nhiên.

Trong workflow đặt vé, Alove lần lượt thu thập tuyến đi, ngày giờ, số lượng hành
khách, loại xe, điểm đón, họ tên và số điện thoại. Hệ thống tra cứu dữ liệu nhà xe
để tìm chuyến phù hợp, kiểm tra ghế còn trống và thông báo giá vé.

Trước khi đặt vé, Alove đọc lại toàn bộ thông tin để khách xác nhận. Chỉ khi nhận
được xác nhận rõ ràng, hệ thống mới hoàn tất đặt vé, cấp mã vé và số ghế. Dữ liệu
chuyến, giá và tình trạng ghế được lấy trực tiếp từ hệ thống vận hành; Alove không
tự tạo thông tin ngoài dữ liệu nhà xe.

Sau cuộc gọi, hệ thống tạo phiếu đặt vé có cấu trúc gồm thông tin hành khách,
chuyến đi, ghế, giá vé và trạng thái xác nhận. Nhân viên theo dõi hội thoại và
phiếu đặt vé trên cùng một màn hình. Khi cần hỗ trợ, nhân viên tiếp quản cuộc gọi
mà không mất transcript hoặc thông tin Alove đã thu thập.

Đặt vé xe là workflow triển khai đầu tiên. Cùng nền tảng có thể mở rộng sang:

- F&B: nhận đặt món, kiểm tra món, đọc lại đơn hàng và chuyển đơn xuống bếp.
- Bán lẻ: tạo và xác nhận đơn hàng từ cuộc gọi.
- Logistics: tiếp nhận yêu cầu giao nhận và tạo yêu cầu vận chuyển.
- Chăm sóc khách hàng: đặt lịch hoặc tạo ticket xử lý.

Mỗi ngành dùng bộ thông tin, dữ liệu và quy tắc riêng; lớp nhận diện giọng nói,
hiểu ngôn ngữ và điều phối hội thoại được tái sử dụng.

## 3. Đối tượng sử dụng

Alove phục vụ khách hàng muốn giao dịch qua điện thoại, gồm khách Việt Nam thuộc
nhiều vùng miền, khách nước ngoài nói tiếng Việt chưa thành thạo và khách giao
tiếp xen Việt–Anh.

Trong vertical đặt vé, người dùng phía doanh nghiệp gồm nhân viên tổng đài, chăm
sóc khách hàng, phòng vé, điều hành và quản lý nhà xe. Hệ thống giúp tăng số lượng
cuộc gọi có thể phục vụ, giảm sai sót nhưng vẫn giữ quyền kiểm soát toàn bộ quy
trình đặt vé.

Khi mở rộng, Alove có thể phục vụ nhà hàng, cửa hàng bán lẻ, đơn vị giao vận,
phòng khám, trung tâm dịch vụ và doanh nghiệp có nhiều giao dịch qua điện thoại.

## 4. Sự khác biệt

Alove không chỉ chuyển giọng nói thành văn bản. Hệ thống biến hội thoại trực tiếp
thành workflow hoàn chỉnh: hiểu nhu cầu, thu thập dữ liệu, gọi công cụ nghiệp vụ,
cập nhật trạng thái và tạo kết quả có thể kiểm tra. Với đặt vé, kết quả là hành
trình, ghế, giá, mã vé và dấu vết xác nhận — không chỉ transcript.

Lớp nhận diện giọng nói VALSEA tập trung xử lý tiếng Việt thực tế, gồm giọng Bắc,
Trung, Nam; tiếng Việt mang âm sắc nước ngoài; hội thoại code-switch Việt–Anh;
cách nói nhanh và âm thanh nhiễu từ cuộc gọi. Alove được thiết kế để hiểu câu
chuyển đổi liên tục giữa hai ngôn ngữ, thay vì buộc khách chỉ dùng tiếng Việt hoặc
tiếng Anh.

Khi tên khách, số điện thoại, tuyến đường hoặc thời gian chưa rõ, Alove chủ động
hỏi lại thay vì tự suy đoán. Lõi đặt vé hoạt động theo quy tắc xác định và dữ liệu
thực tế của nhà xe, giúp hạn chế AI tự tạo giá, chuyến hoặc ghế. Mọi vé đều cần
khách xác nhận rõ ràng. Nhân viên có thể theo dõi và tiếp quản bất kỳ lúc nào mà
không làm mất trạng thái cuộc gọi.

Khác biệt quan trọng nằm ở khả năng mở rộng từ voice agent đặt vé thành nền tảng
**speech-to-workflow**. Doanh nghiệp cấu hình dữ liệu, quy tắc và workflow phù hợp
để biến hội thoại thành vé xe, đơn món ăn, đơn hàng, lịch hẹn hoặc ticket chăm sóc
khách hàng.

Kiến trúc Alove hướng tới tiếng Việt, tiếng Anh và nhiều ngôn ngữ Đông Nam Á,
giúp doanh nghiệp mở rộng thị trường và phục vụ khách quốc tế hiệu quả hơn.

## Kiến trúc hiện hành

```text
Khách trên web / SIP (điện thoại qua số tổng đài)
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
- `data/mai-anh-seed`: dữ liệu vertical pilot để seed Neon.

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

## Bản đồ route

Không có `middleware.ts`; mọi kiểm soát truy cập nằm trong chính route. Ba cơ chế
xác thực tách biệt nhau và đều fail closed khi secret thiếu hoặc quá ngắn:

- `requireAgent` — bearer `AGENT_WEBHOOK_SECRET`, chỉ Python agent dùng.
- `checkDashboardRequest` — header `x-dashboard-key` hoặc cookie phiên
  `alove-dashboard-session` (HMAC, hạn 12 giờ). Page chỉ nhận cookie; API nhận cả hai.
- `CRON_SECRET` — bearer riêng cho cron, so sánh timing-safe.

### API

| Route | Method | Xác thực | Mục đích |
|---|---|---|---|
| `/api/booking/search` | POST | agent | Tìm chuyến theo tuyến/ngày/số khách; khi không có kết quả thì phân biệt "tuyến không chạy" với "chạy nhưng khác ngày" và gợi ý phương án |
| `/api/booking/hold` | POST | agent | Giữ ghế tạm cho một chuyến theo `conversationId`; hết ghế trả `{held:false}` với HTTP 200 |
| `/api/booking/confirm` | POST | agent | Chốt vé từ ghế đang giữ, yêu cầu câu xác nhận rõ ràng của khách, rồi cố gửi webhook. Webhook lỗi vẫn trả 200 — booking đã là sự thật |
| `/api/booking/cancel` | POST | agent | Huỷ vé theo `conversationId`, hoặc theo cặp mã vé + số điện thoại |
| `/api/booking/lookup` | POST | agent | Tra vé bằng mã vé + số điện thoại, phục vụ agent thoại |
| `/api/booking/verify` | POST | công khai | Endpoint công khai duy nhất chạm dữ liệu vé. Giới hạn body 2KB, ép `content-type`, bốn tầng rate-limit (IP/mã/số ĐT/cặp mã+số). Sai mã và sai số điện thoại trả cùng một 404 để không lộ vé tồn tại |
| `/api/booking/webhook/drain` | GET | cron | Drain outbox webhook: reconcile attempt treo, gửi tối đa 3 event tới hạn, đếm event đã bị bỏ. Bọc trong Sentry monitor `booking-webhook-drain` |
| `/api/call/events` | POST | agent | Nhận `call.started`, `transcript.final`, `booking.updated`, `call.ended` và ghi vào call audit |
| `/api/dashboard/calls` | GET | dashboard | Liệt kê cuộc gọi gần đây; chưa có DB thì trả 200 với `configured:false` thay vì lỗi |
| `/api/dashboard/calls/[callId]` | GET | dashboard | Chi tiết một cuộc gọi kèm transcript và booking |
| `/api/dashboard/bookings/[bookingId]/pay` | POST | dashboard | Nhân viên đánh dấu booking đã thanh toán; 409 nếu không ở trạng thái thu được |
| `/api/dashboard/bookings/[bookingId]/cancel` | POST | dashboard | Nhân viên huỷ booking đang chờ; 409 nếu không huỷ được |
| `/api/livekit/token` | POST | công khai, 8/10 phút theo IP | Cấp token cho khách gọi web. Server tự sinh `conversationId`, identity, room và role — browser không được chọn |
| `/api/livekit/observer-token` | POST | dashboard | Token vai trò `observer` để dashboard nghe ké cuộc gọi đang diễn ra |
| `/api/livekit/redispatch` | POST | session token đã ký, 3/2 phút | Dispatch lại agent khi lần dispatch một-lần của token thất bại; 410 nếu cuộc gọi đã đóng |
| `/api/health` | GET | công khai | Readiness: DB (gồm migration và còn chuyến bán được), LiveKit, agent webhook, booking verification. **503 khi bất kỳ mục nào chưa sẵn sàng** |
| `/api/newsletter` | POST | công khai, 5/giờ theo IP | Đăng ký bản tin từ footer; 201 khi thêm mới, 200 khi email đã có |

Tất cả chạy `runtime = 'nodejs'`.

### Trang

| URL | Kiểu | Gate | Mục đích |
|---|---|---|---|
| `/` | dynamic | không | Trang chủ marketing, hiển thị chuyến sắp chạy đọc từ DB |
| `/console` | static | không | Web Call console để khách đặt vé bằng giọng nói |
| `/verify?code=…` | dynamic | không | Cổng xác minh vé công khai; `noindex`, luôn đòi số điện thoại khớp |
| `/dashboard` | dynamic | có | Màn vận hành nhà xe: KPI, phễu, tuyến top, ghế giữ sắp hết hạn, bảng cuộc gọi |
| `/dashboard/calls/<callId>` | dynamic | có | Chi tiết cuộc gọi: transcript, tóm tắt booking, monitor nghe trực tiếp |
| `/ban-to-chuc` | static | không | Lối vào chấm thi, `noindex`; liệt kê từng góc nhìn kèm mức truy cập |
| `/what-we-built` | static | không | Hồ sơ sản phẩm: từ giọng nói tới vé và vận hành |
| `/checklist` | static | không | 36 tiêu chí VALSEA kèm kết quả production và nguồn kiểm chứng |
| `/evidence` | static | không | Kết quả VALSEA vs Whisper trên cùng đầu vào, dữ liệu tổng hợp không PII |
| `/design-system` | static | không | Showcase màu, typography và component |
| `/tinh-nang`, `/cach-hoat-dong`, `/danh-cho-nha-xe`, `/ho-tro`, `/bao-mat`, `/dieu-khoan` | static | không | Sáu trang marketing sinh từ `generateStaticParams`; slug ngoài danh sách trả 404 |

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
| `CRON_SECRET` | Có trên Vercel | Bảo vệ cron phục hồi outbox hằng ngày; tối thiểu 32 byte và tách khỏi secret khác |
| `DASHBOARD_ACCESS_KEY` | Có nếu dùng dashboard | Khóa pilot tối thiểu 32 ký tự |
| `SENTRY_DSN` | Không | Bật error tracking phía server; để trống thì mọi capture là no-op |
| `NEXT_PUBLIC_SENTRY_DSN` | Không | Cùng một DSN, dành cho code chạy trong browser; DSN chỉ nhận ghi nên public được |
| `SENTRY_ORG` | Không | Chỉ dùng lúc build, để upload source map |
| `SENTRY_PROJECT` | Không | Chỉ dùng lúc build, để upload source map |
| `SENTRY_AUTH_TOKEN` | Không | Thiếu thì build vẫn qua nhưng stack trace production giữ nguyên dạng minified |

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
- `.vercelignore` **thay thế** `.gitignore` chứ không cộng dồn. Thêm mục mới vào đó
  phải giữ nguyên các dòng sẵn có, nếu không Vercel sẽ upload cả `node_modules`.

## Monitoring

Thiết lập một lần: tạo project Sentry, rồi đặt cùng một DSN vào `SENTRY_DSN` và
`NEXT_PUBLIC_SENTRY_DSN`. Không có DSN thì mọi capture là no-op — local và preview
im lặng mặc định, không cần cờ riêng để tắt.

### Cái gì được báo

| Nguồn | Cấp | Nghĩa là gì |
|---|---|---|
| Lỗi server và route handler (`instrumentation.ts`) | error | `digest` hiện cho khách tra được thành một event cụ thể |
| Lỗi render phía client (`error.tsx`, `global-error.tsx`) | error | Màn hình vỡ trên máy khách thật |
| Giao webhook hết retry budget | error | **Một ghế đã trả tiền mà nhà xe không biết.** Phải gọi tay cho nhà xe |
| Hạ tầng giao webhook lỗi tạm thời | warning | Retry còn cứu được, chưa cần can thiệp |
| Outbox còn event không còn đường retry | error | Đếm mỗi ngày bởi cron, cũng trả về ở field `abandoned` |
| Cron drain không chạy | error | Monitor `booking-webhook-drain`, check-in tường minh trong route |

Cron dùng `Sentry.withMonitor` chứ không dùng `automaticVercelMonitors`: tuỳ chọn
kia chỉ chạy trên webpack, mà `next build` ở đây là Turbopack, nên nó sẽ đăng ký
một monitor rỗng trong im lặng. Lịch của monitor bị khoá vào `vercel.json` bằng
`vercel-config.test.ts` — lệch nhau thì monitor chờ một giờ không cron nào bắn.

### Dữ liệu cá nhân

`sendDefaultPii` tắt, nên cookie, header và địa chỉ IP không bao giờ được đính kèm.
Số điện thoại khách bị che ngay trong `beforeSend`, trước khi event rời tiến trình —
không dựa vào data-scrubbing rule phía Sentry, thứ có thể bị tắt mà không ai hay.

`src/lib/observability.test.ts` kiểm tra hàm che; `src/lib/sentry-wiring.test.ts`
kiểm tra nó thật sự nằm trên đường event đi ra, dùng SDK thật không mock. Một
`beforeSend` viết đúng nhưng chưa được cài sẽ pass mọi test khác mà vẫn gửi số
điện thoại đi.

### Kiểm tra bằng tay

```bash
curl -i https://vedi-one.vercel.app/api/health
curl -s -H "Authorization: Bearer $CRON_SECRET" \
  https://vedi-one.vercel.app/api/booking/webhook/drain
```

Health trả 503 là chặn release, không phải trạng thái để bỏ qua. Drain trả field
`abandoned`; khác 0 nghĩa là có vé không bao giờ tới được nhà xe.

### Chưa được phủ

- Không có gì tự động gọi `/api/health`. Cần uptime monitor bên ngoài poll nó và
  coi 503 là page; thiếu thứ đó thì một dependency có thể chết hàng giờ không ai biết.
- Python agent chưa nối Sentry; lỗi phía nó chỉ nằm trong log LiveKit Cloud.
- `latency.turn` vẫn là event data-channel, không persist, nên chưa có p50/p95 lịch sử.
- Call-audit delivery chưa có durable queue, khác với webhook vé.

## Tài liệu

- [Kiến trúc](docs/architecture.md)
- [Triển khai](docs/deployment.md)
- [Dữ liệu nhà xe](docs/operator-data-format.md)
- [LiveKit SIP runbook](docs/pstn-sip-runbook.md)
- [Lộ trình pilot 90 ngày](docs/pilot-roadmap.md)
- [Quyết định STT/TTS](adrs/0009-valsea-stt-google-chirp3-tts.md)
- [Checklist rubric và mức bằng chứng](docs/rubric-checklist.md)
