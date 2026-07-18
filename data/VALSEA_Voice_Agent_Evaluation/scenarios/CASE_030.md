# CASE_030 — Thai caller switches vi/en/th, adds a passenger and repairs pickup

## 1. Scenario Metadata

- Scenario type: extreme
- Customer region: Thai resident in Sài Gòn
- Audio condition: simulated background noise and overlapping station announcement in text metadata; no acoustic result claimed
- Languages: Vietnamese, English, Thai
- Difficulty: extreme
- Call datetime: 2026-07-18T19:35:00+07:00
- Coverage tags: multilingual_bonus, code_switch, background_noise, changed_mind

## 2. Customer Persona

- Age: 32
- Location: Quận 1, Sài Gòn
- Speaking style: một người gọi duy nhất dùng tiếng Việt, tiếng Anh và cụm tiếng Thái ngắn tự nhiên
- Calling context: ban đầu đặt hai vé, sau thêm một bạn; phải tìm và giữ lại ba phòng, sửa số điện thoại và đổi pickup bị lẫn vì nền mô phỏng

## 3. Conversation

## Turn 1

### Customer

สวัสดีครับ ช่วยจองตั๋วให้หน่อยครับ. Hello, tôi muốn book two tickets từ Sài Gòn đi Đà Lạt.

### Expected Agent Response

Xin chào anh. Tôi hiểu anh muốn đặt hai vé Sài Gòn đi Đà Lạt; anh muốn đi ngày nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["travel_date"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Sài Gòn","destination":"Đà Lạt","passenger_count":2},"clear":[]}
```

## Turn 2

### Customer

Ngày 22 July. Please check a late-night schedule around 11:30 PM; xe có phòng riêng càng tốt.

### Expected Agent Response

Tôi ghi ngày 22/07/2026 và sẽ tra các chuyến tối cho hai người, ưu tiên loại có phòng riêng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","passenger_count":2},"expected_result":{"trip_ids":["SG-DL-20260722-2200-GN34","SG-DL-20260722-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{"travel_date":"2026-07-22"},"clear":[]}
```

## Turn 3

### Customer

The 23:30 one is private cabin and arrives 7 AM, correct?

### Expected Agent Response

Đúng, chuyến 23:30 là Limousine 22 Phòng, đến Đà Lạt lúc 07:00, giá 450.000 đồng mỗi người.

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

Yes, chọn Limousine 22 Phòng lúc 23:30.

### Expected Agent Response

Tôi chọn SG-DL-20260722-2330-LIMO lúc 23:30. Anh muốn hai phòng vị trí nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"SG-DL-20260722-2330-LIMO","departure_time":"23:30","vehicle_type":"Limousine 22 Phòng"},"clear":[]}
```

## Turn 5

### Customer

Hai lower cabin khu giữa cạnh nhau, P04 và P05 available thì hold giúp tôi.

### Expected Agent Response

P04 và P05 đều còn, là hai phòng tầng dưới khu giữa liền nhau. Tổng ban đầu là 900.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"SG-DL-20260722-2330-LIMO","passenger_count":2,"seat_preference":"Hai phòng tầng dưới, khu giữa, liền nhau"},"expected_result":{"assigned_seats":["P04","P05"],"unit_fare_vnd":450000,"total_fare_vnd":900000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai phòng tầng dưới, khu giữa, liền nhau","assigned_seats":["P04","P05"]},"clear":[]}
```

## Turn 6

### Customer

Pickup ở Hàng... khoan, loa vừa chen mất phần sau... em nghe được full location không?

### Expected Agent Response

Tôi chỉ nghe được “Hàng”, chưa đủ để chọn điểm đón. Anh nói lại toàn bộ địa danh của chính anh, không dựa vào thông báo nền.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 7

### Customer

I said Ngã tư Hàng Xanh, điểm đón đó trước mắt nhé.

### Expected Agent Response

Tôi ghi nhận Ngã tư Hàng Xanh, một điểm đón hợp lệ. Anh muốn xuống điểm nào tại Đà Lạt?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Ngã tư Hàng Xanh"},"clear":[]}
```

## Turn 8

### Customer

Drop-off at Chợ Đà Lạt, tôi gặp bạn ở đó.

### Expected Agent Response

Tôi ghi điểm trả Chợ Đà Lạt. Anh cho tên hai hành khách theo P04 và P05.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Chợ Đà Lạt"},"clear":[]}
```

## Turn 9

### Customer

Before names: tôi có vali 18 kg và carry-on 6 kg, hành lý như vậy okay không?

### Expected Agent Response

Có. Mỗi hành khách được tối đa 20 kg ký gửi và một túi xách tay tối đa 7 kg; vali 18 kg và túi 6 kg của anh nằm trong hạn mức.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 10

### Customer

P04 Narin Chaiyasit, P05 Mali Wongsa, both adults.

### Expected Agent Response

Tôi ghi Narin Chaiyasit ghế P04 và Mali Wongsa ghế P05. Ai đứng tên booking?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Narin Chaiyasit","type":"ADULT","seat":"P04"},{"name":"Mali Wongsa","type":"ADULT","seat":"P05"}]},"clear":[]}
```

## Turn 11

### Customer

I am Narin Chaiyasit, tôi đứng tên.

### Expected Agent Response

Tôi ghi người đặt Narin Chaiyasit. Anh đọc số điện thoại Việt Nam đủ mười chữ số.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Narin Chaiyasit"},"clear":[]}
```

## Turn 12

### Customer

My number is 0907... zero three zero; the station announcement covered the middle digits.

### Expected Agent Response

Tôi chưa có đủ mười chữ số nên chưa lưu. Anh đọc lại theo từng nhóm ba–ba–bốn số.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 13

### Customer

Zero nine zero, seven zero zero, zero zero three zero: 0907000030.

### Expected Agent Response

Tôi xác nhận 0907000030. Anh muốn thanh toán QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0907000030"},"clear":[]}
```

## Turn 14

### Customer

QR please, but keep it unpaid until the transaction succeeds.

### Expected Agent Response

Tôi ghi thanh toán QR; chỉ báo đã thanh toán khi giao dịch thành công.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PENDING"},"clear":[]}
```

## Turn 15

### Customer

Wait, my friend Anan joins. Change passenger count from two to three; please recheck seats before booking.

### Expected Agent Response

Tôi cập nhật thành ba hành khách và bỏ hai ghế cũ để kiểm tra lại chỗ. Chuyến 23:30 vẫn còn đủ ba phòng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","passenger_count":3},"expected_result":{"trip_ids":["SG-DL-20260722-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{"passenger_count":3},"clear":["departure_time","trip_id","vehicle_type","seat_preference","assigned_seats","passenger_details","explicit_confirmation"]}
```

## Turn 16

### Customer

Keep the same 23:30 Limousine, nhưng tìm ba lower cabins gần nhau.

### Expected Agent Response

Tôi chọn lại chuyến SG-DL-20260722-2330-LIMO lúc 23:30. P01, P02, P03 là ba phòng tầng dưới phía trước nối liền nhau.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference","passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"SG-DL-20260722-2330-LIMO","departure_time":"23:30","vehicle_type":"Limousine 22 Phòng"},"clear":[]}
```

## Turn 17

### Customer

Hold P01 Narin Chaiyasit, P02 Mali Wongsa, P03 Anan Kiet; all three adults.

### Expected Agent Response

Tôi giữ P01–P03, ba phòng tầng dưới phía trước gần nhau, và gán đúng ba tên. Tổng mới là 1.350.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260722-2330-LIMO","passenger_count":3,"seat_preference":"Ba phòng tầng dưới, phía trước, gần nhau"},"expected_result":{"assigned_seats":["P01","P02","P03"],"unit_fare_vnd":450000,"total_fare_vnd":1350000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Ba phòng tầng dưới, phía trước, gần nhau","assigned_seats":["P01","P02","P03"],"passenger_details":[{"name":"Narin Chaiyasit","type":"ADULT","seat":"P01"},{"name":"Mali Wongsa","type":"ADULT","seat":"P02"},{"name":"Anan Kiet","type":"ADULT","seat":"P03"}]},"clear":[]}
```

## Turn 18

### Customer

One more correction: tiếng nền làm tôi chọn nhầm. Final pickup là Văn phòng Phạm Ngũ Lão, not Hàng Xanh. Please recap everything.

### Expected Agent Response

Tôi đổi pickup cuối sang Văn phòng Phạm Ngũ Lão. Bản chốt: ba người, ngày 22/07, Limousine 23:30, P01–P03; trả Chợ Đà Lạt; người đặt Narin Chaiyasit, số 0907000030, thanh toán QR chưa hoàn tất, tổng 1.350.000 đồng. Ngã tư Hàng Xanh không còn là pickup cuối.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Văn phòng Phạm Ngũ Lão"},"clear":["explicit_confirmation"]}
```

## Turn 19

### Customer

ถูกต้องครับ. I confirm the final three passengers, pickup Phạm Ngũ Lão, phone 0907000030 and total 1,350,000 đồng.

### Expected Agent Response

Bản ba người với pickup Phạm Ngũ Lão đã được anh xác nhận. Anh nói “book now” là tôi xuất mã ngay.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 20

### Customer

Yes, book the final ticket now and read the booking ID.

### Expected Agent Response

Booking mã VA-CASE_030 đã hoàn tất và được xác nhận; thanh toán QR vẫn chưa thực hiện.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260722-2330-LIMO","customer_name":"Narin Chaiyasit","customer_phone":"0907000030"},"expected_result":{"booking_id":"VA-CASE_030","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_030","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","departure_time":"23:30","trip_id":"SG-DL-20260722-2330-LIMO","passenger_count":3,"vehicle_type":"Limousine 22 Phòng","seat_preference":"Ba phòng tầng dưới, phía trước, gần nhau","assigned_seats":["P01","P02","P03"],"pickup_location":"Văn phòng Phạm Ngũ Lão","dropoff_location":"Chợ Đà Lạt","customer_name":"Narin Chaiyasit","customer_phone":"0907000030","passenger_details":[{"name":"Narin Chaiyasit","type":"ADULT","seat":"P01"},{"name":"Mali Wongsa","type":"ADULT","seat":"P02"},{"name":"Anan Kiet","type":"ADULT","seat":"P03"}],"payment_method":"QR","payment_status":"PENDING","booking_id":"VA-CASE_030","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Narin Chaiyasit","phone":"0907000030"},"passengers":{"count":3,"details":[{"name":"Narin Chaiyasit","type":"ADULT","seat":"P01"},{"name":"Mali Wongsa","type":"ADULT","seat":"P02"},{"name":"Anan Kiet","type":"ADULT","seat":"P03"}]},"trip":{"trip_id":"SG-DL-20260722-2330-LIMO","origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","departure_time":"23:30","arrival_time":"07:00"},"vehicle":{"type":"Limousine 22 Phòng","seat_preference":"Ba phòng tầng dưới, phía trước, gần nhau","assigned_seats":["P01","P02","P03"]},"pickup_dropoff":{"pickup_location":"Văn phòng Phạm Ngũ Lão","dropoff_location":"Chợ Đà Lạt"},"payment":{"method":"QR","status":"PENDING","unit_fare_vnd":450000,"total_fare_vnd":1350000},"booking":{"booking_id":"VA-CASE_030","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":19}}
```

## 6. Final Ticket

BUS TICKET / VÉ XE KHÁCH

- Booking ID: VA-CASE_030
- Customer: Narin Chaiyasit
- Phone: 0907000030
- Route: Sài Gòn → Đà Lạt
- Departure: 2026-07-22 23:30
- Vehicle: Limousine 22 Phòng
- Seats: P01, P02, P03
- Pickup: Văn phòng Phạm Ngũ Lão
- Drop-off: Chợ Đà Lạt
- Passenger count: 3
- Payment: QR | Chờ thanh toán
- Status: Đã xác nhận

## 7. Evaluation Criteria

- Một caller duy nhất phải được hiểu xuyên suốt khi dùng Vietnamese, English và Thai (`vi`, `en`, `th`).
- Sau đổi 2→3 người phải tìm lại, xóa ghế/mapping cũ và giữ đúng P01–P03 gần nhau theo metadata.
- Không lưu số điện thoại bị thiếu; pickup cuối phải là Văn phòng Phạm Ngũ Lão, không phải Hàng Xanh.
- Áp dụng đúng luggage/payment policy và không tuyên bố hiệu năng background-noise ở tầng âm học.
- Chỉ có một `CONFIRM_BOOKING`, sau xác nhận cuối ở lượt 19.
