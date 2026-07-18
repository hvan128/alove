# Main Feature Specification — SpeechToInvoice / VéĐi

Tài liệu này là nguồn sự thật cho **target product**. Trạng thái code hiện tại và bằng chứng tương ứng nằm tại [`../docs/current-vs-target-architecture.md`](../docs/current-vs-target-architecture.md). Thiết kế đã duyệt cho dashboard, catalog và seat inventory nằm tại [`../docs/superpowers/specs/2026-07-18-vedi-operations-catalog-seat-inventory-design.md`](../docs/superpowers/specs/2026-07-18-vedi-operations-catalog-seat-inventory-design.md).

## F-01: Incoming-call notification and staff acceptance

Khi có người gọi đến đặt vé, dashboard nhà xe phải phát thông báo realtime và đưa session vào hàng đợi `ringing`. Nhân viên bấm **Nhận cuộc gọi** để nhận ownership; một session chỉ có một staff owner tại một thời điểm.

## F-02: Staff-first reply authority

Nhân viên giữ reply authority mặc định sau khi nhận cuộc gọi. Agent không tự trả lời trước khi nhân viên bấm **Trao quyền Agent**. Quyền có scope theo session, được thu hồi ngay và mọi handoff `staff ↔ agent` phải có audit event.

## F-03: VALSEA-first Vietnamese voice pipeline

Audio dùng để chấm demo phải đi qua VALSEA ASR endpoint. Pipeline xử lý partial/final transcript gần thời gian thực, giữ dấu tiếng Việt và embedded English terms. Browser STT/TTS chỉ là fallback có nhãn, không phải bằng chứng VALSEA.

## F-04: Difficult Vietnamese audio

Demo và pilot phải dùng audio thật hoặc anonymized/synthetic có consent, bao phủ giọng vùng miền, VN/EN code-switching, noisy/field audio hoặc telephony conditions. Hệ thống phải giữ critical booking fields dù transcript không hoàn hảo từng từ.

## F-05: Staff live transcript

Nhân viên xem partial/final transcript theo speaker. Partial chỉ hiển thị; final caller message mới được cập nhật booking. UI đánh dấu confidence, provider/source, ngôn ngữ hiển thị và đoạn cần review.

## F-06: Evidence-backed automatic field filling

Final caller messages tự điền hoặc sửa điểm đi, điểm đến, ngày/giờ, số khách, chuyến, họ tên, số điện thoại, điểm đón/trả và các field hỗ trợ. Mỗi value phải giữ exact quote, message ID, confidence, source và revision history. Staff/Agent message không thay thế caller evidence.

## F-07: Missing-field navigation

Sau mỗi final turn, semantic/workflow layer tính lại field thiếu, sai hoặc mơ hồ. Agent hoặc suggestion engine hỏi tối đa nhóm field liên quan tiếp theo, không hỏi lại dữ liệu đã đủ và không âm thầm chọn giá trị mơ hồ.

## F-08: Reply suggestions and delegated auto-reply

Human mode tạo suggestion nhưng không tự phát giọng. Khi staff trao quyền, Agent được gửi suggestion đã qua schema, catalog và policy validation. Staff có thể takeover, chỉnh sửa, trao lại quyền hoặc dừng Agent mà không mất session state.

## F-09: Catalog-bound trip proposal

Agent chỉ đề xuất tuyến, chuyến, giá và ghế từ catalog version đã publish và inventory snapshot hiện hành. LLM không tự sinh giá, lịch, inventory hoặc chính sách. Demo tĩnh phải có nhãn; external operator inventory vẫn là integration riêng.

## F-10: Field validation and explicit confirmation

Booking chỉ vào `awaiting_confirmation` khi toàn bộ required fields hợp lệ, có evidence và không còn blocking review item. Hệ thống đọc lại summary; passenger hoặc staff actor có quyền xác nhận rõ ràng. Agent không có confirmation authority.

## F-11: Idempotent booking issuance

Confirmation hợp lệ tạo đúng một booking code trong transaction. Exact retry cùng session/request/summary scope trả code hiện có; key reuse cho payload hoặc scope khác bị từ chối. Failure không được tạo trạng thái confirmed giả.

## F-12: Enterprise operations dashboard

Apple-like operations dashboard hiển thị incoming queue, active sessions, owner, Agent delegation, booking state, takeover reason, departures, occupancy, catalog/inventory alerts, completion metrics và audit trail. Chọn session mở staff cockpit tập trung thay vì nhồi toàn bộ transcript vào dashboard. Role tối thiểu: admin, dispatcher, customer-care và read-only.

## F-13: Bus-operator data management

Nhà xe quản lý chi nhánh, tuyến, điểm đón/trả, lịch chạy, vehicle template, xe, loại ghế, giá và sức chứa. Thay đổi đi qua `draft → validated → published → retired`; published version bất biến và booking giữ version đã dùng. Dữ liệu hỗ trợ form, version/effective date, validation và publish workflow. CSV import chạy dry-run, báo lỗi từng dòng và chỉ ghi vào draft; live API sync chỉ bật khi có contract và reconciliation tương ứng.

## F-14: Persistence and audit

Pilot lưu final transcript, booking snapshot, field evidence, confirmation, idempotency record, assignment và authority handoff. Không lưu partial hoặc raw audio mặc định. Consent, retention, redaction và role access phải cấu hình trước dữ liệu thật.

## F-15: Multilingual and code-switch handling

Vietnamese + English code-switching trong cùng câu là bắt buộc. Target bonus hỗ trợ nhiều ngôn ngữ đồng thời trong cùng session. Translation không được thay đổi original evidence hoặc tự dịch dữ liệu định danh khi confidence thấp.

## F-16: Safe fallback and human escalation

Khi mic, LiveKit, VALSEA, LLM, TTS hoặc persistence lỗi, hệ thống giữ final state gần nhất, hiển thị degraded state và chuyển về text/preset hoặc Human mode. Không integration failure nào được cấp booking hoặc success claim giả.

## F-17: Demo and delivery evidence

Deliverables gồm prototype live URL hoặc video, public GitHub repository, explainable architecture và pilot/deployment roadmap 1–2 trang. Release evidence phải ghi source SHA, deployment ID, credential mode, sample ID, latency và observed failure behavior.

## F-18: Operator seat layout and pilot-safe inventory

Admin tạo vehicle template theo tầng, hàng, cột, lối đi, loại ghế và mã ghế duy nhất. Khi trip được publish, hệ thống tạo per-trip seat inventory với trạng thái `available`, `held`, `booked` hoặc `blocked`. Dispatcher/customer-care xem seat map và tạo hold server-side mặc định 10 phút; caller không thao tác seat map trong phase này. Đổi chuyến/ghế, kết thúc call hoặc expiry phải release hold. Confirmation hợp lệ consume hold cùng transaction tạo booking và audit; concurrent hold cùng trip/seat chỉ một request được thắng.

## Explicit exclusions until separately verified

Payment, external operator-synchronized inventory hoặc ticket guarantee, PSTN/SIP, Zalo raw call audio, SMS delivery và autonomous confirmation không được claim live chỉ từ adapter, internal demo inventory hoặc UI seat map.
