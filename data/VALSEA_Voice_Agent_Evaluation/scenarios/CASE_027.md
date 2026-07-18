# CASE_027 — Field-call repair after simulated wind and packet loss

## 1. Scenario Metadata

- Scenario type: difficult_audio
- Customer region: Hà Tĩnh
- Audio condition: simulated field recording, wind and packet loss represented by metadata and clarification turns; no acoustic result claimed
- Languages: Vietnamese
- Difficulty: hard
- Call datetime: 2026-07-18T17:40:00+07:00
- Coverage tags: field_recording, packet_loss, repair

## 2. Customer Persona

- Age: 36
- Location: ngoài đồng gần Đồng Lộc, Hà Tĩnh
- Speaking style: giọng Hà Tĩnh nhẹ, quyết đoán về giờ đi nhưng tự sửa khi nói nhầm tên
- Calling context: đặt một vé đi Hà Nội, phải làm rõ điểm đón bị mất đoạn, sửa tên đã lưu và phân giải hai cách đọc số điện thoại

## 3. Conversation

## Turn 1

### Customer

Alo em, chị đang ngoài đồng nên gió lớn, nghe thiếu thì hỏi lại chứ đừng đoán nghe. Chị cần một vé Hà Tĩnh đi Hà Nội ngày 22 tháng 7.

### Expected Agent Response

Em chào chị. Em ghi nhận Hà Tĩnh đi Hà Nội ngày 22/07/2026 cho một người và sẽ yêu cầu lặp lại nếu trường nào chưa đủ. Chị muốn đi giờ nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","passenger_count":1},"clear":[]}
```

## Turn 2

### Customer

Chị cần đúng chuyến 19:00, tức bảy giờ tối; em tra chuyến đó giúp chị.

### Expected Agent Response

Chuyến HT-HN-20260722-1900-GN34 còn chỗ, giá 390.000 đồng và dự kiến đến Hà Nội lúc 01:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","passenger_count":1},"expected_result":{"trip_ids":["HT-HN-20260722-1900-GN34"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Chuyến đó là giường nằm 34 chỗ và tới 01:00 đúng không em?

### Expected Agent Response

Đúng ạ, chuyến 19:00 là giường nằm 34 chỗ và dự kiến đến lúc 01:00. Chị muốn chọn chuyến này chứ?

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"PRESENT_TRIP_OPTIONS","missing_fields":["trip_id"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

Chọn chuyến ni, 19:00 giường nằm là đúng ý chị.

### Expected Agent Response

Em chọn chuyến 19:00 giường nằm 34 chỗ. Chị muốn ghế tầng nào và khu vực nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"HT-HN-20260722-1900-GN34","departure_time":"19:00","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 5

### Customer

Cho chị ghế tầng dưới phía trước, B02 còn thì giữ B02.

### Expected Agent Response

B02 còn, là giường tầng dưới phía trước. Em giữ B02 với giá 390.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"HT-HN-20260722-1900-GN34","passenger_count":1,"seat_preference":"Tầng dưới, phía trước"},"expected_result":{"assigned_seats":["B02"],"unit_fare_vnd":390000,"total_fare_vnd":390000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước","assigned_seats":["B02"]},"clear":[]}
```

## Turn 6

### Customer

Đón chị ở Ngã ba... gió vừa át mất phần sau; em đừng chọn vội nghe.

### Expected Agent Response

Em mới nghe được “Ngã ba”, chưa đủ để xác định điểm đón. Chị nói lại đầy đủ rồi cho luôn điểm trả giúp em.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["pickup_location","dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 7

### Customer

Đầy đủ là Ngã ba Đồng Lộc. Điểm trả Công viên Hòa Bình, người nhà đón ở đó.

### Expected Agent Response

Em ghi điểm đón Ngã ba Đồng Lộc và điểm trả Công viên Hòa Bình. Chị đọc họ tên đầy đủ của hành khách giúp em.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details","customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Ngã ba Đồng Lộc","dropoff_location":"Công viên Hòa Bình"},"clear":[]}
```

## Turn 8

### Customer

Tên chị Võ Thị Lam, chị là người lớn và tự đứng tên đặt vé.

### Expected Agent Response

Em ghi Võ Thị Lam, hành khách người lớn ghế B02 và cũng là người đặt vé. Chị cho số điện thoại liên hệ nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Võ Thị Lam","type":"ADULT","seat":"B02"}],"customer_name":"Võ Thị Lam"},"clear":[]}
```

## Turn 9

### Customer

Khoan, chị tự nói nhầm chứ không phải do gió: tên đúng là Võ Thị Lan, chữ Lan, không phải Lam.

### Expected Agent Response

Em đã sửa cả tên hành khách và người đặt thành Võ Thị Lan; tên Võ Thị Lam không còn được dùng. Chị đọc số điện thoại đủ mười chữ số nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Võ Thị Lan","type":"ADULT","seat":"B02"}],"customer_name":"Võ Thị Lan"},"clear":[]}
```

## Turn 10

### Customer

Số chị là 0913000027... khoan, lúc nãy chị có nói đuôi 72 không? Nếu em có hai bản thì đừng lưu vội.

### Expected Agent Response

Em đang có hai đuôi 27 và 72 mâu thuẫn nên chưa lưu. Chị đọc lại theo nhóm ba–ba–bốn và chốt riêng bốn số cuối.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 11

### Customer

Không chín một ba, không không không, không không hai bảy: 0913000027.

### Expected Agent Response

Em xác nhận số 0913000027. Chị muốn thanh toán bằng QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0913000027"},"clear":[]}
```

## Turn 12

### Customer

Chị chọn QR nhưng cứ để chưa thanh toán; khi mô giao dịch thành công thì mới báo đã trả tiền.

### Expected Agent Response

Em ghi nhận thanh toán QR; chỉ báo đã thanh toán khi có xác nhận giao dịch thành công.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PENDING"},"clear":[]}
```

## Turn 13

### Customer

Em đọc lại tên đã sửa, số điện thoại và điểm đón để chị kiểm tra nhé.

### Expected Agent Response

Tên đúng Võ Thị Lan; số điện thoại 0913000027; điểm đón Ngã ba Đồng Lộc. Tên Lam và đuôi số 72 đã được loại bỏ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 14

### Customer

Đúng rồi. Chị vừa quét QR 390.000 đồng, mã giao dịch SYN-QR-027-390A; em kiểm tra rồi đọc lại ngày, giờ, ghế với điểm trả giúp chị.

### Expected Agent Response

Cổng thanh toán đã xác nhận giao dịch thành công, mã đối soát SYN-GW-027-OK-01. Một người đi Hà Tĩnh–Hà Nội ngày 22/07/2026, chuyến 19:00 giường nằm 34 chỗ, ghế B02; đón Ngã ba Đồng Lộc, trả Công viên Hòa Bình. Người đặt Võ Thị Lan, số 0913000027; khoản QR 390.000 đồng đã thanh toán đủ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"VERIFY_PAYMENT","missing_fields":[],"arguments":{"payment_method":"QR","payment_reference":"SYN-QR-027-390A"},"expected_result":{"payment_status":"PAID","provider_reference":"SYN-GW-027-OK-01"}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PAID"},"clear":[]}
```

## Turn 15

### Customer

Chị xác nhận toàn bộ thông tin cuối đúng, đặc biệt số 0913000027 và ghế B02.

### Expected Agent Response

Em đã chốt đúng tên Lan, số đuôi 0027 và toàn bộ vé. Chị nói em hoàn tất là em xuất mã ngay.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 16

### Customer

Hoàn tất đi em, đọc mã vé cho chị.

### Expected Agent Response

Vé mã VA-CASE_027 đã được xác nhận; khoản QR 390.000 đồng đã thanh toán đủ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HT-HN-20260722-1900-GN34","customer_name":"Võ Thị Lan","customer_phone":"0913000027"},"expected_result":{"booking_id":"VA-CASE_027","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_027","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","departure_time":"19:00","trip_id":"HT-HN-20260722-1900-GN34","passenger_count":1,"vehicle_type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước","assigned_seats":["B02"],"pickup_location":"Ngã ba Đồng Lộc","dropoff_location":"Công viên Hòa Bình","customer_name":"Võ Thị Lan","customer_phone":"0913000027","passenger_details":[{"name":"Võ Thị Lan","type":"ADULT","seat":"B02"}],"payment_method":"QR","payment_status":"PAID","booking_id":"VA-CASE_027","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Võ Thị Lan","phone":"0913000027"},"passengers":{"count":1,"details":[{"name":"Võ Thị Lan","type":"ADULT","seat":"B02"}]},"trip":{"trip_id":"HT-HN-20260722-1900-GN34","origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","departure_time":"19:00","arrival_time":"01:00"},"vehicle":{"type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước","assigned_seats":["B02"]},"pickup_dropoff":{"pickup_location":"Ngã ba Đồng Lộc","dropoff_location":"Công viên Hòa Bình"},"payment":{"method":"QR","status":"PAID","unit_fare_vnd":390000,"total_fare_vnd":390000},"booking":{"booking_id":"VA-CASE_027","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":15}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_027
- Khách hàng: Võ Thị Lan
- Số điện thoại: 0913000027
- Tuyến: Hà Tĩnh → Hà Nội
- Khởi hành: 2026-07-22 19:00
- Loại xe: Giường nằm 34 chỗ
- Ghế: B02
- Điểm đón: Ngã ba Đồng Lộc
- Điểm trả: Công viên Hòa Bình
- Số hành khách: 1
- Thanh toán: QR | Đã thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Làm rõ điểm đón bị mất đoạn, sửa tên Lam → Lan đã lưu và không chọn giữa hai đuôi điện thoại mâu thuẫn.
- Phân biệt lỗi người gọi tự nói nhầm tên với mất đoạn mô phỏng; không báo WER hoặc kết quả chống gió.
- Bảo toàn từ vùng miền trong lời khách nhưng trích xuất đúng Hà Tĩnh → Hà Nội, Ngã ba Đồng Lộc.
- Chỉ ghi nhận khoản QR đã thanh toán sau khi cổng thanh toán trả kết quả thành công ở lượt 14.
- Chỉ tạo booking sau xác nhận lượt 15.
