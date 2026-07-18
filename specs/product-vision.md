# Product Vision — Alove

## Purpose

Alove giúp khách đặt vé nhà xe bằng hội thoại tiếng Việt tự nhiên. Kết quả phải
là booking thật trong inventory nhà xe, không phải một bản demo hay phiếu giả.

## Users

| User | Need | Outcome |
|---|---|---|
| Hành khách | Tìm và đặt chuyến mà không điền form dài | Nghe đúng lịch/giá/điểm đón, xác nhận rồi nhận mã vé |
| Điều hành nhà xe | Theo dõi cuộc gọi và booking | Dashboard có trạng thái, transcript final và booking projection |
| Quản trị dữ liệu | Mở bán lịch và sơ đồ ghế thật | Seed có kiểm chứng, không sửa ghế đã hold/booked |

## Principles

1. Chỉ có một production flow: LiveKit + Python agent + `apps/web` API + Neon.
2. LLM hiểu ý định; database quyết định chuyến, giá, ghế và mã vé.
3. Browser không được tự chọn room, role, identity hoặc phát event như agent.
4. Booking chỉ được tạo sau xác nhận rõ ràng; retry không tạo vé thứ hai.
5. Hệ thống thiếu dependency phải báo unavailable, không rơi về dữ liệu demo.
6. Không lưu raw audio; PII và transcript được tối thiểu hóa theo nhu cầu vận hành.

## Success measures

- Khách hoàn thành một booking thật từ web hoặc SIP và nhận mã vé đúng inventory.
- Hai cuộc gọi cạnh tranh không thể giữ/xác nhận cùng một ghế.
- Retry cùng event không tạo transcript, snapshot hoặc booking trùng; lỗi gửi kéo
  dài được ghi log để vận hành phát hiện.
- Dashboard phản ánh live call và persisted audit từ cùng call ID.
- Vé đã xác nhận có QR phone-gated, JSON versioned và webhook tùy chọn mà hệ thống
  ngoài có thể kiểm chứng/xử lý; snapshot cũ không đổi khi catalog thay đổi.
- Evidence surface giữ kết quả synthetic/no-PII và không biến benchmark thành
  đường xử lý booking production.
- Production tại <https://vedi-one.vercel.app/> vượt lint, typecheck, test và build.

## Scope

Included: web call, LiveKit SIP, STT/LLM/TTS agent, real inventory, hold/confirm,
lookup/cancel có possession check, ticket/QR và operations dashboard.

Excluded: payment collection, multi-tenant RBAC, outbound marketing calls và giữ
lại compatibility với legacy deterministic browser demo.
