# CASE_024 — Singaporean resident books a late Limousine cabin

## 1. Scenario Metadata

- Scenario type: code_switching
- Customer region: Singaporean resident currently in Sài Gòn
- Audio condition: clear mobile call (text-only benchmark)
- Languages: English, Vietnamese
- Difficulty: hard
- Call datetime: 2026-07-18T18:45:00+07:00
- Coverage tags: code_switch, multilingual_bonus

## 2. Customer Persona

- Age: 34
- Location: Thảo Điền, Sài Gòn
- Speaking style: mở đầu bằng tiếng Anh, sau đó dùng câu tiếng Việt đơn giản xen thuật ngữ du lịch
- Calling context: tự đặt một vé đêm đi Đà Lạt và cần xác nhận hạn mức hành lý

## 3. Conversation

## Turn 1

### Customer

Hello, is this the bus company? I need to book one ticket from Sài Gòn to Đà Lạt.

### Expected Agent Response

Hello, đúng đây là hotline đặt vé. Tôi đã ghi nhận Sài Gòn đi Đà Lạt cho một người; bạn muốn đi ngày nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["travel_date"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Sài Gòn","destination":"Đà Lạt","passenger_count":1},"clear":[]}
```

## Turn 2

### Customer

Ngày 22 tháng 7. Please check the late-night schedule, after 10 PM.

### Expected Agent Response

Ngày 22/07 có chuyến 22:00 giường nằm 34 chỗ giá 320.000 đồng và chuyến 23:30 Limousine 22 Phòng giá 450.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","passenger_count":1},"expected_result":{"trip_ids":["SG-DL-20260722-2200-GN34","SG-DL-20260722-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{"travel_date":"2026-07-22"},"clear":[]}
```

## Turn 3

### Customer

Which one has a private cabin? Tôi muốn ngủ yên hơn.

### Expected Agent Response

Chuyến 23:30 là Limousine 22 Phòng, phù hợp yêu cầu phòng riêng hơn; giờ đến là 07:00.

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

Okay, chọn chuyến 23:30 Limousine 22 Phòng.

### Expected Agent Response

Tôi chọn chuyến SG-DL-20260722-2330-LIMO lúc 23:30. Bạn muốn phòng tầng nào hoặc khu vực nào?

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

A lower cabin in the middle, not too close to the front door, please.

### Expected Agent Response

Phòng P04 còn trống, là tầng dưới khu giữa. Tôi giữ P04, giá 450.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"SG-DL-20260722-2330-LIMO","passenger_count":1,"seat_preference":"Phòng tầng dưới, khu giữa"},"expected_result":{"assigned_seats":["P04"],"unit_fare_vnd":450000,"total_fare_vnd":450000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Phòng tầng dưới, khu giữa","assigned_seats":["P04"]},"clear":[]}
```

## Turn 6

### Customer

Pickup at Ngã tư Hàng Xanh. Điểm đó có trong list đúng không?

### Expected Agent Response

Đúng, Ngã tư Hàng Xanh là điểm đón hợp lệ của chuyến. Bạn muốn xuống ở đâu tại Đà Lạt?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Ngã tư Hàng Xanh"},"clear":[]}
```

## Turn 7

### Customer

Văn phòng Đà Lạt, please. My hotel will pick me up there.

### Expected Agent Response

Tôi ghi nhận điểm trả Văn phòng Đà Lạt. Bạn cho tôi tên hành khách theo hộ chiếu hoặc giấy tờ sử dụng khi đi xe.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Văn phòng Đà Lạt"},"clear":[]}
```

## Turn 8

### Customer

Before the name, hành lý của tôi là one suitcase 18 kilograms and one carry-on 6 kilograms. Is that okay?

### Expected Agent Response

Có. Mỗi hành khách được mang tối đa 20 kg hành lý ký gửi và một túi xách tay tối đa 7 kg; hành lý bạn nêu nằm trong hạn mức.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 9

### Customer

Good. Passenger name is Daniel Tan Wei Ming, one adult, seat P04.

### Expected Agent Response

Tôi đã ghi Daniel Tan Wei Ming, hành khách người lớn, phòng P04. Bạn dùng cùng tên này để đứng booking chứ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Daniel Tan Wei Ming","type":"ADULT","seat":"P04"}]},"clear":[]}
```

## Turn 10

### Customer

Yes, booking name also Daniel Tan Wei Ming.

### Expected Agent Response

Tôi ghi nhận người đặt Daniel Tan Wei Ming. Bạn cho số điện thoại Việt Nam đủ mười chữ số nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Daniel Tan Wei Ming"},"clear":[]}
```

## Turn 11

### Customer

My Vietnam number is 0901000024, số này dùng được.

### Expected Agent Response

Tôi ghi nhận 0901000024. Bạn muốn thanh toán QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0901000024"},"clear":[]}
```

## Turn 12

### Customer

QR payment, but I will scan later, nên cứ để chưa thanh toán nhé.

### Expected Agent Response

Tôi ghi nhận thanh toán QR; chỉ báo đã thanh toán khi có xác nhận giao dịch thành công.

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

Can you recap in simple Vietnamese, including baggage, pickup and total fare?

### Expected Agent Response

Một người đi Sài Gòn–Đà Lạt ngày 22/07/2026, chuyến 23:30 Limousine 22 Phòng, phòng P04 tầng dưới khu giữa; đón Ngã tư Hàng Xanh, trả Văn phòng Đà Lạt. Người đặt Daniel Tan Wei Ming, số 0901000024, thanh toán QR chưa hoàn tất, tổng 450.000 đồng. Hành lý 18 kg ký gửi và 6 kg xách tay nằm trong hạn mức đã nêu.

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

The arrival is 7 AM and drop-off is Văn phòng Đà Lạt, correct?

### Expected Agent Response

Correct. Chuyến dự kiến đến lúc 07:00 và điểm trả là Văn phòng Đà Lạt. Vé chưa được phát hành cho tới khi bạn xác nhận toàn bộ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 15

### Customer

Đúng hết. I confirm the final details and total 450,000 đồng.

### Expected Agent Response

Tôi đã chốt đúng bản bạn vừa xác nhận. Khi bạn yêu cầu book ngay, tôi sẽ phát hành vé.

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

Yes, please book it now and give me the ticket code.

### Expected Agent Response

Booking mã VA-CASE_024 đã hoàn tất và được xác nhận; thanh toán QR vẫn chưa thực hiện.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260722-2330-LIMO","customer_name":"Daniel Tan Wei Ming","customer_phone":"0901000024"},"expected_result":{"booking_id":"VA-CASE_024","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_024","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","departure_time":"23:30","trip_id":"SG-DL-20260722-2330-LIMO","passenger_count":1,"vehicle_type":"Limousine 22 Phòng","seat_preference":"Phòng tầng dưới, khu giữa","assigned_seats":["P04"],"pickup_location":"Ngã tư Hàng Xanh","dropoff_location":"Văn phòng Đà Lạt","customer_name":"Daniel Tan Wei Ming","customer_phone":"0901000024","passenger_details":[{"name":"Daniel Tan Wei Ming","type":"ADULT","seat":"P04"}],"payment_method":"QR","payment_status":"PENDING","booking_id":"VA-CASE_024","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Daniel Tan Wei Ming","phone":"0901000024"},"passengers":{"count":1,"details":[{"name":"Daniel Tan Wei Ming","type":"ADULT","seat":"P04"}]},"trip":{"trip_id":"SG-DL-20260722-2330-LIMO","origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","departure_time":"23:30","arrival_time":"07:00"},"vehicle":{"type":"Limousine 22 Phòng","seat_preference":"Phòng tầng dưới, khu giữa","assigned_seats":["P04"]},"pickup_dropoff":{"pickup_location":"Ngã tư Hàng Xanh","dropoff_location":"Văn phòng Đà Lạt"},"payment":{"method":"QR","status":"PENDING","unit_fare_vnd":450000,"total_fare_vnd":450000},"booking":{"booking_id":"VA-CASE_024","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":15}}
```

## 6. Final Ticket

BUS TICKET / VÉ XE KHÁCH

- Booking ID: VA-CASE_024
- Customer: Daniel Tan Wei Ming
- Phone: 0901000024
- Route: Sài Gòn → Đà Lạt
- Departure: 2026-07-22 23:30
- Vehicle: Limousine 22 Phòng
- Seats: P04
- Pickup: Ngã tư Hàng Xanh
- Drop-off: Văn phòng Đà Lạt
- Passenger count: 1
- Payment: QR | Chờ thanh toán
- Status: Đã xác nhận

## 7. Evaluation Criteria

- Theo được một người gọi duy nhất chuyển giữa tiếng Anh và tiếng Việt đơn giản.
- Không làm sai tên quốc tế `Daniel Tan Wei Ming`, số điện thoại hoặc địa danh có dấu.
- Trả lời hành lý đúng policy 20 kg ký gửi và 7 kg xách tay; không tuyên bố năng lực âm học.
- Chỉ phát hành booking sau xác nhận cuối ở lượt 15.
