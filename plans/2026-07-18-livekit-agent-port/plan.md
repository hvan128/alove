# Port luồng agent LiveKit từ project-4 sang VéĐi

**Ngày:** 2026-07-18
**Trạng thái:** xong 4 phase; gates xanh (lint, typecheck 6/6, 47 unit test, build, e2e 4/4). Chưa verify audio thật vì workspace không có credentials.
**Nguồn:** `/Users/haivan/Documents/project-4` (interview platform, LiveKit + Python agent)
**Đích:** VéĐi bus-ticket voice demo (monorepo `ordervoice`)

## Quyết định người dùng

- **Phạm vi:** pilot chạy được, nối booking core (suy ra từ "A/B test 3 provider").
- **Vị trí:** LiveKit là transport chính cho `/console` (auto mode). Có fallback graceful
  về demo in-browser khi LiveKit chưa cấu hình — để bản public đang deploy không vỡ.
- **Provider:** giữ cả 3 mode qua env để A/B test: `valsea` · `cascade` · `gemini-sts`.

## Nguyên tắc kiến trúc

Booking **xác định** ở `@ordervoice/core` là nguồn sự thật duy nhất cho giá/chuyến/ghế/
mã vé/điều kiện xác nhận. Agent worker KHÔNG bịa các trường này: mỗi lượt khách nói,
agent gọi tool `advance_booking` → Next.js chạy `advanceBookingAgent` → trả `reply`
xác định → agent đọc lại. LLM/STT/TTS chỉ là lớp media/hội thoại, thay được để A/B.

```text
Customer browser (LiveKitRoom, audio)
        |  LiveKit room  booking-<conversationId>
        v
   Agent worker (Python)   STT -> [tool: advance_booking] -> TTS
        |  HTTPS Bearer AGENT_WEBHOOK_SECRET
        v
   Next.js  POST /api/booking/advance  ->  @ordervoice/core advanceBookingAgent
        |  data-channel booking.update
        v
   Customer browser cập nhật phiếu vé + caption
```

## Contract tích hợp (chốt cứng)

- Room: `booking-<conversationId>`.
- `POST /api/livekit/token` — body `{ conversationId, role, identity?, displayName? }`
  → `{ token, serverUrl, roomName }`. Dispatch agent theo `LIVEKIT_AGENT_NAME` (mặc định `alove`).
- `POST /api/booking/advance` — auth `Bearer AGENT_WEBHOOK_SECRET`,
  body `{ conversationId, draft: BookingDraft | null, text }`
  → `{ draft, reply }`. Stateless; agent giữ draft giữa các lượt. draft=null → core khởi tạo.
- Data-channel topic `alove-events`:
  - agent → web: `{ type:'booking.update', booking }`, `{ type:'agent.state', state }`
  - web → agent: `{ type:'user.end_turn' }`
- Caption: web đọc `useTranscriptions()` trực tiếp (không DB).

## Phases

- **phase-01 web plumbing** — deps, `lib/livekit/token.ts`, `/api/livekit/token`,
  `/api/booking/advance`. TS typecheck/test.
- **phase-02 web client** — `bus-call/livekit-call.tsx`, wire `bus-call-workspace.tsx`
  (LiveKit khi cấu hình, fallback demo khi không). Build.
- **phase-03 agent worker** — `agent/agent.py` (bus domain, 3 provider mode + VALSEA STT),
  `turn_rules.py`, `pyproject.toml`, `Dockerfile`, `.env.example`, `livekit.toml`, `README`.
  `py_compile`.
- **phase-04 config + docs** — root `.env.example`, cập nhật README + `docs/livekit-bus-pilot.md`.

## Acceptance

- `pnpm --filter @ordervoice/web typecheck && build` xanh.
- `pnpm test` (contracts/core/web) xanh, thêm test cho `/api/booking/advance`.
- `python -m py_compile agent/*.py` xanh.
- Demo in-browser vẫn chạy khi không có `NEXT_PUBLIC_LIVEKIT_URL`.
- Không commit secret; env chỉ ở `.env.example`.

## Rủi ro

- Không có credentials trong workspace → không verify live được; chỉ đảm bảo build/typecheck/py_compile + test đơn vị. Ghi rõ bước chạy thật trong README agent.
- VALSEA chỉ có ASR (WS); TTS VALSEA chưa rõ shape → VALSEA mode = VALSEA STT + Google/Cartesia TTS, ghi chú rõ.
- "Thay transport" có thể vỡ demo production nếu bỏ hẳn fallback → giữ fallback theo env.
