---
phase: 1
title: Landing nhà xe
status: completed
priority: P1
dependencies: []
---

# Phase 1: Landing nhà xe (UX-1)

## Overview

Viết lại trang chủ `/` từ trang giới thiệu sản phẩm Alove thành **trang bán vé của nhà xe Mai Anh**: tuyến, giờ chạy, giá thật từ catalog, một CTA duy nhất "Gọi để đặt xe". CTA tạm link sang `/console`; Phase 2 sẽ thay bằng overlay morph.

## Requirements

- Functional: hero 1 câu ("Alo là có vé…"), bảng tuyến phổ biến từ `createBusDemoCatalog()`, mục "3 bước đặt vé", header logo + hotline + link Tra cứu vé (placeholder, chưa có trang), CTA lặp lại cuối trang, mobile có nút gọi sticky đáy màn.
- Non-functional: giữ design system hiện có (token oklch, IBM Plex, lucide, light/dark); không thêm dependency; SSR thuần (server component), không client JS ngoài AppShell.

## Architecture

- Dữ liệu tuyến đọc trực tiếp từ `@ordervoice/core/bus-booking` (`createBusDemoCatalog()`) lúc render server — khớp 100% với những gì agent nói trong cuộc gọi. **Verify tên field thật** (priceVnd, nhãn giờ chạy, pickupPoint/dropoffPoint, seatNoun) trước khi dựng bảng.
- Nội dung pitch sản phẩm cũ bỏ hẳn (git giữ lịch sử); `/console` và `/design-system` vẫn truy cập trực tiếp bằng URL.

## Related Code Files

- Modify: `apps/web/src/app/page.tsx` (viết lại toàn bộ)
- Modify (nếu cần): `apps/web/src/components/ui/app-shell.tsx` — header thêm hotline/Tra cứu vé; chú ý file này đang có sửa đổi chưa commit trong working tree
- Đọc tham chiếu: `packages/core/src/bus-booking*` (catalog), `apps/web/src/components/bus-call/ticket-card.tsx` (giọng UI)

## Implementation Steps

1. Đọc `createBusDemoCatalog()` để lấy danh sách field thật của trip; quyết định cột bảng tuyến (giờ chạy · loại xe/seatNoun · điểm đón/trả · giá).
2. Dựng lại `page.tsx`: header (logo Mai Anh, hotline, Tra cứu vé disabled/anchor), hero + CTA chính, bảng tuyến, "3 bước đặt vé", CTA cuối trang, footer gọn.
3. CTA "Gọi để đặt xe": tạm `<Link href="/console">` — đánh dấu `{/* Phase 2: thay bằng CallOverlay */}`.
4. Mobile: thanh sticky đáy màn chứa CTA (ẩn trên ≥lg), safe-area-inset.
5. Kiểm tra light/dark + responsive 360px→1280px.

## Success Criteria

- [ ] `/` không còn chữ "demo", "design system", "agent" hướng người đánh giá; đọc như trang nhà xe thật.
- [ ] Giá/giờ/điểm đón trên landing khớp catalog (so với những gì agent đọc trong cuộc gọi).
- [ ] CTA hoạt động (tạm sang `/console`); sticky CTA hiện đúng trên mobile.
- [ ] `pnpm lint`, `pnpm -r --if-present typecheck`, `pnpm build` xanh; e2e hiện có không vỡ (sửa test Playwright nào assert nội dung landing cũ).

## Risk Assessment

- Test e2e/unit đang assert nội dung landing cũ → phải cập nhật cùng phase, không nới lỏng test.
- `app-shell.tsx` có diff chưa commit — phối hợp/không dẫm lên thay đổi đang dở.
