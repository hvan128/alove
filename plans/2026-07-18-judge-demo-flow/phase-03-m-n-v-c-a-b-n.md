---
phase: 3
title: "Màn Vé của bạn"
status: pending
priority: P1
dependencies: [2]
---

# Phase 3: Màn "Vé của bạn" (UX-3)

## Overview

Khi booking đã confirmed và cuộc gọi kết thúc (agent cúp qua `call.end` hoặc khách bấm Kết thúc), overlay chuyển cảnh sang màn vé: mã vé lớn + QR + chi tiết chuyến + Lưu vé / Đặt chuyến khác / Đóng. Cúp giữa chừng chưa confirmed thì không hiện màn vé.

## Requirements

- Functional: hiển thị mã vé, QR, tuyến, ngày giờ chạy, điểm đón/trả, ghế/phòng (`seatNoun` đúng từ nhà xe), tổng tiền, tên + SĐT, badge "Đã xác nhận"; ghi chú "Cần đổi/huỷ? Gọi lại và đọc số điện thoại."; 3 CTA: Lưu vé (PNG), Đặt chuyến khác (cuộc gọi mới), Đóng (morph ngược về landing).
- Non-functional: QR render SVG không cần mạng; hoạt động cả zero-key fallback lẫn LiveKit; màn vé nằm trong overlay (desktop) và full-screen (mobile).

## Architecture

- `BusCallWorkspace` thêm state view `'call' | 'ticket'`: trong `endCall()` nếu `workspace.booking.status === 'confirmed'` → `'ticket'` thay vì đóng.
- Component mới `TicketResult` nhận `BookingDraft` — tái dùng dữ liệu/format từ `TicketCard` (đã có ~80%). **Verify tên field thật trong `packages/contracts`** (mã vé, seats, selectedTrip.pickupPoint/dropoffPoint/seatNoun, totalFareVnd…) trước khi code.
- QR: `react-qr-code` (SVG, nhẹ); nội dung QR = mã vé (chuỗi) — URL tra cứu để dành UX-6.
- Lưu vé: `html-to-image` chụp node `TicketResult` → tải PNG. Nếu vướng (font/oklch), fallback đã chốt: nút "Sao chép mã vé" — không chặn phase.
- Đặt chuyến khác: gọi lại `startCall()` (đã tự tạo conversationId mới, reset booking) → view về `'call'`.

## Related Code Files

- Create: `apps/web/src/components/bus-call/ticket-result.tsx`
- Modify: `apps/web/src/components/bus-call/bus-call-workspace.tsx` (state view, điều hướng sau endCall)
- Modify: `apps/web/src/components/bus-call/call-overlay.tsx` (Đóng từ màn vé → morph ngược)
- Modify: `apps/web/package.json` (+ `react-qr-code`, `html-to-image`)
- Đọc tham chiếu: `packages/contracts/src/*` (BookingDraft), `ticket-card.tsx`

## Implementation Steps

1. Đọc contracts, chốt field map cho `TicketResult`.
2. Dựng `TicketResult` (bố cục vé: mã to + QR phải, chi tiết dưới, 3 CTA) theo design system.
3. Nối state view trong `BusCallWorkspace`; case cúp-giữa-chừng (không confirmed) đóng thẳng, không qua màn vé.
4. Lưu vé bằng `html-to-image`; thử với dark/light; nếu lỗi màu oklch → fallback copy mã.
5. Đặt chuyến khác → reset + gọi mới; Đóng → overlay exit morph.
6. Test: unit `TicketResult` render đủ field từ BookingDraft mẫu; unit điều hướng endCall (confirmed → ticket, chưa confirmed → đóng); e2e zero-key: chạy 4 câu preset → confirmed → màn vé hiện mã + QR.

## Success Criteria

- [ ] Đặt vé xong (cả fallback lẫn LiveKit) → màn vé hiện đúng mã + chi tiết khớp phiếu.
- [ ] Cúp giữa chừng → không hiện màn vé.
- [ ] Lưu vé tải được PNG (hoặc fallback copy hoạt động, ghi rõ trong PR).
- [ ] Đặt chuyến khác mở cuộc gọi mới sạch (không dính booking cũ). Gates xanh.

## Risk Assessment

- `html-to-image` với token màu `oklch` có thể render sai trên vài browser → đã có fallback copy; quyết định khi test thật.
- Tên field contracts khác giả định → bước 1 verify trước khi dựng UI.
