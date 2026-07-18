---
phase: 5
title: Sẵn sàng demo
status: in-progress
priority: P1
dependencies:
  - 1
  - 2
  - 3
  - 4
---

# Phase 5: Sẵn sàng demo (P0-2, P0-3, P0-4, P1-5, P1-6, P2-9)

## Overview

Biến code thành buổi demo chạy được: verify end-to-end với credentials thật, deploy worker 24/7 + production env cho cảnh QR, viết lại kịch bản demo 4 cảnh, quay video backup. Phase này cần credentials LiveKit/OpenAI/ElevenLabs/STT (không có trong workspace) — chuẩn bị checklist để chạy cùng user.

## Requirements

- Functional: cuộc gọi LiveKit thật ghi vào DB và hiện trên `/dashboard` (cảnh 2 demo); worker chạy 24/7; production `/` gọi được từ điện thoại lạ qua QR; ≥3 cuộc gọi song song không sập.
- Non-functional: không secret nào vào repo/`NEXT_PUBLIC_*`; kịch bản đủ chi tiết để người khác dẫn demo được.

## Architecture

- Deploy worker: `agent/Dockerfile` sẵn có → Railway/Fly/Cloud Run min-instances=1 (host giữ WebSocket outbound lâu dài — xem `docs/livekit-deployment.md`); env theo `agent/.env.example`, `LIVEKIT_AGENT_NAME=alove`, cùng `AGENT_WEBHOOK_SECRET` với Vercel.
- Vercel env: `NEXT_PUBLIC_LIVEKIT_URL`, `LIVEKIT_URL/API_KEY/API_SECRET`, `LIVEKIT_AGENT_NAME`, `AGENT_WEBHOOK_SECRET`, `DATABASE_URL`, `DASHBOARD_ACCESS_KEY` (qua Vercel env manager, không commit).
- QR trỏ về production `/` (landing mới — không phải `/console`).

## Implementation Steps

1. **Verify local end-to-end (P0-2):** chạy `agent` (`python agent.py dev`) + `pnpm dev:web` với env thật → thực hiện 1 cuộc đặt vé + 1 cuộc gọi lại tra vé → kiểm tra `/dashboard` có call, transcript, booking confirmed; kiểm tra `find_booking` tìm được vé của cuộc trước. Ghi kết quả vào `reports/`.
2. **Deploy (P1-5):** build/push Docker worker, deploy host đã chọn; set Vercel env; deploy web; gọi thử từ production.
3. **Concurrency + mobile (P1-6):** 3 thiết bị gọi đồng thời từ QR; ghi nhận độ trễ, lỗi; kiểm tra UI mobile thật (iOS Safari + Android Chrome).
4. **Kịch bản (P0-3):** viết lại `docs/vedi-demo-script.md` theo 4 cảnh (nguồn: `visuals/alove-judge-demo-flow.html`) — lời thoại, ai bấm gì, thời lượng, phương án chữa cháy từng cảnh.
5. **Video backup (P0-4):** quay trọn luồng (landing → morph → đặt vé → dashboard → gọi lại → QR) bản mượt nhất.
6. **Credit + latency (P2-9):** check quota ElevenLabs/OpenAI/STT; đo độ trễ mỗi lượt; note vào kịch bản.
7. Tập dượt: 3 lần chạy trọn không lỗi trước ngày demo (tiêu chí từ brainstorm).

## Tiến độ 2026-07-18

- [x] P0-3 kịch bản demo 4 cảnh (`docs/vedi-demo-script.md`) + README theo luồng khách mới.
- [ ] Các mục còn lại **chặn vì thiếu credentials**: mọi biến LiveKit trong `.env` gốc và
  `apps/web/.env.production.local` đều rỗng, không có `agent/.env` → `/api/livekit/token`
  trả 503. Chi tiết và cách chạy local đúng: `reports/phase-05-verify-findings.md`.

## Success Criteria

- [ ] Cuộc gọi thật từ production hiện trên `/dashboard` trong vài giây (transcript + vé).
- [ ] Điện thoại lạ quét QR gọi được; 3 cuộc song song OK.
- [ ] `docs/vedi-demo-script.md` bản mới thay bản 4-nút-preset cũ.
- [ ] Video backup lưu ngoài repo (link trong kịch bản).
- [ ] 3 lần tập dượt liên tiếp pass.

## Risk Assessment

- Không có credentials trong workspace → phase chạy phối hợp với user; mọi bước còn lại đã chuẩn bị dạng checklist.
- Worker host free-tier ngủ giữa chừng → chọn plan/min-instances giữ tiến trình sống; test lại sau 30 phút idle.
- VALSEA STT glue chưa verify với bản livekit-agents đang cài (ghi chú trong `agent/README.md`) — nếu trục trặc, demo dùng preset STT đã chạy ổn định, không debug sát giờ.
