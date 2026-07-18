# VéĐi Demo Playbook

## Mục tiêu demo

Trong 5 phút, chứng minh bốn điểm:

1. Hội thoại tiếng Việt được chuyển thành booking có cấu trúc.
2. Mỗi field truy ngược được về final transcript nguồn.
3. Nhân viên giữ reply/confirmation authority và takeover được.
4. Failure hoặc thiếu credential chuyển về safe fallback, không tạo claim giả.

Thông điệp mở đầu: **“VéĐi giúp nhân viên nhà xe biến cuộc gọi đặt vé thành booking có bằng chứng; Agent hỗ trợ nhưng con người giữ quyền xác nhận.”**

## Chọn runtime profile

| Profile | Khi nào dùng | Thiết bị | Claim được phép |
|---|---|---|---|
| Local/public fallback | Mặc định cho demo giám khảo | Hai tab cùng browser | Realtime local, text/preset, optional browser speech, field filling và confirmation demo |
| Credentialed pilot | Chỉ khi integration status báo ready và đã rehearsal | Hai thiết bị | LiveKit transport và provider cụ thể đã qua smoke test |

Không đổi sang profile credentialed ngay trên sân khấu nếu chưa xác minh `session.ready`, VALSEA RTT, TTS và fallback. Trang public hiện mặc định local fallback.

## Chuẩn bị trước giờ trình bày

### T-24 giờ

- Kiểm tra [integration status](integration-test-status.md) và public `/api/health`, `/api/config`.
- Dùng session mới, chỉ chứa dữ liệu tổng hợp; không dùng dữ liệu hành khách thật.
- Chạy một lượt đúng timeline, ghi nhận trình duyệt, microphone và độ phân giải.
- Chuẩn bị video/screenshot dự phòng nhưng ưu tiên text/preset live.

### T-15 phút

1. Mở `/staff?session=DEMO42`.
2. Mở `/call?session=DEMO42` trong tab thứ hai **cùng browser** nếu dùng local mode.
3. Nếu dùng hai thiết bị, xác minh LiveKit/worker credentials và `VALSEA đang nghe`; nếu không, quay về local mode.
4. Xóa session cũ hoặc đổi code để không còn booking state trước đó.
5. Cho phép microphone nếu định dùng; nếu bị từ chối, chọn ngay text/câu mẫu.
6. Giữ `/staff` ở **Nhân viên/Human** khi bắt đầu.
7. Mở sẵn field evidence và vùng integration status để trỏ nhanh.

### Dữ liệu tổng hợp chuẩn

| Field | Giá trị |
|---|---|
| Tuyến | Sài Gòn → Đà Lạt |
| Số khách | 2 |
| Ngày giờ | 24/07 lúc 22:00 |
| Họ tên | Nguyễn Minh Anh |
| Điện thoại | 0909 123 456 |
| Điểm đón | Ngã tư Hàng Xanh |
| Điểm trả | Chợ Đà Lạt |

## Timeline 5 phút

| Thời gian | Thao tác presenter | Lời nói ngắn | Evidence cần chỉ |
|---|---|---|---|
| **0:00–0:30** | Nêu vấn đề và giải pháp một câu | “Nhân viên vừa nghe vừa nhập dễ bỏ sót; VéĐi tự cấu trúc dữ kiện nhưng giữ con người tại confirmation gate.” | Staff-first value |
| **0:30–1:00** | Mở `/staff` và `/call` | “Hai phía dùng cùng session; local mode chạy chắc chắn trong cùng browser.” | Two-sided workspace, Human mặc định |
| **1:00–2:00** | Gửi: “Đặt 2 vé từ Sài Gòn đi Đà Lạt ngày 24/07 lúc 22 giờ.” | “Partial chỉ hiển thị; final mới cập nhật booking.” | Final transcript; tuyến, ngày, giờ, số khách; exact quote |
| **2:00–3:00** | Gửi: “Tôi tên Nguyễn Minh Anh, số 0909 123 456, đón ở Ngã tư Hàng Xanh, trả tại Chợ Đà Lạt.” | “Booking được điền tăng dần và kiểm tra trường thiếu.” | Name/phone/pickup/dropoff, validation, evidence |
| **3:00–3:40** | Chỉ suggestion; bật Auto rồi takeover về Human | “Delegation cho Agent quyền trả lời theo phiên, không cho quyền xác nhận.” | Suggestion, Human/Auto authority, takeover không mất state |
| **3:40–4:20** | Review summary và bấm xác nhận | “Mã chỉ xuất hiện sau explicit confirmation.” | Confirmation gate và đúng một demo code |
| **4:20–4:40** | Thử xác nhận lại cùng state | “Retry cùng scope trả mã ổn định.” | **Stable code**; không sinh mã thứ hai |
| **4:40–5:00** | Mở integration status, nói giới hạn và bước tiếp | “Public demo là local fallback; LiveKit, VALSEA và Neon cần credentialed smoke trước pilot.” | Current limits, P1 credentialed pilot roadmap |

Không dừng để giải thích code trong 5 phút. Khi giám khảo hỏi sâu, chuyển sang [Capabilities and Evidence](capabilities-and-evidence.md) hoặc [Architecture](architecture.md).

## Expected evidence

| Quan sát | Pass | Nếu không thấy |
|---|---|---|
| Final transcript tạo một message ổn định | Có speaker/source và không bị partial ghi đè | Dùng preset/text, reload session |
| Field filling tăng dần | Field đúng với câu nguồn | Không sửa tay để che lỗi; chỉ rõ review state |
| Exact quote/evidence | Trích dẫn khớp final message | Dừng claim evidence-backed cho field đó |
| Human mặc định | Không có spontaneous Agent reply | Chuyển Human, tạo session mới |
| Auto/takeover | Agent dừng sau takeover, state còn nguyên | Dùng Human-only path |
| Confirmation gate | Mã chỉ sinh sau thao tác rõ ràng | Không claim booking safety |
| Duplicate confirmation | Một mã ổn định | Không xác nhận lại; ghi defect |
| Integration status | Khớp profile đang trình bày | Claim theo status thấp hơn |

## Fallback matrix

| Sự cố | Dấu hiệu nhìn thấy | Hành động an toàn | Được phép nói | Không được nói |
|---|---|---|---|---|
| Microphone bị từ chối | Browser báo denied, không có audio | Dùng text/câu mẫu | “Text fallback vẫn chạy cùng workflow.” | “Đây là live STT.” |
| Browser speech không hỗ trợ | Không có transcript từ mic | Dùng preset; giữ local mode | “Browser speech là optional fallback.” | “VALSEA đang nghe.” |
| LiveKit chưa cấu hình | `/api/config` báo `livekit=false` | Hai tab cùng browser | “Demo chạy local transport.” | “Hai thiết bị đang gọi qua LiveKit.” |
| Worker chưa ready | `Agent chưa cấu hình` hoặc chưa có `session.ready` | Human + text path | “Worker boundary đã có code/test.” | “Agent worker đang live.” |
| VALSEA chưa ready | `đang kết nối`, thiếu RTT ready | Text/preset; không dùng provider claim | “Credentialed VALSEA smoke còn thiếu.” | “Audio đã qua VALSEA.” |
| LLM/TTS unavailable | Suggestion/TTS timeout hoặc fallback label | Human trả lời; giữ transcript gốc | “Core workflow không phụ thuộc LLM success.” | “Agent vừa tự xử lý thành công.” |
| Neon unavailable | Persistence status false/error | Giữ demo trong session; không nhập PII | “Local demo state còn hoạt động.” | “Dữ liệu đã lưu bền vững.” |
| Duplicate confirmation bất thường | Mã đổi hoặc có hai mã | Dừng confirm; ghi defect; quay video evidence | “Demo phát hiện safety defect.” | “Idempotency đã pass.” |

Nguyên tắc: hạ claim theo evidence thật, không cố cứu live integration bằng credential mới trên sân khấu.

## Câu hỏi phản biện

### Vì sao không cho LLM xác nhận booking?

LLM có thể tạo ngôn ngữ nhưng không phải actor có thẩm quyền. Confirmation cần summary hợp lệ, actor rõ ràng, authorization và idempotency. Agent chỉ hỏi/gợi ý; passenger hoặc staff mới xác nhận.

### Vì sao worker tách khỏi Vercel?

Voice worker giữ kết nối realtime/WebSocket và vòng đời dài với LiveKit/VALSEA. Web/API phù hợp Vercel; worker chạy trên LiveKit Cloud Agents hoặc container runtime độc lập. Tách process cũng giữ provider secrets khỏi browser.

### Hôm nay phần nào thực sự live?

Public release chứng minh web, local two-tab synchronization, final field filling, evidence, authority và confirmation demo. LiveKit/VALSEA/Neon chưa được claim live nếu integration status còn false hoặc thiếu credential test.

### VALSEA chạy ở đâu?

Trong Python LiveKit worker: audio room đi vào VALSEA realtime STT; Auto reply qua guarded LLM rồi VALSEA TTS. Browser speech không đại diện cho VALSEA.

### Điều gì ngăn Agent bịa giá hoặc ghế?

Core chỉ cho đề xuất từ catalog/inventory đã publish. Demo hiện dùng deterministic sample catalog có nhãn. External inventory/seat guarantee vẫn ngoài phạm vi đến khi có integration và reconciliation.

### Provider lỗi thì sao?

Hệ thống giữ state cuối, gắn degraded status và chuyển Human/text path. Provider failure không được xác nhận booking hoặc tạo success claim.

### Chi phí triển khai bao nhiêu?

Chi phí phụ thuộc traffic, provider quote, worker hosting và scope pilot. [Business Case and Roadmap](business-case-and-roadmap.md) tách fixed/usage/one-time, ba kịch bản và contingency; provider không công khai giá được ghi “Cần báo giá”.

### Khách hàng đi từ demo đến production thế nào?

P0 chốt evidence; P1 bổ sung credentials, identity, consent, transaction và pilot gates; P2 thêm queue/catalog/observability; P3 mở rộng telephony, inventory integration, SLO và DR. Mỗi phase có exit criteria và rollback.

## Checklist sau demo

- [ ] Không có dữ liệu cá nhân thật trong session, screenshot hoặc log.
- [ ] Ghi browser/profile/session code đã dùng.
- [ ] Ghi rõ feature nào pass, fallback hoặc không được demo.
- [ ] Lưu source SHA/deployment ID nếu phát hành evidence mới.
- [ ] Không sửa integration status thành live nếu chưa có credential smoke.
- [ ] Thu thập câu hỏi giám khảo theo product, evidence, security, cost và roadmap.
- [ ] Nếu phát hiện duplicate code hoặc quyền sai, mở defect và dừng claim liên quan.
