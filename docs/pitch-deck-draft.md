# Pitch deck Alove — Draft nội dung

## 1. Mục tiêu

- **Đối tượng:** Ban giám khảo hackathon VALSEA.
- **Thời lượng:** 5 phút, gồm demo trực tiếp và thuyết trình.
- **Thông điệp cần nhớ:** Alove biến giọng nói thành workflow thật, không dừng ở
  chatbot hoặc transcript.
- **Bằng chứng chính:** Một booking được tạo bằng hội thoại và xuất hiện thành dữ
  liệu vận hành có cấu trúc ngay trong demo.

## 2. Phân bổ thời gian

| Thời gian | Nội dung |
|---|---|
| 0:00–1:20 | Demo trực tiếp trên màn hình chia đôi |
| 1:20–1:40 | Slide 1 — Điều vừa xảy ra |
| 1:40–2:10 | Slide 2 — Bài toán |
| 2:10–2:40 | Slide 3 — Giải pháp |
| 2:40–3:35 | Slide 4 — Công nghệ lõi |
| 3:35–4:10 | Slide 5 — Một lõi, nhiều workflow |
| 4:10–4:45 | Slide 6 — Con người trở thành Agent Manager |
| 4:45–5:00 | Câu kết |

## 3. Demo mở màn — 80 giây

### Bố cục màn hình

- **Bên trái:** Tab gọi Alove.
- **Bên phải:** Dashboard vận hành, mở sẵn danh sách cuộc gọi.
- Hai màn hình chạy song song suốt demo; không chuyển tab.
- Dùng tên và số điện thoại demo, không dùng dữ liệu cá nhân thật.
- Trước khi lên sân khấu, kiểm tra chuyến đang mở trong production và đăng nhập
  dashboard sẵn.

### Kịch bản demo

1. Bắt đầu cuộc gọi.
2. Nói tự nhiên, có code-switch:
   > Cho mình book một vé từ Sài Gòn đi Đà Lạt.
3. Trả lời ngày đi theo chuyến đang mở được Alove đề xuất.
4. Cung cấp thông tin demo khi được hỏi.
5. Nghe Alove đọc lại hành trình, giờ, ghế và giá.
6. Xác nhận rõ:
   > Đúng rồi, mình xác nhận đặt vé.
7. Chỉ nhanh sang dashboard: row cuộc gọi, transcript, trạng thái và ticket được
   cập nhật song song với hội thoại.
8. Kết thúc khi mã vé và ghế xuất hiện. Không demo thêm tính năng phụ.

### Lời mở đầu

> Thay vì kể Alove có thể làm gì, chúng em xin thực hiện một booking thật. Bên
> trái là cuộc gọi của khách hàng. Bên phải là màn hình vận hành của doanh nghiệp,
> được cập nhật song song mà không cần nhân viên nhập liệu.

### Câu chuyển sau demo

> Trong hơn một phút, một câu nói tự nhiên đã trở thành hành trình, ghế, giá, mã
> vé và một ticket có cấu trúc. Đây không chỉ là speech-to-text. Đây là
> speech-to-workflow.

---

## Slide 1 — Điều vừa xảy ra không phải speech-to-text

### Nội dung trên slide

**Một cuộc gọi. Một workflow hoàn chỉnh.**

```text
Giọng nói → Hiểu nhu cầu → Tìm chuyến → Giữ ghế → Xác nhận → Tạo vé
```

**Output:** hành trình · ghế · giá · mã vé · transcript · trạng thái

### Lời thuyết trình

> Alove không chỉ nghe rồi trả lời. Mỗi lượt nói cập nhật một workflow có trạng
> thái. Kết quả cuối cùng không phải một đoạn transcript, mà là một booking doanh
> nghiệp có thể sử dụng ngay.

### Ý đồ hình ảnh

- Dùng một pipeline ngang sáu bước.
- Đặt ticket thật vừa tạo ở cuối pipeline.
- Không dùng đoạn văn dài.

---

## Slide 2 — Điện thoại vẫn là một workflow thủ công

### Nội dung trên slide

**Khách hàng nói. Nhân viên phải tự biến lời nói thành dữ liệu.**

- Vừa nghe, vừa ghi chép, vừa tra cứu, vừa nhập hệ thống.
- Giọng vùng miền, code-switch và âm thanh nhiễu làm tăng sai sót.
- Giờ cao điểm tạo hàng chờ, cuộc gọi bỏ lỡ và chất lượng không đồng đều.
- Muốn mở rộng, doanh nghiệp phải tăng nhân sự gần như tuyến tính.

### Lời thuyết trình

> Điện thoại vẫn là kênh giao dịch tự nhiên với nhiều khách hàng Việt Nam. Nhưng
> phía sau mỗi cuộc gọi là một chuỗi thao tác thủ công: nghe, nhớ, tra cứu và nhập
> lại dữ liệu. Sai một ngày, một tuyến hoặc một số điện thoại có thể làm hỏng cả
> giao dịch. Khi lượng cuộc gọi tăng, doanh nghiệp khó mở rộng nếu năng lực xử lý
> vẫn phụ thuộc hoàn toàn vào số người đang trực máy.

### Ý đồ hình ảnh

- Một câu nói ở bên trái.
- Bốn thao tác thủ công ở giữa: nghe, ghi, tra cứu, nhập liệu.
- Ba hậu quả ở bên phải: chờ lâu, sai sót, khó mở rộng.

---

## Slide 3 — Alove: từ giọng nói đến hành động

### Nội dung trên slide

**Alove là nền tảng Speech-to-Workflow cho doanh nghiệp.**

| Voice bot thông thường | Alove |
|---|---|
| Tạo transcript | Hiểu ý định và dữ liệu nghiệp vụ |
| Trả lời câu hỏi | Thực hiện từng bước trong workflow |
| Kết thúc bằng hội thoại | Kết thúc bằng output có cấu trúc |

**Vertical đầu tiên:** Đặt vé xe bằng tiếng Việt tự nhiên.

### Lời thuyết trình

> Alove bổ sung lớp hành động còn thiếu giữa hội thoại và hệ thống vận hành. AI
> thu thập đúng thông tin, chủ động hỏi lại khi dữ liệu chưa rõ, thực hiện workflow
> và đọc lại toàn bộ nội dung trước khi chốt. Trong vertical đầu tiên, đầu ra là
> một vé xe thật. Với workflow khác, đầu ra có thể là đơn hàng, lịch hẹn hoặc
> ticket chăm sóc khách hàng.

### Ý đồ hình ảnh

- Dùng bảng so sánh ngắn, tối đa ba dòng.
- Nhấn mạnh ba từ: **Hiểu — Hành động — Hoàn tất**.

---

## Slide 4 — Công nghệ lõi: Nghe → Hiểu → Hành động → Phản hồi

### Nội dung trên slide

```text
Giọng nói khách hàng
        ↓
VALSEA Realtime STT
        ↓
LLM Voice Agent
        ↔
AI Booking Agent
        ↓
Google Chirp3-HD TTS
        ↓
Phản hồi tự nhiên bằng giọng nói
```

### Voice Agent

- **VALSEA Realtime STT:** tiếng Việt Bắc–Trung–Nam, code-switch Việt–Anh, dấu
  thanh, âm thanh nhiễu và chất lượng điện thoại 8 kHz.
- **LLM:** hiểu ý định, trích xuất dữ liệu, quản lý hội thoại nhiều lượt và hỏi lại
  khi thông tin mơ hồ.
- **Hội thoại realtime:** VAD, xác định kết thúc lượt nói, hỗ trợ ngắt lời.
- **Google Chirp3-HD TTS:** phản hồi tiếng Việt tự nhiên, lịch sự, gần thời gian
  thực.

### AI Booking Agent

- Tìm chuyến và thu thập thông tin hành khách.
- Giữ ghế trong lúc hoàn tất hội thoại.
- Đọc lại hành trình, giờ, ghế và giá.
- Chỉ tạo vé sau khi khách xác nhận rõ ràng.
- Trả ticket có cấu trúc, không dừng ở transcript.

### Lời thuyết trình

> Công nghệ lõi của Alove gồm hai lớp. Voice Agent dùng VALSEA để nghe tiếng Việt
> thực tế, LLM để hiểu và Google Chirp3-HD để phản hồi. AI Booking Agent biến nội
> dung đã hiểu thành hành động nghiệp vụ: tìm chuyến, giữ ghế, xác nhận và tạo vé.
> Vì hai lớp tách biệt, chúng em có thể giữ nguyên Voice Agent và thay Booking
> Agent bằng Hotel Agent, Food Ordering Agent hoặc Banking Support Agent.

### Ý đồ hình ảnh

- Chia slide thành hai khối lớn: **Voice Agent** và **AI Booking Agent**.
- Voice Agent thể hiện pipeline STT → LLM → TTS.
- Booking Agent nằm cạnh LLM, nối bằng mũi tên hai chiều.
- Dùng chip nhỏ cho: `3 miền`, `VN–EN`, `noisy audio`, `telephony 8 kHz`,
  `realtime`.

---

## Slide 5 — Một công nghệ lõi, nhiều workflow

### Nội dung trên slide

**Nhà xe là vertical đầu tiên, không phải giới hạn cuối cùng.**

| Lĩnh vực | Workflow-ready output |
|---|---|
| Khách sạn | Đặt phòng, đổi lịch, yêu cầu dịch vụ |
| F&B | Đơn món, xác nhận địa chỉ, chuyển bếp |
| Công nghiệp | Phiếu sự cố, yêu cầu bảo trì, biên bản ca |
| Ngân hàng | Ticket hỗ trợ, lịch hẹn, phân loại yêu cầu |

**Giữ nguyên:** Voice Agent  
**Thay đổi:** Agent nghiệp vụ + quy tắc từng ngành

### Lời thuyết trình

> Chúng em tin Alove không chỉ phục vụ nhà xe. Công nghệ lõi đã có là một AI Voice
> Agent luôn lắng nghe và hiểu khách hàng. Khi chuyển ngành, chúng em giữ lại lớp
> voice và thay Agent nghiệp vụ, dữ liệu cùng quy tắc xử lý. Một cuộc gọi có thể
> trở thành booking khách sạn, đơn món ăn, phiếu bảo trì hoặc ticket ngân hàng.
> Đây là cách Alove mở rộng nhanh từ một vertical rõ ràng thành nền tảng cho doanh
> nghiệp Việt Nam và Đông Nam Á.

### Ý đồ hình ảnh

- Voice Agent ở trung tâm.
- Bốn nhánh đi ra bốn Agent nghiệp vụ.
- Mỗi nhánh kết thúc bằng một output, không kết thúc bằng transcript.

---

## Slide 6 — Con người trở thành Agent Manager

### Nội dung trên slide

**Alove không thay thế con người. Alove thay thế thao tác lặp lại.**

- AI xử lý nghe, ghi nhận, nhập dữ liệu và các bước lặp lại.
- Nhân viên giám sát nhiều agent, kiểm tra kết quả và xử lý ngoại lệ.
- Doanh nghiệp tăng năng lực phục vụ mà không tăng nhân sự theo cùng tốc độ.
- Con người tập trung vào phán đoán, đồng cảm và quan hệ khách hàng.

### Lời thuyết trình

> Mục tiêu của Alove không phải cắt giảm nhân viên tổng đài. Alove giúp một nhân
> viên tổng đài trở thành người quản lý nhiều AI Agent. AI nhận phần việc lặp lại,
> dễ sai và nhàm chán; con người kiểm soát chất lượng, giải quyết ngoại lệ và chăm
> sóc những trường hợp cần sự đồng cảm. Nhờ đó doanh nghiệp có thể mở rộng từ một
> địa phương ra toàn quốc và khu vực mà không để quy trình nhập liệu thủ công trở
> thành điểm nghẽn.

### Câu kết

> Alove không chỉ giúp doanh nghiệp nghe khách hàng. Alove biến điều khách hàng
> nói thành công việc đã được hoàn thành.

### Ý đồ hình ảnh

- Một nhân viên ở trung tâm theo dõi nhiều AI Agent.
- Không dùng hình ảnh robot thay thế con người.
- Chốt bằng logo Alove và tagline **Voice into action**.

---

## 4. FAQ dự kiến

### Alove có thay thế nhân viên tổng đài không?

> Không. Alove tự động hóa phần nghe, ghi chép, nhập liệu và xử lý lặp lại. Nhân
> viên trở thành Agent Manager: giám sát nhiều cuộc gọi, kiểm tra kết quả và xử lý
> ngoại lệ cần phán đoán hoặc đồng cảm.

### Alove khác chatbot hoặc voice bot thông thường ở đâu?

> Chatbot thường kết thúc bằng một câu trả lời; speech-to-text kết thúc bằng một
> transcript. Alove kết thúc bằng output nghiệp vụ có cấu trúc. Trong demo, đó là
> chuyến, ghế, giá và mã vé.

### Nếu AI nghe sai hoặc hiểu sai thì sao?

> Alove hỏi lại khi thông tin thiếu hoặc mơ hồ, sau đó đọc lại toàn bộ dữ liệu
> quan trọng. Booking chỉ hoàn tất khi khách xác nhận rõ ràng. Nhân viên vẫn nhìn
> thấy trạng thái và transcript để giám sát.

### Tại sao chọn đặt vé xe làm vertical đầu tiên?

> Đặt vé có bài toán rõ, xảy ra hằng ngày và đòi hỏi nhiều dữ liệu có cấu trúc:
> tuyến, ngày, giờ, số khách, ghế, giá và thông tin hành khách. Đây là vertical
> phù hợp để chứng minh speech-to-workflow tạo giá trị tốt hơn transcript.

### Vì sao cần VALSEA?

> Đầu vào thực tế không phải tiếng Việt chuẩn trong phòng thu. Khách nói giọng
> vùng miền, xen tiếng Anh, nói nhanh và gọi qua đường truyền có nhiễu. VALSEA là
> lớp speech-to-meaning tập trung cho tiếng Việt và Đông Nam Á, giúp Voice Agent
> nhận được đầu vào phù hợp để thực hiện workflow.

### Kiến trúc này mở rộng sang ngành khác thế nào?

> Voice Agent là lõi dùng chung. Mỗi ngành thay Agent nghiệp vụ, tập dữ liệu cần
> thu thập và quy tắc xác nhận. Vì vậy Alove không cần xây lại toàn bộ hệ thống khi
> chuyển từ đặt vé sang khách sạn, F&B, công nghiệp hoặc ngân hàng.

### Alove xử lý tình huống ngoài khả năng thế nào?

> Agent hỏi lại khi dữ liệu chưa rõ và giữ nguyên trạng thái đã thu thập. Nhân
> viên theo dõi trạng thái và transcript để xử lý ngoại lệ khi cần, thay vì để AI
> tự suy đoán.

### Sản phẩm hiện đã sẵn sàng đến đâu?

> Prototype đang chạy trên production, có cuộc gọi realtime, workflow đặt vé,
> ticket xác minh và dashboard vận hành. Bước tiếp theo là pilot có giám sát với
> một nhà xe, đo completion rate, latency, tỷ lệ can thiệp và chi phí trên mỗi
> booking.

## 5. Checklist trước khi trình bày

- Mở sẵn tab gọi và dashboard theo bố cục chia đôi.
- Đăng nhập dashboard trước khi lên sân khấu.
- Kiểm tra micro, quyền trình duyệt, LiveKit agent và health production.
- Kiểm tra chuyến đang mở, ghế còn trống và hold cũ đã hết hạn.
- Dùng duy nhất tên và số điện thoại demo.
- Rehearse demo đến khi hoàn tất trong 80 giây.
- Chuẩn bị video quay màn hình làm phương án dự phòng.
- Dùng đồng hồ đếm ngược; bắt đầu slide 4 trước mốc 2:40.
- Nếu demo chậm, bỏ lời giải thích slide 1 và chuyển thẳng sang bài toán.
- Không mở rộng demo sang QR, huỷ vé hoặc webhook trong slot 5 phút.
