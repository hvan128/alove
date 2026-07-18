---
phase: 4
title: "Độ bền lỗi và mobile"
status: pending
priority: P1
dependencies: [2, 3]
---

# Phase 4: Độ bền lỗi và mobile (UX-4, UX-5, P1-7)

## Overview

Gia cố những chỗ demo có thể vỡ trước mắt khán giả: đường thoát khi agent không vào phòng, bố cục mobile trong overlay (phiếu vé bottom sheet), và flash field phiếu vé để mắt người xem bám theo hội thoại.

## Requirements

- Functional:
  - UX-5: sau khi hết 3 lần redispatch (~36s) mà vẫn không có agent → dừng ringback, hiện thông báo "Tổng đài đang bận" + nút **Gọi lại** (tạo conversation mới) + nút Đóng.
  - UX-4: mobile trong cuộc gọi — `TicketCard` thành bottom sheet: thanh peek (trạng thái + tuyến) chạm/kéo để mở; không che caption.
  - P1-7: field phiếu vé vừa được cập nhật từ `booking.update` flash/pulse ~1s.
- Non-functional: không đổi protocol data-channel; không đụng agent worker; flash tôn trọng reduced-motion.

## Architecture

- UX-5 trong `livekit-call.tsx` (`RoomBridge`): đã có `redispatchTries`; thêm state `agentTimeout` khi tries cạn + hết hạn chờ → báo lên workspace qua callback `onAgentTimeout` → workspace render trạng thái lỗi trong CallStage; "Gọi lại" = `endCall()` + `startCall()` mới (conversationId mới đã là hành vi sẵn có). `useRingback` tắt khi timeout.
- P1-7: trong `applyLiveBooking` diff snapshot cũ/mới (các field hiển thị của TicketCard) → set `highlightFields: string[]` kèm timestamp; TicketCard nhận prop và gắn class animation; tự xoá sau 1s. Zero-key path (`submitCustomer`) dùng chung diff để hành vi đồng nhất.
- UX-4: bottom sheet bằng framer-motion (`drag="y"` + snap points) — dependency đã có từ Phase 2; desktop giữ layout 2 cột.

## Related Code Files

- Modify: `apps/web/src/components/bus-call/livekit-call.tsx` (timeout + callback)
- Modify: `apps/web/src/components/bus-call/bus-call-workspace.tsx` (trạng thái lỗi, diff highlight, layout sheet)
- Modify: `apps/web/src/components/bus-call/call-stage.tsx` (khối thông báo lỗi + nút Gọi lại)
- Modify: `apps/web/src/components/bus-call/ticket-card.tsx` (prop highlight + peek header cho sheet)
- Create: `apps/web/src/lib/booking-diff.ts` (pure helper diff field — unit test được)

## Implementation Steps

1. Viết `booking-diff.ts` + unit test (field đổi, field mới, không đổi → rỗng).
2. Nối diff vào `applyLiveBooking`/`submitCustomer`; TicketCard flash class (CSS keyframe, `prefers-reduced-motion` tắt).
3. Thêm timeout không-có-agent vào `RoomBridge` (đếm từ lúc Connected, reset khi có remote participant); callback lên workspace; UI lỗi + Gọi lại trong CallStage.
4. Bottom sheet mobile trong overlay: peek bar cố định đáy, kéo/chạm mở; kiểm tra không che caption và dock nút.
5. Test: unit diff; unit timeout (mock timers); e2e mobile viewport (Playwright device iPhone): mở overlay → caption thấy được → mở sheet thấy phiếu.

## Success Criteria

- [ ] Tắt agent worker, gọi thử → ~36s ra thông báo + Gọi lại hoạt động (ringback dừng).
- [ ] Field vé flash đúng field vừa đổi, một lần, không lặp vô hạn.
- [ ] Mobile 360px: caption + dock + peek bar không chồng nhau; sheet mở/đóng mượt.
- [ ] Gates xanh, `/console` desktop không đổi hành vi.

## Risk Assessment

- Diff trên object booking lồng nhau dễ false-positive (label định dạng lại) → diff theo danh sách field hiển thị cố định, không deep-compare mù.
- Timeout đếm sai khi agent vào rồi rời phòng → reset đếm theo `remoteParticipants.length`, test case rời phòng giữa chừng.
