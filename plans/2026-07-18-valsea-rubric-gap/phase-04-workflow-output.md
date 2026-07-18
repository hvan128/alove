# Phase 04 — Output thực thi được

**Mục tiêu:** Tiêu chí "Workflow-Readiness" (15%) đòi output *"plugs directly into a
real business process… rather than stopping at a raw transcript"*. Hiện phiếu vé
đẹp nhưng là pixel — không rời khỏi màn hình được.

**Không chặn bởi phase nào.**

## Tình trạng hiện tại

- `ticket-card.tsx:236-238` — comment tự thú: mã vạch *"Không phải Code 128 hợp lệ,
  đừng kỳ vọng máy quét đọc được"*. Vân sinh từ `bookingCode` cho đẹp, không mang dữ liệu.
- Không nút tải JSON, không PDF, không SMS/Zalo, không webhook.
- Có ghi Postgres qua `/api/booking/confirm` — nhưng đó là DB của chính app, không
  phải "hệ thống mà doanh nghiệp đã chạy".
- Nhánh demo thuần browser (`bus-call-workspace.tsx:122`) **không ghi gì** vào DB.

## 4.1 — QR quét được (đây là khoảnh khắc thuyết phục nhất)

Thay `Barcode` trang trí bằng QR **thật** encode payload tra cứu vé
(`bookingCode` + URL `/api/booking/lookup`).

Vì sao ưu tiên số một: giám khảo rút điện thoại quét ngay trên sân khấu và thấy
thông tin vé hiện ra. Không slide nào, không lời giải thích nào bằng. Nó biến
"workflow-ready" từ một tuyên bố thành một thứ họ tự kiểm chứng trong 3 giây.

Giữ `Barcode` cũ làm hoạ tiết nếu vẫn muốn vé trông giống vé nhiệt — nhưng QR phải
là thật và phải quét được.

Thư viện: dùng một QR encoder nhỏ, không phụ thuộc mạng (vé phải render offline được).

## 4.2 — Export JSON

Nút "Tải phiếu (JSON)" trên `TicketCard`, xuất đúng `bookingDraftSchema`
(`packages/contracts/src/index.ts:137`). Kèm panel xem trước payload.

Mục đích: chứng minh output **máy đọc được**, không chỉ người đọc. Schema đã có sẵn
và đã được validate ở data-channel (`livekit-call.tsx:184-193`) — đây chỉ là phơi nó ra.

## 4.3 — Webhook ra hệ ngoài

`POST /api/booking/webhook` — bắn phiếu vé đã xác nhận sang một endpoint cấu hình
bằng `BOOKING_WEBHOOK_URL`.

- Ký payload bằng HMAC (`BOOKING_WEBHOOK_SECRET`), giống cách `/api/call/events`
  đang xác thực bearer (`app/api/call/events/route.ts:22-25`).
- Retry có backoff, log kết quả xuống dashboard để demo thấy được.
- Không có env → bỏ qua im lặng, demo public vẫn chạy.

Demo: trỏ vào một webhook.site hoặc một route giả lập "hệ quản trị nhà xe" trong
chính app, hiện log realtime trên `/dashboard`. Giám khảo thấy dữ liệu rời khỏi
hệ thống mình và tới nơi khác — đó là định nghĩa của "plugs into a process".

## 4.4 — Vá lỗ nhánh demo không ghi DB

`bus-call-workspace.tsx:114-133` chạy `advanceBookingAgent` client-side và không gọi
API nào → demo thuần browser không để lại dấu vết nào trên `/dashboard`.

Nếu demo trên sân khấu chạy nhánh này (khả năng cao — không phụ thuộc LiveKit),
thì dashboard sẽ trống trơn đúng lúc cần khoe nó. Cho nhánh này gọi
`/api/booking/advance` khi có mạng, fallback client-side khi không.

## Files

- Sửa: `apps/web/src/components/bus-call/ticket-card.tsx`
- Tạo: `apps/web/src/components/bus-call/ticket-qr.tsx`
- Tạo: `apps/web/src/app/api/booking/webhook/route.ts`
- Tạo: `apps/web/src/app/api/booking/webhook/route.test.ts`
- Sửa: `apps/web/src/components/bus-call/bus-call-workspace.tsx` (4.4)
- Sửa: `.env.example` (`BOOKING_WEBHOOK_URL`, `BOOKING_WEBHOOK_SECRET`)

## Validation

- Quét QR bằng điện thoại thật → ra đúng phiếu. Test này **phải làm bằng tay**,
  không có unit test nào thay được.
- JSON tải về parse qua `bookingDraftSchema` không lỗi.
- Webhook: test route với secret sai → 401; retry khi 500.
- E2E Playwright: xác nhận vé → nút tải JSON xuất hiện.

## Rủi ro

- Thêm QR làm tăng bundle. Chọn encoder nhỏ, import động trong `TicketCard`.
- Webhook bắn dữ liệu khách ra ngoài — chỉ bật khi có env, và **không** gửi số điện
  thoại đầy đủ trong demo công khai. Che giữa số như dashboard đang làm.
