# OrderVoice Copilot — Hướng dẫn triển khai toàn bộ hệ thống

> **Mục tiêu của tài liệu:** cung cấp đủ mô tả sản phẩm, kiến trúc, data model, API contract, logic AI, ba luồng tiếp nhận audio, tích hợp VALSEA và ERP để một coding agent có thể triển khai prototype hoàn chỉnh cho hackathon.
>
> **Ngôn ngữ triển khai đề xuất:** TypeScript.
>
> **Trạng thái tài liệu:** Implementation Specification v1.0.
>
> **Nguyên tắc quan trọng nhất:** hệ thống không chỉ chuyển giọng nói thành transcript. Hệ thống phải biến hội thoại thành **Draft Sales Order có bằng chứng, được đối chiếu với dữ liệu ERP và chỉ xuất sang ERP sau khi con người phê duyệt**.

---

## 0. Yêu cầu dành cho coding agent

Hãy triển khai hệ thống theo thứ tự ưu tiên trong tài liệu này.

Không tự ý mở rộng sang nhiều ngành, nhiều ERP hoặc voicebot tự động hoàn toàn trước khi hoàn thành luồng lõi.

Các nguyên tắc bắt buộc:

1. Dùng VALSEA cho bước speech-to-text.
2. Hỗ trợ đủ ba nguồn audio:
   - Microphone từ browser/mobile web.
   - Cuộc gọi điện thoại thật qua telephony media stream.
   - Zalo audio/video dưới dạng synchronized replay.
3. Chỉ dùng `transcript.final` để cập nhật order chính thức.
4. `transcript.partial` chỉ dùng để hiển thị tạm thời.
5. Transcript gốc là source of truth; bản dịch không được dùng để xác định SKU hoặc thay đổi order.
6. Mọi field order do AI trích xuất phải có evidence.
7. LLM không được trực tiếp tạo mã SKU, giá, tồn kho hoặc quyết định đơn hàng hợp lệ.
8. Customer, SKU, UOM, giá và tồn kho phải được resolve/validate bằng dữ liệu ERP.
9. Không tự submit order. Chỉ tạo **Draft Sales Order** sau bước human approval.
10. Mọi thao tác export phải idempotent để tránh tạo đơn trùng.
11. Luôn có demo fallback nếu telephony hoặc mạng ngoài gặp sự cố.
12. Ưu tiên modular monolith; không chia microservice trong 48 giờ.

---

# 1. Tóm tắt sản phẩm

## 1.1 Tên tạm thời

**OrderVoice Copilot**

Tên mô tả:

> Real-time Multilingual Voice-to-ERP Copilot for Industrial Distributors.

## 1.2 One-liner

> Biến cuộc gọi hoặc voice message tiếng Việt có giọng vùng miền, tiếng ồn và mã hàng tiếng Anh thành một Draft Sales Order có evidence, được kiểm tra với ERP và sẵn sàng để nhân viên xác nhận.

## 1.3 Người dùng chính

- Nhân viên sales nội bộ.
- Nhân viên telesales.
- Nhân viên nhận đơn qua điện thoại.
- Nhân viên chăm sóc khách hàng kiêm tạo đơn.
- Nhà phân phối vật tư công nghiệp/MRO.
- Doanh nghiệp nhận đơn qua cuộc gọi, Zalo voice hoặc trao đổi trực tiếp.

## 1.4 Vertical demo

Tập trung vào **nhà phân phối vật tư công nghiệp/MRO**, ví dụ:

- Vòng bi.
- Dây curoa.
- Thiết bị điện.
- Van và phụ kiện.
- Linh kiện máy.
- Bao bì công nghiệp.
- Vật tư bảo trì.

Không demo nhà hàng, POS bán lẻ hoặc đặt vé hành khách.

## 1.5 Giá trị sản phẩm

Quy trình hiện tại:

```text
Khách gọi điện / gửi voice
→ Nhân viên nghe
→ Ghi nháp
→ Tra khách hàng
→ Tìm SKU
→ Kiểm tra tồn kho
→ Kiểm tra giá
→ Nhập ERP
→ Đọc lại cho khách
→ Sửa nếu nghe nhầm
```

Quy trình mới:

```text
Hội thoại
→ Live transcript
→ Live translation
→ Order fields tự cập nhật
→ Customer/SKU được resolve
→ ERP kiểm tra giá và tồn kho
→ Copilot gợi ý câu hỏi cần xác nhận
→ Human approve
→ Draft Sales Order được tạo
```

---

# 2. Phạm vi MVP

## 2.1 Tính năng bắt buộc

1. Tạo conversation session.
2. Chọn intake mode.
3. Nhận audio từ đủ ba intake.
4. Chuẩn hóa audio về PCM16 16 kHz mono.
5. Stream audio vào VALSEA RTT.
6. Hiển thị partial transcript ngay lập tức.
7. Persist final transcript.
8. Dịch final transcript sang ngôn ngữ do người dùng chọn.
9. Phân biệt `caller` và `agent`.
10. Trích xuất order theo incremental patches.
11. Hiển thị form order cập nhật theo thời gian thực.
12. Resolve customer bằng số điện thoại hoặc tên công ty.
13. Resolve product bằng product catalog.
14. Kiểm tra tồn kho.
15. Kiểm tra giá theo khách hàng.
16. Phát hiện field thiếu, mâu thuẫn hoặc confidence thấp.
17. Sinh suggested reply.
18. Cho phép human sửa/xác nhận field.
19. Export Draft Sales Order sang ERPNext.
20. Hiển thị ERP document ID và trạng thái.
21. Ghi audit log.
22. Có demo fallback bằng synchronized replay.

## 2.2 Tính năng bonus

- VALSEA TTS để đọc suggested reply.
- Bấm vào field để nghe lại segment evidence.
- Tách hai audio track caller/agent trong telephony.
- Hiển thị latency metrics.
- So sánh generic ASR và VALSEA trên cùng audio.
- Ghi nhận customer correction history.
- Highlight code-switching.
- Hiển thị event timeline.
- Voice confirmation một lượt.

## 2.3 Không làm trong MVP

- Full autonomous voice agent.
- Thanh toán.
- Xuất hóa đơn.
- Tự submit Sales Order.
- Tự phê duyệt tín dụng.
- Voice cloning.
- Tích hợp trực tiếp cuộc gọi Zalo.
- Nhiều ERP.
- Nhiều vertical.
- Catalog hàng chục nghìn SKU.
- Workflow fulfillment đầy đủ.
- Agent tự thương lượng giá.
- AI tự chọn sản phẩm thay thế mà không có xác nhận.

---

# 3. Kịch bản demo chuẩn

## 3.1 Master data

Seed trước:

- 5 customer.
- 40–60 SKU.
- 2 warehouse.
- 2 price list.
- 5 nhóm sản phẩm có approved substitutes.
- 1 customer có lịch sử mua SKF.
- 1 customer được match bằng caller ID.
- 1 customer có hai địa chỉ giao hàng.
- 1 SKU có tên rất gần SKU khác để test ambiguity.

## 3.2 Nội dung hội thoại mẫu

Caller:

> “Alo em, anh Tuấn bên Cơ khí Minh Phát. Cho anh 20 vòng bi SKF 6205 hai RS với 8 dây B bảy hai, giao kho VSIP Bắc Ninh trước thứ tư.”

Hệ thống phải:

- Hiển thị live transcript.
- Dịch sang tiếng Anh.
- Match caller ID với Cơ khí Minh Phát.
- Tạo hai order lines.
- Resolve `SKF 6205 hai RS` → `SKF-6205-2RS`.
- Resolve `B bảy hai` → `BELT-B72`.
- Normalize “trước thứ tư” thành ngày cụ thể hoặc deadline window.
- Không tự điền email nếu ERP không có.

Caller sửa:

> “À không, vòng bi lấy 24 cái nhé.”

Hệ thống phải:

- Update quantity từ 20 → 24.
- Giữ audit history.
- Evidence mới thay evidence cũ cho field hiện tại.

ERP trả:

- SKF còn 18.
- NTN tương đương còn 20.

Reply Copilot đề xuất:

> “Hiện kho chỉ còn 18 vòng bi SKF 6205-2RS. Anh có đồng ý lấy 18 chiếc SKF và 6 chiếc NTN tương đương không?”

Caller:

> “Được, nhưng giao chung một lần.”

Hệ thống phải:

- `substitute_allowed = true`.
- Ghi yêu cầu `ship_together = true`.
- Không tự split delivery.
- Chuyển order sang `ready_for_approval` chỉ khi các field bắt buộc đủ.

Human bấm:

> **Create Draft Sales Order**

Kết quả:

```text
ERPNext Sales Order created
SO-2026-00041
Document Status: Draft
```

---

# 4. Kiến trúc tổng thể

```text
┌────────────────────────────────────────────────────────────────────┐
│                         AUDIO INTAKES                              │
│                                                                    │
│  1. Browser/Mobile Mic   2. PSTN/SIP Call   3. Zalo Replay       │
└──────────────┬────────────────────┬───────────────────┬────────────┘
               │                    │                   │
               ▼                    ▼                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                         CHANNEL ADAPTERS                           │
│ BrowserAudioAdapter | TelephonyAdapter | MediaReplayAdapter       │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                          MEDIA GATEWAY                             │
│ Decode → Normalize → Resample → PCM16 16k mono → Frame sequencing │
│ VAD/commit → Track metadata → Backpressure                        │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                         VALSEA ADAPTER                             │
│ RTT session caller / RTT session agent                            │
│ partial → UI only                                                  │
│ final → persisted                                                  │
└─────────────────────────────┬──────────────────────────────────────┘
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│                    TRANSCRIPT EVENT PIPELINE                      │
│ Source transcript → Translation → Evidence → Speaker → Timestamp  │
└──────────────┬──────────────────────────────────┬──────────────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────────┐    ┌───────────────────────────────┐
│ INCREMENTAL ORDER EXTRACTOR  │    │        REPLY COPILOT          │
│ Intent → JSON Patch          │    │ Missing fields + ERP facts    │
│ Revisions → Evidence         │    │ Suggested response            │
└──────────────┬───────────────┘    └───────────────┬───────────────┘
               ▼                                    │
┌──────────────────────────────┐                     │
│       ENTITY RESOLVER        │                     │
│ Customer / SKU / UOM / Date  │                     │
│ Address / Alias              │                     │
└──────────────┬───────────────┘                     │
               ▼                                    │
┌──────────────────────────────┐                     │
│       BUSINESS RULES         │◄────────────────────┘
│ Stock / Price / Delivery     │
│ Credit / Required fields     │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│      HUMAN APPROVAL GATE     │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│         ERP ADAPTER          │
│ ERPNext MVP / Odoo later     │
└──────────────────────────────┘
```

---

# 5. Kiến trúc repository

Dùng monorepo:

```text
ordervoice/
├── apps/
│   ├── web/                         # Next.js frontend
│   └── api/                         # NestJS/Fastify backend
│
├── packages/
│   ├── contracts/                   # Shared TypeScript + Zod schemas
│   ├── audio-core/                  # PCM, resample, queues, codecs
│   ├── intake-browser/              # Browser microphone adapter
│   ├── intake-telephony/            # Twilio/SIP Media Streams adapter
│   ├── intake-replay/               # Zalo audio/video synchronized replay
│   ├── valsea-client/               # RTT, translation, chat, TTS
│   ├── transcript-domain/           # Transcript events and persistence
│   ├── order-domain/                # Order aggregate and state machine
│   ├── order-extractor/             # LLM extraction + patch validation
│   ├── entity-resolver/             # Customer/SKU/UOM/date/address
│   ├── business-rules/              # Deterministic validation
│   ├── reply-copilot/               # Suggested replies
│   ├── erp-core/                     # ERP interface
│   ├── erpnext-adapter/              # ERPNext implementation
│   └── observability/                # Logs, metrics, traces
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── fixtures/
│   ├── audio/
│   ├── catalog/
│   ├── customers/
│   └── expected-results/
│
├── scripts/
│   ├── convert-audio.ts
│   ├── seed-erp.ts
│   └── benchmark.ts
│
├── docker/
│   ├── docker-compose.yml
│   └── erpnext/
│
├── docs/
│   ├── architecture.md
│   ├── demo-script.md
│   └── benchmark.md
│
├── .env.example
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## Công nghệ đề xuất

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js, React, TypeScript |
| UI state | Zustand hoặc TanStack Query + reducer |
| Backend | NestJS hoặc Fastify |
| Realtime app events | WebSocket |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Prisma |
| Browser audio | Web Audio API + AudioWorklet |
| Server audio | FFmpeg hoặc thư viện codec |
| Telephony | Twilio Media Streams hoặc SIP provider tương đương |
| ERP | ERPNext/Frappe REST API |
| Tests | Vitest/Jest + Playwright |
| Deployment | Docker Compose + public HTTPS/WSS |
| Queue | Không bắt buộc; chỉ thêm Redis nếu thật sự cần |

---

# 6. Ba audio intake bắt buộc

Tất cả intake phải triển khai cùng một interface và tạo ra `NormalizedAudioFrame`.

```typescript
export type AudioSpeaker = "caller" | "agent" | "unknown";

export type NormalizedAudioFrame = {
  sessionId: string;
  source: "browser" | "telephony" | "replay";
  trackId: string;
  speaker: AudioSpeaker;
  sequence: number;
  capturedAtMs: number;
  sampleRate: 16000;
  channels: 1;
  encoding: "pcm_s16le";
  pcm: Buffer;
  endOfUtterance?: boolean;
};

export interface AudioIntakeAdapter {
  start(sessionId: string): Promise<void>;
  stop(sessionId: string): Promise<void>;
  onFrame(handler: (frame: NormalizedAudioFrame) => Promise<void>): void;
  onError(handler: (error: Error) => void): void;
}
```

---

## 6.1 Intake 1 — Browser/mobile microphone

### Mục tiêu

Cho phép người dùng:

- Nói trực tiếp trên laptop.
- Mở PWA bằng điện thoại và nói.
- Dùng làm fallback live không phụ thuộc PSTN.
- Chọn vai trò speaker: `caller` hoặc `agent`.

### Luồng

```text
getUserMedia()
→ MediaStream
→ AudioContext
→ AudioWorklet
→ Float32 frames
→ resample 16 kHz
→ convert PCM16
→ app WebSocket
→ Media Gateway
→ VALSEA
```

### Frontend API

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
});
```

### Không dùng MediaRecorder làm live pipeline chính

`MediaRecorder` thường trả WebM/Opus chunks, phải decode lại ở server. Để giảm latency, dùng `AudioWorklet` để lấy raw samples.

Có thể dùng MediaRecorder song song chỉ để lưu file debug.

### AudioWorklet responsibilities

1. Nhận frame Float32.
2. Downmix mono nếu cần.
3. Resample từ browser sample rate xuống 16 kHz.
4. Convert sang signed 16-bit PCM.
5. Gửi frame khoảng 20–100 ms qua WebSocket.
6. Giữ sequence number.
7. Gửi `speech_start`, `speech_end` nếu có local VAD.

### Pseudocode

```typescript
class PcmProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]) {
    const input = inputs[0]?.[0];
    if (!input) return true;

    this.port.postMessage(input.slice(0));
    return true;
  }
}

registerProcessor("pcm-processor", PcmProcessor);
```

Main thread:

```typescript
workletNode.port.onmessage = (event) => {
  const float32 = event.data as Float32Array;
  const mono16k = resampleTo16k(float32, audioContext.sampleRate);
  const pcm16 = floatTo16BitPCM(mono16k);
  socket.send(pcm16.buffer);
};
```

### Speaker mapping

- Nếu trang “Customer call simulator”: speaker = `caller`.
- Nếu trang “Agent microphone”: speaker = `agent`.
- Có thể mở hai URL/QR khác nhau để có hai thiết bị.
- Mỗi track nên mở một VALSEA session riêng để không cần diarization.

### Acceptance criteria

- Transcript xuất hiện trong vài giây.
- Không gửi partial text vào order extractor.
- Mất mic permission phải có thông báo rõ.
- Khi tab background, hệ thống cảnh báo khả năng browser throttling.
- Có nút reconnect.
- Có level meter để biết mic đang hoạt động.

---

## 6.2 Intake 2 — Cuộc gọi điện thoại thật

### Mục tiêu

Người demo gọi vào một số điện thoại thật. Audio cuộc gọi được fork qua WebSocket vào backend và transcribe trực tiếp.

### Phương án khuyến nghị

Dùng Twilio Programmable Voice Media Streams hoặc provider có khả năng tương đương.

### Luồng inbound call

```text
Caller phone
→ Telephony provider
→ Incoming call webhook
→ TwiML/Call routing
→ Connect human agent hoặc second phone
→ Start Media Stream
→ Telephony WebSocket endpoint
→ Decode μ-law 8 kHz
→ PCM16 8 kHz
→ Resample PCM16 16 kHz
→ VALSEA RTT
```

### Hai chế độ telephony

#### A. Unidirectional listen-only copilot

- Stream cả inbound và outbound track nếu provider hỗ trợ.
- Backend nhận audio để transcription.
- Agent trả lời bằng điện thoại/browser bình thường.
- Hệ thống không gửi TTS vào cuộc gọi.

Đây là chế độ ưu tiên cho hackathon.

#### B. Bidirectional assisted voice reply

- Backend có thể gửi audio TTS trở lại cuộc gọi.
- Chỉ triển khai nếu phần lõi đã ổn.
- Dùng cho nút “Speak reply”.
- Chưa bật autonomous agent.

### Codec conversion

Telephony stream thường là:

```text
encoding: audio/x-mulaw
sample rate: 8000 Hz
channels: mono
payload: base64
```

VALSEA RTT khuyến nghị:

```text
Raw PCM signed 16-bit little-endian
sample rate: 16000 Hz
channels: mono
```

Pipeline:

```text
base64 payload
→ Buffer
→ μ-law decode
→ PCM16 8k
→ resample 16k
→ NormalizedAudioFrame
```

### Twilio-style WebSocket message

```json
{
  "event": "media",
  "streamSid": "MZ...",
  "media": {
    "track": "inbound",
    "timestamp": "120",
    "payload": "BASE64_MULAW"
  }
}
```

Mapping:

```typescript
const speaker =
  message.media.track === "inbound" ? "caller" : "agent";
```

### Hai VALSEA sessions

Mở riêng:

- `valseaSessionCaller`
- `valseaSessionAgent`

Lợi ích:

- Speaker separation deterministic.
- Không cần diarization.
- Transcript lane rõ.
- Có thể dùng hint context khác nhau nếu muốn.
- Giảm lỗi agent speech bị hiểu thành customer order.

### Incoming call flow

Backend endpoints:

```text
POST /api/telephony/incoming
WS   /api/media/telephony/:conversationId
POST /api/telephony/status
```

Pseudocode:

```typescript
app.post("/api/telephony/incoming", async (req, res) => {
  const conversation = await conversationService.create({
    source: "telephony",
    callerPhone: req.body.From,
  });

  const twiml = `
    <Response>
      <Start>
        <Stream url="wss://${PUBLIC_HOST}/api/media/telephony/${conversation.id}"
                track="both_tracks" />
      </Start>
      <Dial>${AGENT_PHONE}</Dial>
    </Response>
  `;

  res.type("text/xml").send(twiml);
});
```

Lưu ý: cú pháp cụ thể tùy provider và version. Coding agent phải đọc official provider docs khi triển khai.

### Caller ID

Caller ID là nguồn ưu tiên để:

1. Normalize số điện thoại.
2. Tra contact/customer trong ERP.
3. Tạo customer candidates.
4. Tạo dynamic `hint_text` cho VALSEA từ lịch sử mua hàng.

Không tin tuyệt đối caller ID nếu hệ thống production; demo có thể dùng số seed.

### Telephony errors

Phải xử lý:

- `connected`
- `start`
- `media`
- `stop`
- out-of-order sequence
- reconnect
- unknown track
- malformed base64
- no audio
- provider signature invalid

### Security

- Validate provider signature.
- Chỉ chấp nhận WSS.
- Không log API secret.
- Không giữ raw phone audio quá lâu.
- Dùng dữ liệu khách hàng giả trong demo.

### Acceptance criteria

- Caller gọi vào số thật.
- Transcript inbound xuất hiện đúng lane caller.
- Nếu outbound track có sẵn, transcript agent xuất hiện lane agent.
- Customer được tìm theo caller ID.
- Khi call kết thúc, session được stop.
- Nếu phone stream lỗi, hệ thống chuyển sang browser/replay demo mà không crash.

---

## 6.3 Intake 3 — Zalo audio/video synchronized replay

### Định nghĩa chính xác

MVP không tích hợp live call audio trực tiếp từ Zalo.

Hệ thống nhận:

- File audio voice note được tải xuống từ Zalo.
- File video quay lại cuộc hội thoại.
- File MP3/M4A/WAV/OGG/WebM/MP4 do đội chuẩn bị.
- Nội dung hiển thị trong giao diện giống Zalo hoặc video gốc.

Audio/video được phát đến đâu thì dữ liệu âm thanh được stream vào VALSEA đến đó. Transcript xuất hiện đồng bộ với playback.

### Không được làm sai

Không upload toàn bộ file vào batch transcription rồi giả lập typing transcript.

Phải thực sự stream audio theo tốc độ phát hoặc stream từ media timeline hiện tại.

### Hai cách triển khai

#### Cách A — Browser media element + Web Audio API

```text
<input type=file>
→ URL.createObjectURL
→ <audio> hoặc <video>
→ createMediaElementSource()
→ AudioWorklet
→ PCM16 16k
→ app WebSocket
→ VALSEA RTT
```

Pseudocode:

```typescript
const media = document.querySelector("video");
const source = audioContext.createMediaElementSource(media);
const worklet = new AudioWorkletNode(audioContext, "pcm-processor");

source.connect(worklet);
worklet.connect(audioContext.destination);
```

Ưu điểm:

- Audio phát tới đâu stream tới đó.
- Đồng bộ trực tiếp với UI timeline.
- Có pause/resume.
- Dễ demo.

Cần tránh loop audio output vào microphone.

#### Cách B — Server-side real-time paced streaming

```text
Upload media
→ FFmpeg decode PCM16 16k
→ backend đọc chunks
→ sleep theo duration từng chunk
→ stream VALSEA
→ frontend video chạy cùng start timestamp
```

Ưu điểm:

- Browser đơn giản hơn.
- Codec coverage tốt.
- Kết quả ổn định hơn.

Nhược điểm:

- Cần đồng bộ clock frontend/backend.
- Pause/seek phức tạp hơn.

Khuyến nghị: dùng Cách A làm chính; Cách B làm fallback nếu browser decoding không ổn.

### Replay session controls

- Upload/select fixture.
- Play.
- Pause.
- Restart.
- Playback speed phải mặc định 1×.
- Seek nên disable trong demo hoặc phải reset transcript state.
- Reset phải xóa transcript/order của phiên hiện tại hoặc tạo session mới.
- Hiển thị `Replay mode` rõ ràng, không tuyên bố là live Zalo integration.

### Speaker mapping

Có ba phương án:

1. Fixture có hai audio tracks riêng → mở hai VALSEA sessions.
2. Video có audio mixed → dùng diarization nếu sandbox hỗ trợ ổn định.
3. Demo script xen kẽ và người vận hành gán speaker từng segment → chấp nhận cho fallback nhưng không nên là primary.

Khuyến nghị:

- Tạo fixture với hai track hoặc stereo.
- Tách channel trái/phải thành caller/agent trước khi stream.
- Mỗi channel downmix thành mono và gửi session riêng.

### File preprocessing fixture

Script:

```bash
ffmpeg -i zalo-demo.mp4 \
  -filter_complex "[0:a]channelsplit=channel_layout=stereo[left][right]" \
  -map "[left]" -ar 16000 -ac 1 caller.wav \
  -map "[right]" -ar 16000 -ac 1 agent.wav
```

Nếu source mono, chuẩn bị metadata transcript ground truth để benchmark nhưng không hard-code output.

### Acceptance criteria

- Video/audio phát đến đâu transcript xuất hiện đến đó.
- Pause playback thì audio streaming dừng.
- Resume không tạo duplicated frames.
- Restart tạo session sạch.
- Order update theo final segments.
- Mid-call correction được xử lý đúng.
- Replay mode hoạt động khi telephony unavailable.

---

# 7. Media Gateway

## 7.1 Trách nhiệm

Media Gateway phải:

1. Nhận audio từ các adapter.
2. Chuẩn hóa format.
3. Tách track.
4. Giữ sequence.
5. Resample.
6. Chunk audio.
7. Backpressure.
8. Gửi vào VALSEA.
9. Commit utterance khi cần.
10. Ghi latency metrics.
11. Không trộn các session.

## 7.2 Format chuẩn nội bộ

```text
PCM signed 16-bit little-endian
16,000 Hz
mono
frame duration: 20–100 ms
```

Ví dụ 100 ms:

```text
16000 samples/sec × 0.1 sec × 2 bytes = 3200 bytes
```

## 7.3 Resampling

Có thể dùng:

- FFmpeg process.
- `soxr`.
- `audio-resampler`.
- Custom linear interpolation chỉ cho demo, không nên cho production.

Không dùng naive sample dropping nếu chất lượng giảm mạnh.

## 7.4 Backpressure

Nếu VALSEA socket chưa ready:

- Buffer tối đa 1–3 giây.
- Sau ngưỡng thì drop oldest hoặc fail session rõ ràng.
- Không buffer vô hạn.

Nếu reconnect:

- Không gửi lại audio đã committed.
- Mark transcript gap.
- Hiển thị warning.

## 7.5 VAD và commit

VALSEA có thể xử lý segment final theo backend, nhưng client có thể gửi:

```json
{"type":"audio.commit"}
```

khi phát hiện user dừng nói.

MVP có thể:

- Dùng silence threshold local 500–900 ms.
- Hoặc gửi continuous audio và dựa vào server.
- Với replay, không commit mỗi chunk; commit theo silence/VAD.
- Khi session stop, gửi final commit trước.

---

# 8. VALSEA integration

## 8.1 Endpoint realtime

```text
wss://api.valsea.ai/v1/realtime
```

Authentication từ backend:

```http
Authorization: Bearer <VALSEA_API_KEY>
```

Không đưa API key vào frontend production.

## 8.2 Session start

```json
{
  "type": "session.start",
  "model": "valsea-rtt",
  "language": "vietnamese",
  "hint_text": "SKF, NTN, 6205-2RS, B-72, VSIP Bắc Ninh, Cơ khí Minh Phát",
  "enable_correction": true,
  "diarize": false
}
```

## 8.3 Audio append

```json
{
  "type": "audio.append",
  "audio": "BASE64_PCM16"
}
```

Có thể gửi binary PCM16 nếu adapter/client phù hợp, nhưng chuẩn hóa thành một cách trong backend để dễ debug.

## 8.4 Partial và final

```typescript
if (event.type === "transcript.partial") {
  emitToUi(event);
  // Không persist là final.
  // Không chạy order extractor.
}

if (event.type === "transcript.final") {
  persistFinalSegment(event);
  emitToUi(event);
  enqueueTranslation(event);
  enqueueOrderExtraction(event);
}
```

## 8.5 Translation strategy

### Phương án ưu tiên

Không đặt `target_language` trong RTT session.

Lý do:

- Giữ original transcript rõ ràng.
- Có thể đổi target language giữa cuộc gọi.
- Translation là luồng phụ.
- Order extraction luôn dùng source text.
- Dễ audit.

Gọi:

```http
POST https://api.valsea.ai/v1/translations
```

Body:

```json
{
  "model": "valsea-translate",
  "text": "Cho anh 20 vòng bi SKF 6205 hai RS",
  "target": "english"
}
```

### Phương án demo shortcut

Có thể dùng compact interpreter mode của RTT nếu cần cả original và translation trong final event.

Chỉ dùng nếu đã kiểm tra sandbox trả đúng hai trường:

```json
{
  "type": "final",
  "text": "original text",
  "translation": "translated text"
}
```

Không dùng mode mà `text` bị thay hoàn toàn bằng translation nếu làm mất source transcript.

## 8.6 Dynamic hint text

Không gửi toàn bộ catalog.

Tạo hint theo conversation:

```text
Common brands
+ top products by customer purchase history
+ customer/company names
+ warehouse/address aliases
+ common industrial units
```

Ví dụ:

```typescript
const hints = [
  ...customer.topSkuCodes,
  ...customer.brandPreferences,
  ...companyAlias,
  ...deliveryAddressAliases,
].slice(0, MAX_HINT_ITEMS);
```

Phải xác minh giới hạn sandbox tại kickoff.

## 8.7 Failure handling

Nếu VALSEA lỗi:

- Emit `transcription.error`.
- Không update order.
- Cho phép retry/reconnect.
- Replay fixture có thể chạy lại.
- Không dùng transcript cũ cho audio mới.
- Không tự chuyển sang ASR khác trong bước bắt buộc nếu hackathon yêu cầu VALSEA.

---

# 9. Transcript domain

## 9.1 Data type

```typescript
export type TranscriptSegment = {
  id: string;
  conversationId: string;
  source: "browser" | "telephony" | "replay";
  trackId: string;
  speaker: "caller" | "agent" | "unknown";

  status: "partial" | "final";
  rawText?: string;
  sourceText: string;

  sourceLanguage?: string;
  translationTarget?: string;
  translatedText?: string;
  translationStatus?: "pending" | "complete" | "failed";

  startedAtMs?: number;
  endedAtMs?: number;
  sourceTimestampMs?: number;

  valseaSessionId?: string;
  valseaEventId?: string;

  createdAt: string;
};
```

## 9.2 Persistence rule

- Partial: lưu trong memory hoặc ephemeral store.
- Final: persist database.
- Translation: update final segment.
- Không concatenate toàn bộ transcript rồi parse lại mỗi lần nếu không cần.
- Có thể tạo `conversation_snapshot` định kỳ.

## 9.3 UI rules

- Partial màu xám/italic.
- Final màu chính.
- Translation màu phụ.
- Speaker rõ.
- Timestamp.
- Bấm segment để nghe lại nếu audio được giữ tạm.
- Highlight segment evidence khi hover field.

---

# 10. Order data model

## 10.1 Field value có evidence

```typescript
export type FieldSource =
  | "caller_speech"
  | "agent_speech"
  | "agent_confirmation"
  | "caller_confirmation"
  | "erp"
  | "manual";

export type FieldStatus =
  | "empty"
  | "provisional"
  | "resolved"
  | "needs_review"
  | "confirmed"
  | "blocked";

export type FieldValue<T> = {
  value: T | null;
  normalizedValue?: T | null;
  status: FieldStatus;
  confidence: number;

  evidenceSegmentIds: string[];
  evidenceText: string[];

  source: FieldSource;
  resolvedAgainst?: string;
  candidates?: Array<{
    id: string;
    label: string;
    score: number;
  }>;

  updatedAt: string;
};
```

## 10.2 Order aggregate

```typescript
export type OrderDraftStatus =
  | "capturing"
  | "needs_information"
  | "needs_review"
  | "ready_for_approval"
  | "exporting"
  | "exported"
  | "failed";

export type OrderDraft = {
  id: string;
  conversationId: string;
  version: number;
  status: OrderDraftStatus;

  customer: {
    customerId: FieldValue<string>;
    contactName: FieldValue<string>;
    companyName: FieldValue<string>;
    phone: FieldValue<string>;
    email: FieldValue<string>;
    taxId: FieldValue<string>;
  };

  delivery: {
    addressId: FieldValue<string>;
    addressText: FieldValue<string>;
    requestedDate: FieldValue<string>;
    requestedTimeWindow: FieldValue<string>;
    shipTogether: FieldValue<boolean>;
  };

  lines: OrderLine[];

  commercial: {
    currency: FieldValue<string>;
    paymentTerm: FieldValue<string>;
    purchaseOrderReference: FieldValue<string>;
    notes: FieldValue<string>;
  };

  missingFields: string[];
  validationErrors: ValidationError[];
  warnings: ValidationWarning[];

  approval: {
    approvedBy?: string;
    approvedAt?: string;
  };

  erp: {
    provider: "erpnext";
    documentId?: string;
    exportedAt?: string;
    idempotencyKey?: string;
  };

  createdAt: string;
  updatedAt: string;
};
```

## 10.3 Order line

```typescript
export type OrderLine = {
  id: string;

  spokenProductText: FieldValue<string>;
  requestedBrand: FieldValue<string>;
  resolvedItemCode: FieldValue<string>;

  quantity: FieldValue<number>;
  uom: FieldValue<string>;

  substituteAllowed: FieldValue<boolean>;
  requestedSubstituteBrand: FieldValue<string>;

  unitPrice: FieldValue<number>;
  availableStock: FieldValue<number>;
  warehouseId: FieldValue<string>;

  lineStatus:
    | "capturing"
    | "unresolved"
    | "resolved"
    | "out_of_stock"
    | "needs_confirmation"
    | "valid";
};
```

---

# 11. Incremental order extraction

## 11.1 Nguyên tắc

Không gọi LLM để sinh lại toàn bộ order sau mỗi segment.

LLM chỉ tạo event/patch dựa trên:

- Segment final mới.
- Một phần order state cần thiết.
- Một số segment context gần nhất.
- Speaker role.
- Danh sách intent/schema.

## 11.2 Patch format

```typescript
export type OrderPatchOperation = {
  op: "add" | "replace" | "remove";
  path: string;
  value?: unknown;

  confidence: number;
  evidenceSegmentIds: string[];
  evidenceText: string[];

  semanticAction:
    | "set_customer"
    | "set_contact"
    | "add_item"
    | "change_quantity"
    | "remove_item"
    | "set_delivery"
    | "allow_substitute"
    | "confirm_field"
    | "add_note"
    | "unknown";
};
```

## 11.3 Ví dụ add item

Input:

> “Cho anh 20 vòng bi SKF 6205 hai RS.”

Output:

```json
{
  "operations": [
    {
      "op": "add",
      "path": "/lines/-",
      "value": {
        "spokenProductText": "vòng bi SKF 6205 hai RS",
        "requestedBrand": "SKF",
        "quantity": 20,
        "uom": "cái"
      },
      "confidence": 0.96,
      "evidenceSegmentIds": ["seg-12"],
      "evidenceText": ["Cho anh 20 vòng bi SKF 6205 hai RS"],
      "semanticAction": "add_item"
    }
  ]
}
```

## 11.4 Ví dụ correction

Input:

> “À không, vòng bi lấy 24 cái nhé.”

Output:

```json
{
  "operations": [
    {
      "op": "replace",
      "path": "/lines/0/quantity",
      "value": 24,
      "confidence": 0.98,
      "evidenceSegmentIds": ["seg-15"],
      "evidenceText": ["vòng bi lấy 24 cái"],
      "semanticAction": "change_quantity"
    }
  ]
}
```

## 11.5 Speaker rules

Caller speech:

- Có thể tạo yêu cầu.
- Có thể sửa order.
- Có thể xác nhận.

Agent speech:

- Không mặc định là customer request.
- Câu agent đọc lại chỉ là proposed confirmation.
- Chỉ update field thành confirmed khi caller đồng ý.

Ví dụ:

Agent:

> “Anh lấy 24 chiếc đúng không?”

Không được update order chỉ vì agent nói 24.

Caller:

> “Đúng rồi.”

Khi đó extractor cần tham chiếu pending confirmation và mark confirmed.

## 11.6 Prompt bắt buộc cho extractor

System prompt skeleton:

```text
You are an incremental order-event extractor.

Your task is to convert ONLY the latest finalized transcript segment into
safe order patch operations.

Rules:
1. Never invent a value.
2. Every operation must include exact evidence from the transcript.
3. Never create ERP item codes.
4. Extract spoken product text only; product resolution is a separate tool.
5. Do not use translated text as the source.
6. Agent speech is not a customer instruction unless the caller confirms it.
7. When a speaker corrects an earlier value, replace the previous value.
8. When the reference is ambiguous, return no patch and add a clarification need.
9. Do not infer email, phone, tax code, delivery date, price or inventory.
10. If a field was not spoken, use null or omit the operation.
11. Output strict JSON matching the supplied schema.
```

## 11.7 Validation

Mọi output LLM phải:

1. Parse JSON.
2. Validate Zod.
3. Validate path allowlist.
4. Validate type.
5. Validate evidence segment tồn tại.
6. Check speaker permission.
7. Apply domain invariant.
8. Persist event.
9. Rebuild order state.

Nếu fail:

- Không apply patch.
- Log structured error.
- Mark segment `extraction_failed`.
- Cho phép manual retry.

---

# 12. Event sourcing và revision handling

## 12.1 Tại sao cần event log

Khách thường:

- Sửa số lượng.
- Đổi địa chỉ.
- Thêm/bớt sản phẩm.
- Đổi ngày giao.
- Phủ định câu trước.
- Xác nhận sau khi agent đọc lại.

Lưu event giúp:

- Audit.
- Undo.
- Demo lịch sử.
- Rebuild order.
- Debug AI.

## 12.2 Event type

```typescript
export type OrderDomainEvent =
  | { type: "FIELD_SET"; payload: unknown }
  | { type: "FIELD_CONFIRMED"; payload: unknown }
  | { type: "ITEM_ADDED"; payload: unknown }
  | { type: "ITEM_UPDATED"; payload: unknown }
  | { type: "ITEM_REMOVED"; payload: unknown }
  | { type: "ENTITY_RESOLVED"; payload: unknown }
  | { type: "VALIDATION_UPDATED"; payload: unknown }
  | { type: "HUMAN_EDITED"; payload: unknown }
  | { type: "ORDER_APPROVED"; payload: unknown }
  | { type: "ERP_EXPORT_SUCCEEDED"; payload: unknown }
  | { type: "ERP_EXPORT_FAILED"; payload: unknown };
```

## 12.3 Optimistic concurrency

Order draft có `version`.

Apply patch:

```text
expectedVersion = currentVersion
→ transaction
→ append events
→ increment version
→ update snapshot
```

Nếu version conflict:

- Re-read state.
- Re-evaluate patch hoặc reject.
- Không overwrite human edit.

---

# 13. Entity Resolver

## 13.1 Mục tiêu

LLM hiểu cách người dùng nói; resolver đối chiếu với master data thật.

Không cho LLM tự định nghĩa:

- `customer_id`
- `item_code`
- `address_id`
- `warehouse_id`
- `uom_id`
- giá
- tồn kho

## 13.2 Customer resolution

Thứ tự:

1. Caller ID exact match.
2. ERP contact phone exact match.
3. Company alias match.
4. Contact name + company match.
5. Fuzzy search.
6. Human selection.

Ví dụ:

```typescript
interface CustomerResolver {
  resolveByPhone(phone: string): Promise<CustomerCandidate[]>;
  searchByName(query: string): Promise<CustomerCandidate[]>;
}
```

Nếu nhiều candidate:

- Field = `needs_review`.
- Hiển thị top 3.
- Không tự chọn.

## 13.3 Product resolution

Pipeline:

```text
spoken product
→ normalize text
→ normalize spoken numbers
→ brand extraction
→ exact alias lookup
→ SKU token search
→ fuzzy/embedding candidates
→ customer purchase history rerank
→ business constraints
→ top candidates
```

Ví dụ normalize:

```text
“sáu hai không năm hai R S”
→ “6205 2RS”

“B bảy hai”
→ “B-72”
```

## 13.4 Candidate policy

Auto-resolve chỉ khi:

- score >= `AUTO_RESOLVE_THRESHOLD`
- margin top1 - top2 >= `MIN_MARGIN`
- brand/dimension không conflict
- item active
- UOM compatible

Ví dụ:

```typescript
const AUTO_RESOLVE_THRESHOLD = 0.92;
const MIN_MARGIN = 0.15;
```

Nếu không đạt:

- Mark field yellow.
- Block export.
- Reply Copilot tạo câu hỏi xác nhận.

## 13.5 UOM resolution

Aliases:

```text
cái, chiếc → Piece
hộp → Box
thùng → Carton
mét → Meter
cuộn → Roll
kg, ký → Kilogram
```

Không convert giữa UOM nếu chưa có ERP conversion rule.

## 13.6 Date/time normalization

Input:

- “mai”
- “thứ tư”
- “trước thứ tư”
- “cuối tuần”
- “giao sáng”
- “chuyến đầu”

Output phải chứa:

```typescript
type NormalizedTemporal = {
  originalText: string;
  exactDate?: string;
  startDate?: string;
  endDate?: string;
  timeWindow?: string;
  ambiguity: boolean;
};
```

Không tự chọn exact date nếu cụm từ mơ hồ.

---

# 14. Business rules engine

## 14.1 Deterministic rules

Rules engine không dùng LLM để quyết định:

- Required fields.
- SKU validity.
- Stock.
- Price.
- Credit limit.
- Delivery date availability.
- Approved substitute.
- Minimum order quantity.
- Customer active/inactive.
- Address ownership.
- Currency.
- ERP document creation.

## 14.2 Required fields cho demo

Order ready khi có:

- Customer.
- Contact hoặc phone.
- Ít nhất một line.
- Mỗi line có resolved item.
- Quantity > 0.
- UOM hợp lệ.
- Delivery address.
- Requested delivery date/window hoặc explicit “chưa xác định”.
- Không có blocking errors.

## 14.3 Validation structure

```typescript
export type ValidationError = {
  code: string;
  path: string;
  message: string;
  blocking: true;
};

export type ValidationWarning = {
  code: string;
  path: string;
  message: string;
  blocking: false;
};
```

## 14.4 Rules ví dụ

```text
ITEM_UNRESOLVED
QUANTITY_INVALID
UOM_MISMATCH
CUSTOMER_AMBIGUOUS
ADDRESS_NOT_FOUND
INSUFFICIENT_STOCK
SUBSTITUTE_NOT_APPROVED
DELIVERY_DATE_AMBIGUOUS
CREDIT_HOLD
EMAIL_UNCONFIRMED
PHONE_INVALID
```

## 14.5 Stock handling

Nếu stock thiếu:

- Không tự đổi SKU.
- Mark warning/error.
- Query approved substitutes.
- Reply Copilot hỏi khách.
- Human/caller confirm.
- Chỉ sau đó update order lines.

---

# 15. Reply Copilot

## 15.1 Mục tiêu

Gợi ý câu trả lời ngắn cho nhân viên dựa trên:

- Câu caller vừa nói.
- Order state.
- Missing fields.
- Validation errors.
- ERP facts.
- Ngôn ngữ caller.
- Ngôn ngữ agent.

## 15.2 Output schema

```typescript
export type ReplySuggestion = {
  id: string;
  conversationId: string;

  purpose:
    | "ask_missing_field"
    | "confirm_order"
    | "clarify_product"
    | "offer_substitute"
    | "explain_stock"
    | "confirm_delivery"
    | "acknowledge"
    | "escalate";

  callerLanguageText: string;
  agentLanguageText?: string;

  factsUsed: Array<{
    type: string;
    key: string;
    value: string;
  }>;

  requiresHumanApproval: true;
  generatedAt: string;
};
```

## 15.3 Prompt rules

```text
You are a human-agent reply copilot.

Use only the supplied transcript facts and ERP facts.

Rules:
1. Never invent price, stock, delivery promise, discount or policy.
2. Never say an order was created until ERP export succeeds.
3. Never auto-accept a substitute.
4. Ask at most one or two questions per reply.
5. Keep replies brief and natural for a phone conversation.
6. Reply in the caller's language.
7. Include important numbers and SKU names exactly as provided.
8. If information is missing or conflicting, ask for clarification.
9. If no safe reply can be generated, request human escalation.
10. Output strict JSON.
```

## 15.4 Trigger conditions

Generate reply when:

- Product ambiguous.
- Quantity missing.
- Delivery address missing.
- Date ambiguous.
- Stock insufficient.
- Customer match ambiguous.
- Agent clicks “Suggest reply”.
- Order ready and cần read-back confirmation.

## 15.5 Human-in-the-loop

Buttons:

- Edit.
- Copy.
- Send to reply box.
- Speak with TTS.
- Dismiss.
- Mark asked.

Không tự phát audio trong MVP.

---

# 16. VALSEA TTS và future voice agent

## 16.1 Assisted TTS

Flow:

```text
Suggested reply
→ Human review
→ Click Speak
→ VALSEA realtime TTS
→ Browser playback
```

VALSEA docs mô tả:

```text
wss://api.valsea.ai/v1/realtime/tts
```

Message:

```json
{
  "type": "speak",
  "text": "Hiện kho chỉ còn 18 chiếc...",
  "voice": "valsea-default",
  "audio_format": "mp3"
}
```

## 16.2 Telephony playback bonus

Nếu bidirectional media stream:

```text
VALSEA TTS audio
→ decode
→ resample 8 kHz
→ μ-law encode
→ base64
→ telephony media message
```

Phải có:

- Human approval.
- Mark messages.
- Clear audio buffer khi interrupt.
- Không để TTS nói đè caller.
- Chưa làm autonomous barge-in trong MVP.

## 16.3 Roadmap autonomous agent

### Stage 1 — Listen-only copilot

- Transcript.
- Translation.
- Order form.
- Reply suggestions.
- Human speaks.
- Human approves ERP.

### Stage 2 — One-click speech

- Human approves reply.
- TTS speaks.
- Human approves ERP.

### Stage 3 — Assisted autopilot

Agent tự hỏi low-risk missing fields:

- Tên.
- Số lượng.
- Địa chỉ.
- Ngày mong muốn.
- Read-back confirmation.

### Stage 4 — Low-risk autonomous orders

Chỉ khi:

- Existing verified customer.
- Exact SKU.
- Fixed contract price.
- Sufficient stock.
- Known address.
- Under order value threshold.
- No credit hold.
- Explicit caller confirmation.

### Stage 5 — Full voice agent

Cần thêm:

- Barge-in.
- Turn detection.
- Call transfer.
- Session memory.
- Tool permissions.
- Escalation.
- Fraud controls.
- Compliance.
- Recovery.
- Monitoring.

---

# 17. ERP integration

## 17.1 ERP MVP

Dùng ERPNext/Frappe.

Lý do:

- Có REST API.
- Có Customer.
- Có Item.
- Có Item Price.
- Có Warehouse.
- Có Sales Order.
- Có thể tạo Draft document.
- Có thể self-host hoặc dùng instance test.

## 17.2 Adapter interface

```typescript
export interface ERPAdapter {
  findCustomerByPhone(phone: string): Promise<CustomerCandidate[]>;

  searchCustomers(query: string): Promise<CustomerCandidate[]>;

  searchItems(query: string): Promise<ProductCandidate[]>;

  getInventory(
    itemCodes: string[],
    warehouseIds?: string[],
  ): Promise<InventoryResult[]>;

  getCustomerPrices(
    customerId: string,
    itemCodes: string[],
  ): Promise<PriceResult[]>;

  getApprovedSubstitutes(
    itemCode: string,
  ): Promise<ProductCandidate[]>;

  getCustomerAddresses(
    customerId: string,
  ): Promise<AddressCandidate[]>;

  createDraftSalesOrder(
    order: OrderDraft,
    idempotencyKey: string,
  ): Promise<ERPExportResult>;
}
```

## 17.3 ERPNext API

Frappe tạo document bằng:

```http
POST /api/resource/Sales Order
```

Body mẫu:

```json
{
  "customer": "CUST-MINH-PHAT",
  "transaction_date": "2026-07-18",
  "delivery_date": "2026-07-22",
  "items": [
    {
      "item_code": "SKF-6205-2RS",
      "qty": 18,
      "uom": "Nos",
      "warehouse": "Main Warehouse"
    },
    {
      "item_code": "NTN-6205-2RS",
      "qty": 6,
      "uom": "Nos",
      "warehouse": "Main Warehouse"
    }
  ],
  "remarks": "Customer requested all items shipped together."
}
```

Document mới tạo ở `docstatus = 0`/Draft.

Không gọi submit.

## 17.4 Idempotency

Frappe REST create không mặc định nhận idempotency key như payment API. Backend phải tự đảm bảo.

Cách:

```text
idempotencyKey = sha256(conversationId + orderVersion)
```

Database table:

```text
erp_exports
- idempotency_key UNIQUE
- order_id
- order_version
- status
- provider
- external_document_id
```

Flow:

```text
BEGIN
insert export row with unique key
if duplicate:
    return existing result
call ERP
update external ID
COMMIT
```

Cần cân nhắc transaction ngoại hệ thống; MVP có thể dùng status `started` và recovery lookup.

## 17.5 Export gate

Trước export:

1. Check latest order version.
2. Validate all blocking rules.
3. Ensure human approval.
4. Ensure no unresolved candidates.
5. Generate idempotency key.
6. Lock export.
7. Call ERP.
8. Persist result.
9. Emit success/failure.

---

# 18. Backend API contract

## 18.1 REST

```text
POST   /api/conversations
GET    /api/conversations/:id
POST   /api/conversations/:id/stop

POST   /api/intakes/browser/:conversationId/start
POST   /api/intakes/replay/:conversationId/upload
POST   /api/intakes/replay/:conversationId/start
POST   /api/intakes/replay/:conversationId/pause
POST   /api/intakes/replay/:conversationId/reset

POST   /api/telephony/incoming
POST   /api/telephony/status

GET    /api/orders/:orderId
POST   /api/orders/:orderId/patch
POST   /api/orders/:orderId/confirm-field
POST   /api/orders/:orderId/resolve-customer
POST   /api/orders/:orderId/resolve-item
POST   /api/orders/:orderId/approve
POST   /api/orders/:orderId/export

POST   /api/replies/:conversationId/generate
POST   /api/replies/:replyId/speak

GET    /api/erp/customers/search
GET    /api/erp/items/search
GET    /api/erp/orders/:externalId
```

## 18.2 WebSocket

```text
WS /api/media/browser/:conversationId?track=caller
WS /api/media/replay/:conversationId?track=caller
WS /api/media/telephony/:conversationId
WS /api/events/:conversationId
```

## 18.3 Event contract

```typescript
export type SessionEvent =
  | {
      type: "session.status";
      status: "created" | "ready" | "active" | "stopped" | "error";
    }
  | {
      type: "audio.status";
      source: "browser" | "telephony" | "replay";
      state: "connected" | "streaming" | "paused" | "disconnected";
    }
  | {
      type: "transcript.partial";
      segment: TranscriptSegment;
    }
  | {
      type: "transcript.final";
      segment: TranscriptSegment;
    }
  | {
      type: "translation.final";
      segmentId: string;
      target: string;
      text: string;
    }
  | {
      type: "order.patch";
      orderId: string;
      version: number;
      operations: OrderPatchOperation[];
    }
  | {
      type: "order.snapshot";
      order: OrderDraft;
    }
  | {
      type: "order.validation";
      errors: ValidationError[];
      warnings: ValidationWarning[];
    }
  | {
      type: "reply.suggested";
      reply: ReplySuggestion;
    }
  | {
      type: "erp.export.started";
      orderId: string;
    }
  | {
      type: "erp.export.succeeded";
      orderId: string;
      erpDocumentId: string;
    }
  | {
      type: "erp.export.failed";
      orderId: string;
      message: string;
    }
  | {
      type: "system.warning";
      code: string;
      message: string;
    };
```

---

# 19. Database model gợi ý

## 19.1 Core tables

```text
users
conversations
audio_tracks
transcript_segments
translation_results
order_drafts
order_events
order_lines
order_field_evidence
validation_results
reply_suggestions
erp_exports
audit_logs
```

## 19.2 Conversation

```text
conversations
- id UUID
- source ENUM(browser, telephony, replay)
- status
- caller_phone
- target_translation_language
- started_at
- ended_at
- metadata JSONB
```

## 19.3 Transcript segment

```text
transcript_segments
- id UUID
- conversation_id
- track_id
- speaker
- status
- source_text
- raw_text
- source_language
- translated_text
- translation_target
- started_at_ms
- ended_at_ms
- source_timestamp_ms
- valsea_session_id
- created_at
```

## 19.4 Order event

```text
order_events
- id UUID
- order_id
- order_version
- event_type
- payload JSONB
- evidence_segment_ids UUID[]
- actor_type ENUM(ai, human, system, erp)
- actor_id
- created_at
```

## 19.5 Audit log

Audit mọi:

- Human edit.
- AI patch.
- Candidate selection.
- Approval.
- ERP export.
- Error.
- Retry.

---

# 20. Frontend UX

## 20.1 Layout ba cột

### Cột 1 — Live Conversation

- Caller lane.
- Agent lane.
- Partial transcript.
- Final transcript.
- Translation.
- Timestamp.
- Audio source indicator.
- Play evidence.
- Network/VALSEA status.

### Cột 2 — Draft Order

Customer section:

- Customer.
- Contact.
- Phone.
- Email.
- Company.
- Delivery address.
- Delivery date.

Items table:

| Spoken product | ERP item | Qty | UOM | Stock | Price | Confidence | State |
|---|---|---:|---|---:|---:|---:|---|

### Cột 3 — ERP Context & Reply

- Purchase history.
- Stock.
- Price tier.
- Approved substitutes.
- Missing fields.
- Blocking errors.
- Suggested reply.
- Buttons Speak/Edit/Copy.
- Approve order.
- Export ERP.

## 20.2 Field colors

- Gray: empty.
- Light blue: provisional.
- Green: resolved/confirmed.
- Yellow: needs review.
- Red: blocked/error.
- Purple icon: source from ERP.

## 20.3 Evidence interaction

Hover field:

- Highlight transcript segment.
- Show evidence text.
- Show confidence.
- Show source.
- Show revision history.

## 20.4 Intake selector

Top bar:

```text
[ Browser Mic ] [ Phone Call ] [ Zalo Replay ]
```

Mỗi mode hiển thị trạng thái và instructions riêng.

---

# 21. Security và privacy

## 21.1 Secrets

Backend-only:

- `VALSEA_API_KEY`
- `ERP_API_KEY`
- `ERP_API_SECRET`
- `TELEPHONY_AUTH_TOKEN`
- LLM/API secrets.

Không để trong browser bundle.

## 21.2 Audio retention

Hackathon:

- Dùng audio synthetic hoặc consented.
- Raw audio có thể lưu tạm để replay evidence.
- Tự động xóa sau phiên hoặc sau thời hạn ngắn.
- Không train model bằng audio này.
- Không dùng dữ liệu khách thật.

## 21.3 PII

Mask trong log:

- Phone.
- Email.
- Tax ID.
- Address.

UI demo có thể hiển thị dữ liệu giả.

## 21.4 Tool permissions

LLM:

- Không gọi ERP trực tiếp.
- Không có API secret.
- Chỉ trả JSON.
- Backend validate.
- Human approve.
- Rules engine quyết định action allowed.

## 21.5 Telephony

- Validate webhook signature.
- WSS only.
- Reject unknown conversation ID.
- Expiring media token.
- Rate limiting.
- Limit payload size.
- Validate sequence/message type.

---

# 22. Observability

## 22.1 Structured logs

Fields:

```text
conversationId
trackId
source
valseaSessionId
segmentId
orderId
orderVersion
latencyMs
eventType
errorCode
```

Không log raw secret hoặc full PII.

## 22.2 Metrics

- Audio intake connected duration.
- VALSEA session connect latency.
- Partial latency.
- Final latency.
- Translation latency.
- Extraction latency.
- Entity resolution latency.
- Reply generation latency.
- ERP export latency.
- Number of human edits.
- Number of unresolved fields.
- Order completion time.
- Duplicate export attempts prevented.

## 22.3 Demo dashboard metrics

Hiển thị tối thiểu:

- Time from speech to final transcript.
- Time from final transcript to field update.
- Time from conversation to draft order.
- Fields auto-filled.
- Fields requiring human confirmation.
- Keyboard actions avoided.

---

# 23. Testing

## 23.1 Unit tests

### Audio

- Float32 → PCM16.
- μ-law decode.
- 8k → 16k resample.
- Stereo split.
- Sequence ordering.
- Pause/resume replay.

### Transcript

- Partial not persisted.
- Final persisted once.
- Duplicate VALSEA event ignored.
- Translation linked correct segment.

### Extractor

- Add item.
- Change quantity.
- Remove item.
- Agent readback not treated as order.
- Caller confirmation.
- Ambiguous reference returns no unsafe patch.
- No evidence → reject.

### Resolver

- Exact SKU.
- Spoken number SKU.
- Fuzzy collision.
- Unknown SKU.
- UOM alias.
- Customer phone match.

### Rules

- Missing customer.
- Stock insufficient.
- Substitute not approved.
- Date ambiguous.
- Export blocked.
- Ready for approval.

### ERP

- Create draft.
- Idempotency.
- ERP error.
- Timeout/retry.

## 23.2 Integration tests

1. Browser mic simulated PCM → VALSEA adapter mock → transcript → order.
2. Telephony media fixture → μ-law decode → VALSEA.
3. Replay file → real-time frames → order.
4. Correction 20 → 24.
5. Caller confirms agent readback.
6. Translation failure does not alter order.
7. ERP failure does not mark exported.

## 23.3 E2E tests

Playwright:

- Create session.
- Select replay.
- Play fixture.
- Observe transcript.
- Observe order lines.
- Resolve ambiguous SKU.
- Approve.
- Export.
- Check external ID.

## 23.4 Golden fixtures

Mỗi audio fixture có:

```json
{
  "file": "demo-call-01.wav",
  "expectedSegments": [],
  "expectedOrder": {},
  "expectedClarifications": [],
  "expectedBlockingErrors": []
}
```

Không hard-code result vào production UI; fixture chỉ dùng test.

---

# 24. Acceptance criteria cuối cùng

| Test | Kết quả bắt buộc |
|---|---|
| Browser mic nói trực tiếp | Có live transcript |
| Điện thoại gọi vào | Có transcript caller |
| Zalo/video replay | Phát tới đâu transcript tới đó |
| Partial thay đổi | Không commit sai vào order |
| Caller sửa 20 thành 24 | Order cuối là 24 |
| Agent hỏi “24 đúng không?” | Chưa confirm |
| Caller nói “đúng” | Field confirmed |
| SKU có hai candidate gần nhau | Export bị block |
| Translation sai/failed | Source order không đổi |
| Caller ID match | Customer được đề xuất |
| Stock thiếu | Có warning + suggested reply |
| Substitute chưa confirm | Không tự thêm |
| Human approve | Order ready |
| Export lần đầu | Tạo Draft Sales Order |
| Bấm export lần hai | Không tạo order trùng |
| ERP lỗi | UI không báo thành công |
| Telephony lỗi | Browser/replay vẫn chạy |
| Evidence click | Highlight đúng segment |
| Secret inspection | Không có secret ở frontend |

---

# 25. 48-hour implementation plan

## Giờ 0–4

- Tạo monorepo.
- Setup Next.js + backend + PostgreSQL.
- Test VALSEA API key.
- Test RTT with sample PCM.
- Chốt event contract.
- Seed product/customer data.

## Giờ 4–10

- Browser AudioWorklet.
- VALSEA adapter.
- Transcript UI.
- Partial/final handling.
- Translation pipeline.

## Giờ 10–16

- Order schema.
- Incremental extractor.
- Patch validation.
- Event sourcing.
- Draft order UI.

## Giờ 16–22

- Customer resolver.
- Product resolver.
- UOM/date normalization.
- Business rules.
- Stock/price mock hoặc ERP query.

## Giờ 22–28

- ERPNext adapter.
- Draft Sales Order export.
- Idempotency.
- Success/failure UI.

## Giờ 28–34

- Replay adapter.
- Zalo-style video/audio demo.
- Pause/resume/reset.
- Golden fixture.

## Giờ 34–40

- Telephony adapter.
- μ-law decode/resample.
- Caller ID.
- Two track sessions nếu có.

## Giờ 40–44

- Reply Copilot.
- Optional TTS.
- Evidence UI.
- Metrics.

## Giờ 44–48

- Integration tests.
- Deploy.
- Rehearse.
- Record fallback video.
- Prepare benchmark.
- Freeze features.
- Fix only blocking bugs.

Nếu telephony mất quá 6 giờ chưa hoạt động, đóng băng phần đó ở adapter + recorded provider fixture và ưu tiên browser/replay end-to-end.

---

# 26. Demo reliability strategy

## Primary

Cuộc gọi điện thoại thật.

## Secondary

Zalo/video synchronized replay.

## Tertiary

Mobile browser microphone.

## Fallback assets

- Local replay file.
- Screen recording full demo.
- Pre-seeded ERP.
- Cached product master.
- Printed QR.
- Offline architecture image.
- Generic ASR comparison screenshot/video.

Không dùng prerecorded transcript giả làm live.

---

# 27. Environment variables

```bash
# App
NODE_ENV=development
PUBLIC_BASE_URL=https://your-domain.example
DATABASE_URL=postgresql://...

# VALSEA
VALSEA_API_KEY=
VALSEA_RTT_URL=wss://api.valsea.ai/v1/realtime
VALSEA_TRANSLATION_URL=https://api.valsea.ai/v1/translations
VALSEA_CHAT_URL=https://api.valsea.ai/v1/chat/completions
VALSEA_TTS_URL=wss://api.valsea.ai/v1/realtime/tts

# ERPNext
ERPNEXT_BASE_URL=
ERPNEXT_API_KEY=
ERPNEXT_API_SECRET=

# Telephony
TELEPHONY_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
AGENT_PHONE_NUMBER=

# AI extraction
ORDER_EXTRACTOR_MODEL=
REPLY_COPILOT_MODEL=

# Feature flags
ENABLE_TELEPHONY=true
ENABLE_REPLAY=true
ENABLE_BROWSER_MIC=true
ENABLE_TTS=false
ENABLE_TRANSLATION=true
```

---

# 28. Definition of Done

Prototype được coi là hoàn thành khi:

1. Cả ba intake đều đi qua cùng normalized audio pipeline.
2. Ít nhất browser mic và replay chạy end-to-end ổn định.
3. Telephony có thể chạy live hoặc được chứng minh bằng provider media stream fixture thật.
4. VALSEA ASR được gọi thật.
5. Partial/final được xử lý đúng.
6. Translation hoạt động trên final segments.
7. Order fields cập nhật incrementally.
8. Customer/SKU được resolve với master data.
9. Business rules chặn action sai.
10. Suggested reply dùng ERP facts.
11. Human approval bắt buộc.
12. ERPNext nhận Draft Sales Order thật.
13. Export idempotent.
14. Demo correction, ambiguity và stock shortage.
15. Có README chạy local.
16. Có `.env.example`.
17. Có seed data.
18. Có ít nhất một E2E golden fixture.
19. Có fallback demo.
20. Không có secret trong frontend.

---

# 29. Nguồn kỹ thuật chính

Coding agent phải đọc tài liệu chính thức trước khi triển khai endpoint thật:

- VALSEA Live Transcription:
  - https://valsea.ai/docs/realtime
- VALSEA Audio Transcription:
  - https://valsea.ai/docs/api/transcribe
- VALSEA Translation:
  - https://valsea.ai/docs/api/translate
- VALSEA Voicebot Realtime Flow:
  - https://valsea.ai/docs/api/voicebot-realtime
- VALSEA documentation index:
  - https://valsea.ai/docs
- Twilio Media Streams:
  - https://www.twilio.com/docs/voice/media-streams
- Twilio WebSocket media messages:
  - https://www.twilio.com/docs/voice/media-streams/websocket-messages
- Frappe REST API:
  - https://docs.frappe.io/framework/user/en/api/rest

Lưu ý:

- Endpoint sandbox hackathon có thể khác tài liệu public.
- Xác minh API key, rate limit, `hint_text`, translation và realtime TTS ngay tại kickoff.
- Nếu brief cung cấp endpoint khác, ưu tiên endpoint được VALSEA xác nhận cho sandbox.
- Không phụ thuộc vào live Zalo call API trong MVP.
- “Zalo intake” trong tài liệu này là audio/video replay có đồng bộ theo thời gian hoặc file voice note do người dùng cung cấp.

---

# 30. Tóm tắt mệnh lệnh triển khai

Hãy xây theo thứ tự:

```text
1. Unified audio frame
2. Browser mic
3. VALSEA live transcript
4. Partial/final transcript UI
5. Incremental order state
6. Customer/SKU resolver
7. Business validation
8. ERPNext draft export
9. Translation
10. Zalo replay
11. Reply Copilot
12. Telephony live call
13. TTS bonus
```

Luôn giữ nguyên nguyên tắc:

> **Original speech → verified meaning → deterministic business validation → human approval → ERP action.**

Không biến sản phẩm thành chatbot chung. Không để LLM tự quyết định dữ liệu ERP. Không hy sinh tính đúng đắn của order để có một demo voicebot phức tạp hơn.
