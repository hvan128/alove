# Luồng gọi số điện thoại → agent + dashboard transcript + lưu booking

**Ngày:** 2026-07-18
**Trạng thái:** chờ duyệt
**Nền tảng:** kế thừa `plans/2026-07-18-livekit-agent-port` (agent worker + token route + booking advance đã có).

## Quyết định người dùng

- Telephony: giao cho Claude chọn → **LiveKit SIP + trunk Telnyx/Twilio** (pilot), đường
  nâng cấp số VN nội địa qua SIP trunk thương mại VN sau.
- **Không dùng VALSEA nữa** → STT mặc định Speechmatics (đã wired), A/B với OpenAI
  realtime STT và `gemini-sts`. Cần ADR ghi lại vì đảo ADR 0006.
- Đã có LiveKit Cloud project. Chưa có tài khoản telco → code + config seam trước.
- Dashboard: **live + lịch sử**, persistence bằng Neon Postgres.

## Kiến trúc

```text
Cuộc gọi PSTN (số từ Telnyx/Twilio)
        | SIP origination → LiveKit SIP endpoint
        v
LiveKit inbound trunk + dispatch rule (room booking-<id>, dispatch agent "vedi")
        v
Agent worker (đã có)  STT -> advance_booking -> TTS
        | HTTPS Bearer AGENT_WEBHOOK_SECRET
        v
Next.js /api/booking/advance  ->  @ordervoice/core (xác định)
        |            \
        |             +--> Neon: calls / turns / booking snapshots
        v
Dashboard /dashboard  (live: join room subscribe-only + data channel;
                       lịch sử: đọc Neon)
```

Nguyên tắc giữ nguyên: booking core xác định là nguồn sự thật; agent không bịa;
DB credentials chỉ ở phía Next.js — agent worker KHÔNG cầm `DATABASE_URL`.

## Phases

- **phase-01 SIP ingress** — trunk/dispatch-rule config + script, agent nhận cuộc gọi
  SIP (caller number, noise cancellation telephony), không phụ thuộc data-channel.
- **phase-02 persistence Neon** — schema Drizzle, ghi call/turn/booking trong
  `/api/booking/advance` + `/api/call/events`, graceful khi thiếu `DATABASE_URL`.
- **phase-03 dashboard** — `/dashboard` danh sách + chi tiết cuộc gọi, transcript live
  qua LiveKit (role staff, subscribe-only), lịch sử từ Neon, chặn truy cập bằng secret.
- **phase-04 config + docs + ADR** — env examples, docs pilot PSTN, ADR 0008 (bỏ
  VALSEA-first + chọn LiveKit SIP), cập nhật integration-feasibility.

## Acceptance

- `pnpm --filter @ordervoice/web typecheck && build` xanh; `pnpm test` xanh
  (thêm test schema mapping + api route persistence + dashboard API).
- `python -m py_compile agent/*.py` xanh.
- Không có `DATABASE_URL`/SIP env → web call demo hiện tại vẫn chạy nguyên vẹn.
- Không commit secret. Bước cấu hình telco + `lk` CLI ghi thành runbook chạy tay.

## Rủi ro

- Chưa có tài khoản telco → phase-01 chỉ verify được config/schema, cuộc gọi thật chờ
  trunk. Runbook phải đủ để làm một mình.
- ASR tiếng Việt trên audio điện thoại 8 kHz chưa đo — phải test bằng cuộc gọi thật
  trước khi hứa chất lượng.
- Số Telnyx/Twilio không phải số VN nội địa; người gọi VN trả cước quốc tế. Ghi rõ
  trong docs, đường nâng cấp là SIP trunk VN (FPT/CMC/iTel...).
