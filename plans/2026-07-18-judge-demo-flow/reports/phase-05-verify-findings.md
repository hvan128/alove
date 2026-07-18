# Phase 5 — kết quả verify (2026-07-18)

## Làm được

- **P0-3 kịch bản demo:** `docs/vedi-demo-script.md` viết lại theo 4 cảnh, kèm lời thoại,
  bảng chữa cháy và checklist trước ngày demo. README cập nhật theo luồng khách mới.
- **Gates toàn repo xanh:** lint (chỉ còn 1 lỗi tồn đọng ở `call-stage.tsx` TypewriterCaption,
  ngoài phạm vi các phase này), typecheck 6/6 package, unit 66 test, build, e2e 6/6
  (gồm 1 test mobile viewport 390×844).

## Chặn — thiếu credentials, cần người dùng

Kiểm tra thực tế các file env trong workspace:

| Nguồn | Trạng thái |
|---|---|
| `.env` (gốc repo) | Có tên biến `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL`, `AGENT_WEBHOOK_SECRET` nhưng **giá trị rỗng** |
| `apps/web/.env.production.local` (kéo từ Vercel) | Các biến LiveKit + `DATABASE_URL` + `AGENT_WEBHOOK_SECRET` cũng **rỗng**; chỉ `DASHBOARD_ACCESS_KEY` có giá trị |
| `agent/.env` | Không tồn tại |

Hệ quả: `POST /api/livekit/token` trả `503 livekit_not_configured`, nên
**không verify được đường gọi thật** (P0-2), và bản deploy hiện tại đang chạy
fallback zero-key chứ không phải agent thật.

Lưu ý thêm về cách chạy local: `next dev` chạy với cwd `apps/web` nên chỉ đọc
`apps/web/.env*`, **không** đọc `.env` ở gốc repo. Muốn chạy đường LiveKit thật ở
local phải có `apps/web/.env.local` (hoặc `.env.development.local`) chứa các biến đó.
`.env.production.local` chỉ dùng cho build production, `next dev` bỏ qua.

## Còn lại cho người dùng

1. Điền credentials LiveKit thật cho web (Vercel env) và cho `agent/.env`.
2. Deploy agent worker chạy 24/7 (`agent/Dockerfile`, xem `docs/livekit-deployment.md`).
3. Chạy trọn Cảnh 1 → 3 với credentials thật; kiểm tra vé lên `/dashboard`.
4. Test 3 cuộc gọi song song từ điện thoại lạ qua QR.
5. Kiểm tra quota provider; quay video backup; tập dượt 3 lần.
