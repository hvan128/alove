# Kịch bản demo Alove

Bốn cảnh, khoảng 6 phút, trình bày cho giám khảo. Thiết kế đầy đủ nằm ở
`plans/2026-07-18-judge-demo-flow/` (kèm hai trang trực quan trong `visuals/`).

**Chuẩn bị trước khi lên sân khấu**

- Tab 1: trang chủ `/` (đã tải sẵn, cuộn lên đầu).
- Tab 2: `/dashboard` đã đăng nhập bằng `DASHBOARD_ACCESS_KEY`.
- Agent worker đang chạy và đã đăng ký với LiveKit (`LIVEKIT_AGENT_NAME=alove`).
- Slide QR trỏ về production `/` — không phải `/console`.
- Video backup mở sẵn ở tab ẩn, phòng khi mạng hội trường chết.
- Loa vừa phải: to quá thì mic bắt lại giọng agent và nó tự trả lời chính mình.

---

## Mở màn — 30 giây

> "Nhà xe Mai Anh nhận đặt vé qua điện thoại. Giờ cao điểm nhân viên nghe không
> xuể, khách gọi mãi không được thì đặt xe khác. Alove là tổng đài viên AI —
> alo là có vé."

Vào demo ngay, đừng giải thích kiến trúc trước.

## Cảnh 1 — Đặt vé bằng giọng nói (~2,5 phút, tab trang chủ)

1. Chỉ nhanh vào bảng lịch chạy: **"Giá và giờ trên trang này lấy thẳng từ hệ
   thống đặt vé — lát nữa tổng đài sẽ đọc đúng những con số này."**
2. Bấm **Gọi để đặt xe**. Nút phình ra thành khung cuộc gọi, đổ chuông, agent chào.
3. Nói: *"Cho tôi hai vé Sài Gòn đi Đà Lạt tối mai."*
4. Agent mời chuyến thật kèm điểm đón và điểm trả.
5. **Pha đổi ý cố tình** — thứ chứng minh đây không phải kịch bản thu sẵn:
   *"Thôi, cho tôi đi ngày kia."* Agent bỏ chuyến cũ, tìm lại.
6. Chọn chuyến, khai tên và số điện thoại. Agent đọc lại số theo từng cụm.
7. Nói *"Tôi xác nhận"*. Agent báo mã vé, chúc đi đường bình an rồi tự cúp máy.
8. Màn **Vé của bạn** hiện ra: mã vé, QR lên xe, điểm đón. Bấm **Lưu vé về máy**.

Trong lúc nói, để mắt giám khảo bám vào phiếu vé bên phải — từng ô sáng lên đúng
lúc agent nghe được thông tin.

## Cảnh 2 — Phía nhà xe (45 giây, tab dashboard)

Chuyển tab. Cuộc gọi vừa xong nằm đầu danh sách: transcript đầy đủ, vé ở trạng
thái đã xác nhận.

> "Vé nằm trong hệ thống của nhà xe, nhân viên giám sát được từng cuộc gọi."

Cảnh này trả lời câu hỏi giám khảo luôn nghĩ trong đầu: *demo giả hay dữ liệu thật?*

## Cảnh 3 — Gọi lại tra vé (60 giây, quay lại trang chủ)

1. Bấm **Gọi để đặt xe** lần nữa — cuộc gọi mới.
2. Nói: *"Tôi đặt vé hồi nãy mà quên mất mã."*
3. Agent hỏi mã vé → trả lời không nhớ → agent hỏi số điện thoại.
4. Đọc số điện thoại đã dùng ở Cảnh 1. Agent tìm đúng vé cũ và đọc lại.

> "Vé vẫn ở đó sau khi cúp máy. Đổi hay huỷ chỉ cần gọi lại đọc số điện thoại."

## Cảnh 4 — Giám khảo tự gọi (60 giây)

Chiếu QR, mời một hai giám khảo quét và gọi từ điện thoại của họ. Nút gọi nằm
sẵn ở đáy màn hình điện thoại; phiếu vé thu thành thanh tóm tắt, chạm để mở.

Nếu nhiều người gọi cùng lúc mà nghẽn, mời một người đại diện thay vì để cả
phòng chờ.

## Chốt — 15 giây

> "AI chỉ đảm nhận phần hội thoại. Giá, chuyến, ghế, mã vé đều lấy từ hệ thống
> đặt vé — AI không bịa được, kể cả khi nó muốn."

---

## Chữa cháy từng cảnh

| Tình huống | Xử lý |
|---|---|
| Chờ mãi không có ai bắt máy | Màn gọi tự hiện "Tổng đài đang bận" kèm nút **Gọi lại** sau khoảng 48 giây. Bấm gọi lại, vừa bấm vừa nói tiếp về kiến trúc. |
| Mạng hội trường chậm/chết | Chuyển sang video backup, thuyết minh đè lên. |
| Agent nghe sai tên hoặc số | Cứ sửa bằng lời như người thật — agent xử lý được, và đó cũng là điểm mạnh đáng khoe. |
| Agent nghe lại giọng chính nó | Hạ loa xuống, hoặc dùng tai nghe. |
| Hết credit provider giữa chừng | Không cứu được tại chỗ — phải kiểm tra quota trong ngày demo. |

## Việc phải làm trước ngày demo

- [ ] Điền credentials LiveKit (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
      `NEXT_PUBLIC_LIVEKIT_URL`, `AGENT_WEBHOOK_SECRET`) cho cả web và agent worker.
- [ ] Deploy agent worker chạy 24/7 (`agent/Dockerfile` — xem `docs/livekit-deployment.md`).
- [ ] Chạy thử trọn Cảnh 1 → 3 với credentials thật, kiểm tra vé lên `/dashboard`.
- [ ] Thử 3 điện thoại lạ gọi song song qua QR.
- [ ] Kiểm tra quota OpenAI / TTS / STT.
- [ ] Quay video backup toàn luồng.
- [ ] Tập dượt trọn kịch bản 3 lần không lỗi.
