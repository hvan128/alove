# Phase 04 — Config, docs, ADR

## Yêu cầu

1. Env examples đầy đủ cho cả 3 mảnh mới; không secret thật.
2. ADR ghi lại 2 quyết định đảo/thay thế ADR 0006:
   - Bỏ VALSEA-first (quyết định người dùng 2026-07-18) → STT mặc định Speechmatics,
     A/B OpenAI realtime STT và gemini-sts. Code VALSEA giữ nguyên như legacy seam.
   - PSTN qua LiveKit SIP + trunk Telnyx/Twilio thay vì Twilio Media Streams thuần.
3. Docs phản ánh hiện trạng trung thực: chưa có cuộc gọi thật nào cho tới khi có trunk.

## Files

- Sửa: `.env.example` (root) + `apps/web/.env.example` nếu có — thêm `DATABASE_URL`,
  `DASHBOARD_ACCESS_KEY`, ghi chú SIP.
- Tạo: `adrs/0008-pstn-livekit-sip-and-stt-provider.md`.
- Sửa: `docs/integration-feasibility.md` — hàng VALSEA đổi quyết định (không còn
  bắt buộc), thêm hàng LiveKit SIP + trunk; cập nhật checklist credentials.
- Sửa: `docs/pilot-roadmap.md` — mục PSTN trỏ sang runbook + plan này.
- `docs/pstn-sip-runbook.md` đã tạo ở phase-01 — đối chiếu lại lệnh/URL lần cuối.

## Verify

- Đọc lại từng doc sau sửa: ngày, link, claim khớp thực tế (chưa claim live call).
- `pnpm test` + build toàn workspace lần cuối.
