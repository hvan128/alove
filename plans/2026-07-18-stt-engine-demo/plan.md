# Màn test STT/workflow riêng cho demo hackathon (`/engine`)

**Status:** Done — verified thật với VALSEA API (xem phase-01 mục "Đã verify thật")
**Vertical/workflow đã chốt:** Tổng đài đặt vé xe khách đường dài — giọng nói khách gọi → phiếu đặt vé sẵn sàng xác nhận (dùng lại `@ordervoice/core/bus-booking`, không LLM).

## Bối cảnh

Cần một màn hình độc lập để show giám khảo: đưa audio tiếng Việt thật (giọng vùng miền / code-switch VN-EN / nhiễu điện thoại) vào ASR bắt buộc của đề bài, ra transcript, rồi biến transcript thành output sẵn sàng cho quy trình (không dừng ở text thô). UI không nêu tên nhà cung cấp ASR — hiển thị là "Lõi nhận diện giọng nói VéĐi", tài liệu/README vẫn ghi rõ nhà cung cấp thật cho giám khảo.

Quyết định của người dùng (đã chốt qua AskUserQuestion ngày 2026-07-18):
- Route độc lập mới `/engine`.
- Nguồn audio: cả tải file lẫn ghi âm mic (ghi âm xong cũng phát lại qua đúng pipeline replay, để so sánh công bằng với baseline).
- Có so sánh song song với ASR "thường" (OpenAI Whisper) trên cùng file audio.
- Tên hiển thị: "Lõi nhận diện giọng nói VéĐi".

## Phát hiện quan trọng khi khảo sát repo

- `packages/providers/src/valsea.ts` (adapter Node dùng bởi gateway `apps/api`) **sai giao thức thật** — đã bị ADR 0009 gắn cờ "phải sửa trước khi được dùng lại ở đâu đó". `/engine` sẽ là nơi dùng lại nó lần đầu → phải sửa trước, nếu không sẽ im lặng không ra transcript hoặc không nhận đúng tiếng Việt.
- Pipeline file→PCM16→gateway đã có sẵn và hoạt động (`useZaloReplay`), chỉ đang "mồ côi" (không gắn route nào). Tái dùng nguyên hook này thay vì viết pipeline mới.
- `advanceBookingAgent` (packages/core/src/bus-booking.ts) là logic xác định (regex/lookup), không LLM, chỉ hiểu đúng tuyến Sài Gòn↔Đà Lạt và các cụm câu cụ thể (ngày, "tôi là", số điện thoại 10 số, cụm xác nhận). Với audio tự do sẽ ra kết quả thật (có thể thiếu trường) — cần hiển thị gợi ý kịch bản để có thể demo ra phiếu vé đầy đủ.
- `POST /api/booking/advance` hiện tại được khoá bằng `AGENT_WEBHOOK_SECRET` cho riêng agent — không dùng lại cho `/engine`; gọi thẳng `advanceBookingAgent`/`createInitialBooking` phía client vì đó là hàm thuần, không cần secret.

## Phases

1. [phase-01-implementation.md](phase-01-implementation.md) — sửa giao thức VALSEA, thêm baseline OpenAI, dựng route `/engine` và các component, test.

## Acceptance criteria

- Tải một file audio thật (hoặc ghi âm mic) chạy qua `/engine` cho ra transcript tiếng Việt có dấu, giữ nguyên từ tiếng Anh nếu có — gọi thật `wss://api.valsea.ai/v1/realtime` qua gateway hiện có, không mock.
- Transcript final tự động đổ vào `advanceBookingAgent` và hiển thị phiếu đặt vé (tái dùng `BookingSummary`).
- Cùng file audio đó được gửi song song tới baseline OpenAI Whisper, hiển thị transcript đối chứng cạnh nhau.
- UI không có chữ "VALSEA" ở bất kỳ đâu; README/kiến trúc vẫn ghi rõ cho hồ sơ nộp.
- `pnpm lint`, `pnpm -r --if-present typecheck`, `pnpm test` xanh cho các gói bị đụng vào.
