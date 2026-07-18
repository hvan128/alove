---
title: Luồng khách hàng Alove và demo giám khảo
description: >-
  Luồng khách 5 màn: landing nhà xe → morph overlay gọi → màn Vé của bạn, kèm độ
  bền lỗi, mobile và chuẩn bị demo 4 cảnh
status: in-progress
priority: P1
branch: feat/livekit-agent
tags:
  - ux
  - demo
  - livekit
  - landing
blockedBy: []
blocks: []
created: '2026-07-18T12:48:03.303Z'
createdBy: 'ck:plan'
source: skill
---

# Luồng khách hàng Alove và demo giám khảo

## Overview

Biến các màn rời rạc hiện có (`/console`, `/dashboard`, agent worker) thành một luồng khách liền mạch:
trang chủ nhà xe Mai Anh với CTA duy nhất **"Gọi để đặt xe"** → nút morph (Framer Motion `layoutId`) thành overlay cuộc gọi, auto-start → màn **"Vé của bạn"** (mã + QR) sau khi chốt vé. Sau đó gia cố lỗi/mobile và chuẩn bị demo giám khảo 4 cảnh.

**Nguồn thiết kế (đã được user chốt):**
- `brainstorm-judge-demo-flow.md` (cùng thư mục) — quyết định UX-1→UX-6, morph bằng Framer Motion
- `visuals/alove-customer-journey.html` — 5 màn khách, choreography morph, bảng hiện tại vs đề xuất
- `visuals/alove-judge-demo-flow.html` — kịch bản demo 4 cảnh, rủi ro

**Nguyên tắc bất biến:** booking xác định server-side (`@ordervoice/core` qua `/api/booking/advance`); agent không bịa giá/chuyến/ghế/mã vé. Không đụng vào agent worker trừ khi phase ghi rõ. `/console` giữ nguyên làm màn demo/nội bộ.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Landing nhà xe](./phase-01-landing-nh-xe.md) | Completed |
| 2 | [Overlay gọi morph](./phase-02-overlay-g-i-morph.md) | Completed |
| 3 | [Màn Vé của bạn](./phase-03-m-n-v-c-a-b-n.md) | Completed |
| 4 | [Độ bền lỗi và mobile](./phase-04-b-n-l-i-v-mobile.md) | Completed |
| 5 | [Sẵn sàng demo](./phase-05-s-n-s-ng-demo.md) | In Progress |

## Dependencies

- Chuỗi chính: Phase 1 → 2 → 3 (mỗi phase ship được độc lập; CTA Phase 1 tạm link `/console` tới khi Phase 2 thay bằng overlay).
- Phase 4 cần Phase 2–3 xong (gia cố trên overlay + màn vé).
- Phase 5 cần tất cả, và cần credentials LiveKit/provider thật (không có trong workspace).
- Cross-plan: kế thừa `2026-07-18-livekit-agent-port` (done) và `2026-07-18-pstn-call-dashboard` (code done) — không chặn.

## Acceptance Criteria (toàn plan)

- [ ] Khách vào `/` thấy trang nhà xe (tuyến/giờ/giá từ catalog thật), một CTA "Gọi để đặt xe".
- [ ] Bấm CTA: nút morph thành panel cuộc gọi (~450ms, 2 chiều, chịu interrupt, tôn trọng reduced-motion), đổ chuông không cần bấm thêm; xin mic sau khi overlay hiện.
- [ ] Đặt vé xong: màn "Vé của bạn" với mã + QR + Lưu vé / Đặt chuyến khác / Đóng.
- [ ] Agent không vào phòng ~30s → thông báo + nút Gọi lại (không còn ringback vô hạn).
- [ ] Mobile: CTA sticky, phiếu vé bottom sheet, luồng chạy trên mobile browser (phục vụ cảnh QR).
- [ ] Gates xanh: `pnpm lint`, `pnpm -r --if-present typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.
- [ ] Demo 4 cảnh chạy trọn với credentials thật; kịch bản + video backup sẵn sàng.

## Out of Scope

- UX-6: thẻ "Vé sắp tới" (localStorage) + trang tra cứu vé bằng SĐT (P2, làm sau).
- PSTN/số điện thoại thật (plan riêng đã có runbook).
- Thay đổi engine/prompt agent ngoài phạm vi Phase 4–5 ghi rõ.
