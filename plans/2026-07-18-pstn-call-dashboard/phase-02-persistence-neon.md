# Phase 02 — Persistence Neon: agent tự lưu booking + transcript

## Context

- `/api/booking/advance` (apps/web) đã nhận từng lượt khách nói (verbatim) và trả
  reply + draft — đây là điểm ghi DB tự nhiên, không cần agent cầm DB credentials.
- Roadmap đã chốt: Neon lưu final transcript + booking snapshot + audit transition;
  KHÔNG lưu partial transcript, KHÔNG lưu raw audio.

## Yêu cầu

1. Mỗi lượt hội thoại (khách nói / agent trả lời) được lưu final-only.
2. Booking snapshot + transition lưu sau mỗi advance; khi có mã vé → status confirmed.
3. Call record: bắt đầu/kết thúc, channel (`phone`/`web`), số người gọi nếu có.
4. Thiếu `DATABASE_URL` → bỏ qua ghi DB (log warning), mọi luồng hiện tại chạy nguyên.
5. Duplicate final/confirm không tạo booking thứ hai (đã là acceptance của roadmap).

## Files

- Tạo: `apps/web/src/lib/db/client.ts` — Neon serverless driver + Drizzle, lazy init,
  null khi thiếu `DATABASE_URL`.
- Tạo: `apps/web/src/lib/db/schema.ts` — bảng:
  - `calls(id text pk = conversationId, channel, caller_number, started_at, ended_at, status)`
  - `call_turns(id serial, call_id fk, role 'customer'|'agent', text, created_at)`
  - `booking_snapshots(id serial, call_id fk, snapshot jsonb, status, ticket_code, created_at)`
- Tạo: `apps/web/drizzle.config.ts` + migration SQL (`drizzle-kit generate`).
- Sửa: `apps/web/src/app/api/booking/advance/route.ts` — sau khi core trả kết quả:
  upsert call, insert 2 turns (text khách + reply), insert booking snapshot; idempotent
  theo (call_id, ticket_code) cho trạng thái confirmed.
- Tạo: `apps/web/src/app/api/call/events/route.ts` — Bearer `AGENT_WEBHOOK_SECRET`,
  body `{ conversationId, type: 'call.started'|'call.ended', channel?, callerNumber? }`.
- Sửa: `agent/agent.py` — POST `call.started` khi connect (kèm channel/callerNumber
  từ phase-01), `call.ended` trong shutdown callback; best-effort, lỗi không chặn call.
- Sửa: `apps/web/package.json` — thêm `drizzle-orm`, `@neondatabase/serverless`,
  dev `drizzle-kit`.

## Bước

1. Schema + client + migration.
2. Wire advance route (kèm test: có DB mock/miss DB, duplicate confirm).
3. Route call/events + test auth 401/format 400.
4. Agent post start/end. py_compile.

## Verify

- `pnpm --filter @ordervoice/web typecheck && test && build` xanh.
- Không set `DATABASE_URL` → advance route trả kết quả như cũ (test).

## Rủi ro / rollback

- Ghi DB làm chậm advance → dùng `waitUntil`/fire-after-respond nếu đo thấy tăng
  latency đáng kể; reply cho khách không được chờ DB.
- Rollback: gỡ import db khỏi advance route là luồng cũ nguyên vẹn.
