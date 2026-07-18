---
phase: 2
title: Overlay gọi morph
status: in-progress
priority: P1
dependencies:
  - 1
---

# Phase 2: Overlay gọi morph (UX-2)

## Overview

CTA "Gọi để đặt xe" morph thành panel cuộc gọi ngay trên trang chủ (Framer Motion `layoutId`), auto-start cuộc gọi, đóng thì morph ngược về nút. Tái dùng nguyên khối `BusCallWorkspace`/`CallStage`; `/console` giữ nguyên.

## Requirements

- Functional: 1 chạm = mở overlay + bắt đầu gọi (không còn bước "Bắt đầu Web Call"); desktop = modal lớn nền dim+blur, mobile = full-screen; nút Kết thúc/X đóng overlay và morph ngược; ESC đóng; scroll trang bị khoá khi mở.
- Non-functional: morph ~450ms spring, chịu interrupt (đóng giữa animation không giật); `prefers-reduced-motion` → fade thay morph; bundle tăng tối thiểu (LazyMotion `domAnimation` + `m`, không import `motion` full).

## Architecture

- Thêm dependency `framer-motion` cho `apps/web`.
- Component mới `CallOverlay` (client):
  - Trạng thái đóng: render pill CTA `m.button layoutId="call-panel"`.
  - Trạng thái mở: `AnimatePresence` + `m.div layoutId="call-panel"` là chính khung panel tối của CallStage (border-radius 999px→24px do layout animation tự nội suy) + backdrop `m.div` fade/blur riêng.
  - Bên trong panel mount `BusCallWorkspace` với props mới `autoStart` và `variant="overlay"` (bỏ khung `min-h-[100dvh] max-w-6xl` khi nằm trong overlay).
- Trình tự: click → morph → `onLayoutAnimationComplete` gọi `startCall()` → `LiveKitCall` mount → xin quyền mic khi LiveKitRoom connect (đúng yêu cầu "xin mic sau khi overlay hiện"). Nội dung panel (orb, caption) fade-in sau khi panel đáp để morph không phải nội suy cây DOM nặng.
- Đóng: `endCall()` + unmount LiveKit (`onDisconnected` đã có) → exit animation morph ngược về pill.

## Related Code Files

- Create: `apps/web/src/components/bus-call/call-overlay.tsx`
- Modify: `apps/web/src/components/bus-call/bus-call-workspace.tsx` (props `autoStart`, `variant`; không đổi logic booking/LiveKit)
- Modify: `apps/web/src/app/page.tsx` (thay Link tạm bằng `CallOverlay`; cả CTA hero, CTA cuối trang và sticky mobile dùng chung một overlay — chỉ một `layoutId` active tại một thời điểm)
- Modify: `apps/web/package.json` (+ `framer-motion`)

## Implementation Steps

1. `pnpm --filter web add framer-motion`; dựng `LazyMotion features={domAnimation}` bọc tại `CallOverlay` (không đặt ở root layout).
2. Thêm props `autoStart`/`variant` vào `BusCallWorkspace`; `autoStart` gọi `startCall()` qua callback từ overlay sau khi morph xong (không tự chạy trong `useEffect` mount để giữ `/console` nguyên hành vi).
3. Dựng `CallOverlay` với layoutId morph + backdrop + khoá scroll (`overflow:hidden` trên body) + ESC + `role="dialog" aria-modal`.
4. Sequencing: morph xong → startCall; nội dung panel fade-in trễ ~100ms; ringback giữ nguyên logic trong `livekit-call.tsx`.
5. `useReducedMotion()` → thay layout morph bằng fade 150ms.
6. Interrupt: test bấm đóng giữa lúc mở, bấm mở lại ngay khi đang đóng (AnimatePresence `mode="wait"` hoặc để framer tự resolve — chọn phương án không giật).
7. Kiểm tra `/console` không đổi hành vi (không autoStart, layout cũ).
8. Test: unit render CallOverlay đóng/mở; e2e Playwright: bấm CTA → panel hiện + trạng thái "Đang kết nối"/fallback zero-key; giữ e2e cũ của `/console` xanh.

## Success Criteria

- [ ] Bấm CTA bất kỳ (hero/cuối trang/sticky) → morph mượt thành panel, cuộc gọi tự bắt đầu (zero-key fallback vẫn chạy khi thiếu LiveKit env).
- [ ] Đóng → morph ngược về đúng nút vừa bấm; trang chủ giữ nguyên vị trí scroll.
- [ ] Reduced-motion: không có layout morph, chỉ fade.
- [ ] `/console` hành vi y nguyên. Gates xanh (lint, typecheck, test, e2e, build).

## Risk Assessment

- Morph pill nhỏ → panel to có thể khựng nếu nội suy cả cây DOM CallStage → giải pháp đã chốt: chỉ morph khung, nội dung fade-in sau.
- Ba CTA dùng chung layoutId: chỉ render đúng một pill nguồn active (các CTA khác `layout` off) để framer không morph nhầm gốc.
- Mic permission bị chặn/denied → hiện thông báo trong panel (Phase 4 mở rộng đường thoát lỗi).
