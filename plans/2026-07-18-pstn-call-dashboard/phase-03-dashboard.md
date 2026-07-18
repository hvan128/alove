# Phase 03 — Dashboard staff: transcript live + lịch sử booking

## Context

- Token route `/api/livekit/token` đã nhận `{ conversationId, role, identity }`.
- Data-channel topic `alove-events` đã publish `booking.update`, `agent.state`, `call.end`.
- Phase-02 cung cấp Neon: `calls`, `call_turns`, `booking_snapshots`.

## Yêu cầu

1. `/dashboard`: danh sách cuộc gọi (badge "đang diễn ra" theo `calls.status`),
   kênh phone/web, số người gọi, trạng thái booking mới nhất, mã vé nếu có.
2. `/dashboard/calls/[callId]`: transcript theo dòng thời gian + phiếu booking.
   - Cuộc gọi live: join room `booking-<callId>` role staff **subscribe-only**
     (không publish mic), caption qua `useTranscriptions()` + data-channel.
   - Cuộc gọi đã kết thúc: đọc từ Neon.
3. Chặn truy cập: secret đơn giản qua env (`DASHBOARD_ACCESS_KEY`) — cookie/HTTP
  header check trong middleware; đủ cho pilot, KHÔNG phải auth hoàn chỉnh, ghi rõ.
4. Token route: role `staff` → grant subscribe-only (không `canPublish`).

## Files

- Tạo: `apps/web/src/app/dashboard/page.tsx` — danh sách (server component đọc Neon).
- Tạo: `apps/web/src/app/dashboard/calls/[callId]/page.tsx` — chi tiết.
- Tạo: `apps/web/src/components/dashboard/live-call-monitor.tsx` — client component
  join room, transcript live + booking card (tái dùng pattern `livekit-call.tsx`).
- Tạo: `apps/web/src/app/api/dashboard/calls/route.ts` + `[callId]/route.ts` —
  JSON cho polling/refresh, sau check access key.
- Sửa: `apps/web/src/lib/livekit/token.ts` hoặc route token — grant theo role staff.
- Sửa: middleware/layout dashboard — check `DASHBOARD_ACCESS_KEY`.

## Bước

1. API routes + access check (test 401 khi thiếu key).
2. Trang danh sách + chi tiết (lịch sử trước — không cần LiveKit).
3. Live monitor component + staff token grant.
4. Typecheck/build; test route API.

## Verify

- Không set `DASHBOARD_ACCESS_KEY` → dashboard trả 404/403 (mặc định đóng).
- Không có `DATABASE_URL` → dashboard hiện trạng thái "chưa cấu hình", không crash.
- Live monitor: verify bằng web call demo (2 tab) — không cần telco.

## Rủi ro / rollback

- Route mới độc lập, không đụng luồng khách — rollback là xoá thư mục dashboard.
- Transcript live phía staff phụ thuộc `useTranscriptions` từ agent session; nếu
  gemini-sts không đẩy transcription events qua room, fallback hiển thị turns từ
  Neon polling (đã có do phase-02 ghi mỗi lượt).
