# Workflow — SpeechToInvoice

Tài liệu này là quy trình làm việc cho **SpeechToInvoice**, AI Voice Agent đặt vé xe bằng tiếng Việt. Mọi thay đổi phải bảo toàn hợp đồng đặt vé: chỉ tin nhắn cuối cùng của hành khách mới có thể cập nhật bản nháp, và chỉ xác nhận rõ ràng mới được cấp mã đặt vé.

## Context trước khi thay đổi

1. Đọc `AGENTS.md`, task hiện tại và các tài liệu trong `specs/`.
2. Xác định tác động tới hành khách, nhân viên chăm sóc khách hàng và nhà xe.
3. Kiểm tra hợp đồng Web Call hai phía, Agent/nhân viên, bằng chứng tin nhắn và idempotency trước khi đổi UI hoặc domain logic.
4. Không mở rộng phạm vi sang thanh toán, khóa ghế thực, giao nhận, PSTN/SIP, remote media room hoặc xác nhận tự động nếu chưa có yêu cầu mới.

## Luồng sản phẩm cần giữ

```text
Hành khách bắt đầu Web Call trong trình duyệt
→ Agent hoặc nhân viên tiếp nhận yêu cầu
→ Tìm tuyến và đề xuất chuyến
→ Thu thập hành trình + thông tin hành khách
→ Đọc tóm tắt có evidence
→ Xác nhận rõ ràng của hành khách / nhân viên được ủy quyền
→ Một mã đặt vé idempotent
```

Nhân viên có thể tiếp quản từ Agent bất kỳ lúc nào; transcript và bản nháp phải được giữ nguyên. Browser speech và device TTS chỉ là progressive enhancement; text và preset phải vẫn hoàn thành demo.

## Contract checklist

- Final passenger message mới được điền hoặc sửa: điểm đi, điểm đến, ngày đi, số hành khách, chuyến đã chọn, họ tên và số điện thoại Việt Nam.
- Mỗi giá trị được trích xuất phải giữ `fieldEvidenceMessageIds` theo khóa trường; mapping chuẩn được định nghĩa tại `specs/api-contracts.md`.
- Bản nháp đi qua các trạng thái `collecting`, `trip_proposed`, `awaiting_confirmation`, `confirmed`.
- `awaiting_confirmation` và `confirmed` chỉ hợp lệ khi đủ cả bảy trường bắt buộc và hợp lệ, với evidence từ tin nhắn final của hành khách cho giá trị hiện tại của từng trường, cùng một bản tóm tắt.
- `confirmed` còn cần xác nhận rõ ràng và đúng một `bookingCode`.
- Xác nhận lặp lại không tạo mã mới: trả lại mã đã tồn tại.

## Chạy và kiểm tra

```bash
pnpm install
pnpm dev:web
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build
```

Demo mở ở `/console`: chọn **Agent**, đặt tuyến **Sài Gòn → Đà Lạt** cho hai hành khách, cung cấp thông tin người đi, xác nhận, rồi chuyển sang **Nhân viên** để tiếp quản.

## Git handoff

Giới hạn commit vào phạm vi task, kiểm tra diff và các quality gate liên quan trước khi commit. Không push, merge hoặc deploy nếu chưa có yêu cầu rõ ràng.
