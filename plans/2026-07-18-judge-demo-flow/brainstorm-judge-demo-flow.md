# Brainstorm: Luồng demo Alove cho giám khảo

**Ngày:** 2026-07-18
**Bối cảnh chốt:** demo cuộc thi cho giám khảo · Web Call trong browser (LiveKit) · phương án **3 cảnh + QR giám khảo**.

## Vấn đề

Repo đã có lõi mạnh (agent LiveKit GPT-4.1 + booking xác định server-side, `/console`, `/dashboard`, `find_booking`) nhưng demo hiện tại chỉ là "vào console → bấm nút → nói chuyện": không có mở bài, không cho thấy hệ quả (vé vào hệ thống, nhà xe thấy gì), không chứng minh persistence. Kịch bản cũ `docs/vedi-demo-script.md` viết cho bản 4 nút preset, lỗi thời.

## Phương án đã cân nhắc

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| Chỉ cảnh đặt vé (~3′) | Gọn, ít rủi ro | Bỏ phí dashboard + find_booking; không trả lời "dữ liệu thật không?" | Loại |
| 3 cảnh (~5′) | Tận dụng hết cái đã build, kể chuyện trọn | Cần verify đường ghi dashboard | Nền tảng |
| **3 cảnh + QR (chọn)** | Giám khảo tự gọi = thuyết phục nhất | Thêm biến số: deploy worker 24/7, mạng venue, concurrency | **Chọn**, QR là cú chốt sau khi 3 cảnh mượt |

## Kịch bản demo (~6 phút)

### Mở màn (30″)
Một slide/một câu: "Nhà xe Mai Anh nhận đặt vé qua điện thoại, giờ cao điểm nghe không xuể. Alove là tổng đài viên AI — alo là có vé."

### Cảnh 1 — Đặt vé (2–2,5′) · `/console`
1. Bấm **Bắt đầu Web Call**, ringback → agent chào.
2. MC: "Cho tôi 2 vé Sài Gòn đi Đà Lạt tối mai." Agent hỏi phần thiếu, mời chuyến thật (điểm đón/trả từ `search_trips`).
3. **Pha khó cố tình** (chứng minh không phải kịch bản thu sẵn): đổi ý giữa chừng — "thôi, cho tôi đi ngày kia" → agent cancel/tìm lại.
4. Chọn chuyến → agent giữ chỗ → khai tên + SĐT → agent đọc lại SĐT theo cụm → xác nhận → **mã vé** → agent chào, tự cúp.
5. Mắt giám khảo bám vào **TicketCard điền dần realtime** bên phải.

### Cảnh 2 — Phía nhà xe (45″) · `/dashboard`
Tab mở sẵn (đã login từ trước): cuộc gọi vừa rồi trong danh sách, transcript đầy đủ, vé confirmed. Trả lời câu hỏi ngầm "demo giả hay dữ liệu thật?".

### Cảnh 3 — Gọi lại tra vé (60″) · `/console`
Cuộc gọi mới: "Tôi đặt vé mà quên mất mã." → agent hỏi SĐT → `find_booking` đọc đúng vé cũ. Chứng minh persistence + trí nhớ xuyên cuộc gọi.

### Cảnh 4 — QR giám khảo (60″)
Chiếu QR → giám khảo quét, gọi từ điện thoại của họ (production URL, mobile browser). Cú chốt.

### Chốt (15″)
"AI chỉ đảm nhận hội thoại. Giá, chuyến, ghế, mã vé đều từ hệ thống đặt vé — AI không bịa được." (differentiator kỹ thuật thật của kiến trúc này.)

## Cải tiến cần làm

**P0 — thiếu là demo vỡ**
1. Đường thoát khi agent không join: sau ~30s redispatch thất bại → thông báo + nút "Gọi lại" trên `/console` (hiện ringback chạy vô hạn — `livekit-call.tsx`).
2. Verify end-to-end đường ghi dashboard với credentials thật (cuộc gọi LiveKit → calls/transcript/booking vào DB). Cảnh 2 phụ thuộc hoàn toàn.
3. Viết lại `docs/vedi-demo-script.md` theo kịch bản này.
4. Quay video backup toàn luồng.

**P1 — cần cho QR + độ dễ hiểu**
5. Deploy agent worker 24/7 (Docker sẵn — Railway/Fly/Cloud Run min-instances) + production Vercel có đủ LiveKit env. QR chỉ chạy khi cái này xong.
6. Test concurrency: ≥3 cuộc gọi song song từ điện thoại lạ; check UI `/console` trên mobile.
7. TicketCard flash/pulse field vừa điền khi `booking.update` tới.
8. Màn chờ `/console` có ngữ cảnh: "Bạn đang gọi tổng đài AI nhà xe Mai Anh" + nút gọi to.

**P2 — nếu dư lực**
9. Đo latency turn; kiểm tra credit ElevenLabs/OpenAI/STT trước buổi demo.

## Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Mạng venue chậm/chết | Hotspot 4G riêng; video backup (P0.4) |
| Agent không join phòng | Redispatch (có sẵn) + UI timeout/nút gọi lại (P0.1) |
| Echo loa hội trường → agent tự nghe mình | echoCancellation đã bật; test loa/mic tại chỗ, để loa vừa phải |
| STT nghe sai SĐT/tên | Agent đã đọc lại SĐT theo cụm; MC dùng tên/SĐT đã tập |
| Nhiều giám khảo quét QR cùng lúc | Test concurrency trước (P1.6); nếu quá tải, mời 1–2 người đại diện |
| Quota/credit provider hết giữa demo | Check credit + chạy full rehearsal cùng ngày |

## Tiêu chí thành công

- Chạy trọn 4 cảnh không chạm bàn phím ngoài chuyển tab; mỗi lượt agent đáp < ~3s.
- Vé xuất hiện trên dashboard trong vài giây sau confirm.
- ≥2 điện thoại giám khảo gọi thành công qua QR.
- 3 lần tập dượt liên tiếp không lỗi trước ngày demo.

## Bổ sung 2026-07-18: Luồng khách hàng thực tế (user flow)

Người dùng chốt thêm luồng khách end-to-end (xem `visuals/alove-customer-journey.html`). Luồng này **là** Cảnh 1 của demo — demo mở bằng trang nhà xe thật thay vì console trống.

**5 màn:** Trang chủ nhà xe → morph overlay gọi → trong cuộc gọi → màn "Vé của bạn" → về trang chủ / tra cứu / gọi lại.

**Quyết định người dùng:**
- Trang chủ `/` viết lại thành trang bán vé nhà xe Mai Anh (tuyến/giờ/giá từ `createBusDemoCatalog()`), CTA chính duy nhất **"Gọi để đặt xe"** (thay "Bắt đầu Web Call"), mobile sticky đáy màn. — OK
- Sau khi đặt xong: màn **"Vé của bạn"** (mã vé + QR + điểm đón + Lưu vé / Đặt chuyến khác / Đóng, ghi chú gọi lại để đổi/huỷ). — OK
- UX-2 phải có **animation morph**: pill CTA phình ra thành chính panel cuộc gọi (~450ms spring, border-radius 999→24px, dim+blur nền, orb sáng dần sau khi panel đáp, xin mic sau khi overlay hiện, đóng thì morph ngược; mobile morph từ sticky button thành full-screen sheet). Kỹ thuật: **Framer Motion `layoutId`** (đã chọn, thay vì View Transitions API / FLIP thủ công — lý do: morph 2 chiều + chịu interrupt, repo chưa có lib animation).

**Việc UX (delta):**
- UX-1 (P0): landing nhà xe + CTA "Gọi để đặt xe"
- UX-2 (P0): overlay + morph Framer Motion + auto-start cuộc gọi
- UX-3 (P0): màn "Vé của bạn" sau confirm (trigger `call.end` + booking confirmed; TicketCard có ~80% dữ liệu, thiếu QR/lưu/chuyển cảnh)
- UX-4 (P1): mobile sticky call + phiếu vé bottom sheet trong cuộc gọi
- UX-5 (P1): đường thoát lỗi trong overlay (trùng P0-1 cũ)
- UX-6 (P2): thẻ "Vé sắp tới" (localStorage) + trang tra cứu vé bằng SĐT
- `/console` giữ làm màn demo/nội bộ; luồng khách đi từ `/`.

## Bước tiếp theo

UX-1→UX-3 (luồng khách P0, kèm morph) → P0 demo (1→4) → deploy + verify P1.5/6 → polish còn lại → tập dượt 3 lần + quay backup.
