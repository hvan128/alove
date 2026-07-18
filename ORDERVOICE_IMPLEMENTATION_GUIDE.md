# SpeechToInvoice — Hướng dẫn triển khai

Tên file cũ được giữ để không làm hỏng đường dẫn đã theo dõi. Nội dung này quy định cách triển khai **SpeechToInvoice**, AI Voice Agent đặt vé xe bằng tiếng Việt.

## Mục tiêu demo

Xây dựng một Web Call hai phía trong trình duyệt. Hành khách nói hoặc nhập yêu cầu đi xe; Agent hỗ trợ tìm tuyến, đề xuất chuyến và thu thập thông tin. Nhân viên chăm sóc khách hàng cùng theo dõi cuộc gọi, có thể trả lời thủ công hoặc tiếp quản Agent. Nhà xe là bên vận hành dữ liệu chuyến và chính sách xác nhận.

Demo chuẩn là **Sài Gòn → Đà Lạt**, hai hành khách, chuyến buổi tối.

## Luồng triển khai bắt buộc

1. Tạo phiên Web Call hiển thị đồng thời phía hành khách và phía nhân viên chăm sóc khách hàng.
2. Cho phép chuyển giữa chế độ `agent` và `human`; việc chuyển chế độ không được xóa transcript, evidence hay bản nháp.
3. Chỉ xử lý một tin nhắn **final** của hành khách để cập nhật booking draft.
4. Khám phá tuyến và đề xuất một chuyến từ danh mục tĩnh hoặc provider-sourced data đã được bật.
5. Thu thập lần lượt điểm đi, điểm đến, ngày đi, số hành khách, chuyến đã chọn, họ tên và số điện thoại Việt Nam.
6. Lưu `fieldEvidenceMessageIds` theo từng trường cho mọi giá trị được điền từ hội thoại, theo hợp đồng chuẩn tại `specs/api-contracts.md`.
7. Đọc lại tóm tắt trước khi yêu cầu xác nhận rõ ràng.
8. Khi hành khách hoặc nhân viên được ủy quyền xác nhận, cấp đúng một `bookingCode`. Xác nhận lặp lại phải trả về mã hiện hữu.

## Hợp đồng bản nháp

```ts
type BookingStatus =
  | 'collecting'
  | 'trip_proposed'
  | 'awaiting_confirmation'
  | 'confirmed'

type BookingDraft = {
  id: string
  conversationId: string
  status: BookingStatus
  origin: string | null
  destination: string | null
  travelDate: string | null
  passengerCount: number | null
  selectedTrip: BusTrip | null
  passengerName: string | null
  vietnamesePhone: string | null
  /** Canonical field-keyed evidence mapping; see specs/api-contracts.md. */
  fieldEvidenceMessageIds: Partial<Record<RequiredBookingField, string>>
  bookingCode: string | null
}
```

`awaiting_confirmation` và `confirmed` đều yêu cầu đủ bảy trường hợp lệ (điểm đi, điểm đến, ngày đi, số hành khách, chuyến đã chọn, họ tên, số điện thoại Việt Nam), cùng evidence theo từng trường từ tin nhắn final của hành khách hỗ trợ giá trị hiện tại và tóm tắt đã được đưa ra. `confirmed` còn yêu cầu xác nhận rõ ràng và đúng một `bookingCode`. Agent không được tự xác nhận. Không sử dụng transcript tạm thời hoặc tin nhắn từ Agent/nhân viên để suy ra dữ liệu hành khách.

## Ranh giới kỹ thuật

- Browser speech recognition và device TTS là progressive enhancement; text input và preset luôn là fallback.
- Adapter provider là seam. Chỉ mô tả provider là đang hoạt động khi credentials, runtime và kiểm thử thực tế đã xác minh.
- Không triển khai hoặc tuyên bố thanh toán, khóa ghế thực, gửi SMS/Zalo, PSTN/SIP, remote media room hoặc xác nhận tự động trong phạm vi demo.
- Không đưa secret vào client, source hoặc biến `NEXT_PUBLIC_*`.

## Chạy demo và quality gates

```bash
pnpm install
pnpm dev:web
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Mở `/console`, chọn **Agent**, thực hiện Sài Gòn → Đà Lạt cho hai hành khách, thêm thông tin người đi và xác nhận. Sau khi mã đặt vé xuất hiện, chuyển sang **Nhân viên** và tiếp quản để chứng minh trạng thái không bị mất.

## Tiêu chí bàn giao

- Web Call hai phía chạy được trong một trình duyệt.
- Agent và nhân viên có thể chuyển đổi, tiếp quản an toàn.
- Draft có evidence IDs, trạng thái rõ ràng và một mã đặt vé idempotent sau xác nhận.
- Các fallback text/preset hoàn thành được demo khi microphone hoặc speech API không khả dụng.
- Lint, typecheck, test, E2E và build được chạy theo phạm vi thay đổi.
