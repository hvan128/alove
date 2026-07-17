# Kiến trúc VéĐi

## Quyết định chính

Bản demo dùng **Next.js Web Call trong cùng trình duyệt + booking agent xác định + Web Speech nâng cấp tùy chọn**. Đây là đường ngắn nhất để chứng minh hai phía khách hàng/nhân viên, chế độ tự động và giọng Agent mà không phụ thuộc số điện thoại, key hay media server.

LiveKit không bị loại bỏ. Nó là adapter pilot cho hai thiết bị thật hoặc tổng đài nhiều người. Chưa bật LiveKit trong bản public vì một room UI không đủ tạo voice agent: còn cần token service, LiveKit project/server, STT/LLM/TTS credentials và Agent worker chạy lâu dài.

## Repository

```text
apps/
  web/                  Next.js App Router, two-sided Web Call, browser STT/TTS
  api/                  Fastify/provider seams cho pilot VALSEA và telephone
packages/
  contracts/            Zod schemas cho call, message, trip và booking
  core/                 deterministic booking agent, confirmation rules
  providers/            VALSEA, OpenAI, Twilio adapters giữ cho pilot
db/                     Neon/Drizzle persistence boundary
```

## Luồng demo hiện tại

```text
Khách click preset / nhập text / nói qua mic
                    |
                    v
          final customer message
                    |
                    v
     deterministic booking agent
          |                    |
    Human mode            Auto mode
  chỉ cập nhật phiếu     cập nhật + trả lời
          |                    |
          +---------+----------+
                    v
       nhân viên tiếp quản khi cần
                    |
                    v
      explicit confirm -> stable code
```

Mọi input đi vào cùng một `submitCustomer` boundary. SpeechRecognition chỉ tạo final message; preset/text luôn hoạt động. SpeechSynthesis chỉ chạy sau thao tác người dùng để phù hợp autoplay policy.

## Trạng thái

```text
call:     idle -> connected -> ended

booking: collecting -> trip_proposed -> awaiting_confirmation -> confirmed
```

`confirmed` cần đủ hành trình, ngày đi, số khách, chuyến, tên và điện thoại. Mã vé và ghế không đổi nếu xác nhận lại.

## Ranh giới runtime

| Runtime | Sở hữu hiện tại | Pilot mở rộng |
|---|---|---|
| Next.js web | UI, demo state, browser voice, health route | LiveKit token endpoint, server actions/API |
| Booking core | extraction mẫu, trip choice, validation, stable confirmation | tool boundary cho LLM có schema |
| LiveKit Agent worker | Không chạy trong public demo | STT → LLM/tool → TTS trong room |
| Neon | Schema/repository seam | conversation, final message, booking, audit |
| Telephone gateway | Adapter cũ, chưa credential test | Twilio/Stringee ingress và consent logging |

## Nguyên tắc an toàn

1. Browser không nhận provider secret.
2. Partial transcript không được xác nhận vé.
3. Agent chỉ chốt khi khách nói xác nhận rõ hoặc nhân viên bấm xác nhận thủ công.
4. LLM pilot không được tự tạo giá/chuyến; catalog và confirmation vẫn qua core xác định.
5. Không ghi âm hoặc gửi audio cho provider nếu chưa có consent và retention policy.
