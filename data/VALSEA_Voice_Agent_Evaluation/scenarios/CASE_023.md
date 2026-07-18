# CASE_023 — Clarify “Next Friday around 10 PM” thành ngày giờ chính xác

## 1. Scenario Metadata

- Scenario type: code_switching
- Customer region: Hà Nội, Việt kiều về thăm gia đình
- Audio condition: clear mobile call (text-only benchmark)
- Languages: Vietnamese, English
- Difficulty: hard
- Call datetime: 2026-07-18T15:30:00+07:00
- Coverage tags: code_switch, date_clarification

## 2. Customer Persona

- Age: 38
- Location: Tây Hồ, Hà Nội
- Speaking style: tiếng Việt lưu loát nhưng chèn cụm thời gian và thanh toán bằng tiếng Anh
- Calling context: tự nhận ra mình nói nhầm thứ trong tuần và cần agent chốt ngày tuyệt đối

## 3. Conversation

## Turn 1

### Customer

Hi em, anh cần một ticket Hà Nội đi Nghệ An, Next Friday around 10 PM được không?

### Expected Agent Response

Em chào anh. Tính từ hôm nay 18/07/2026, “Next Friday” có thể được hiểu là 24/07, nhưng cụm này dễ gây nhầm. Anh đọc ngày cụ thể giúp em nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["travel_date"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","destination":"Nghệ An","passenger_count":1},"clear":[]}
```

## Turn 2

### Customer

À anh nói lộn thứ, Wednesday the twenty-second, tức 22 tháng 7, khoảng mười giờ tối.

### Expected Agent Response

Em hiểu là thứ Tư ngày 22/07/2026, giờ mong muốn khoảng 22:00. Em sẽ tra chuyến đúng ngày thay vì tự giữ cách hiểu “Next Friday”.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"travel_date":"2026-07-22"},"clear":[]}
```

## Turn 3

### Customer

Yes, check schedule sát 10 PM nhất cho anh.

### Expected Agent Response

Chuyến sát 22:00 nhất là 22:15, giường nằm 38 chỗ, đến Nghệ An lúc 03:15, giá 340.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","passenger_count":1},"expected_result":{"trip_ids":["HN-NA-20260722-2215-GN38"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

22:15 là được, xe giường nằm hả em, tới 03:15 đúng không?

### Expected Agent Response

Đúng ạ, chuyến 22:15 là giường nằm 38 chỗ và dự kiến đến lúc 03:15.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"PRESENT_TRIP_OPTIONS","missing_fields":["trip_id"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 5

### Customer

Chọn chuyến 22:15 đó, anh không đổi sang ngày khác nữa.

### Expected Agent Response

Em chọn chuyến HN-NA-20260722-2215-GN38 lúc 22:15. Anh muốn giường ở vị trí nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"HN-NA-20260722-2215-GN38","departure_time":"22:15","vehicle_type":"Giường nằm 38 chỗ"},"clear":[]}
```

## Turn 6

### Customer

Một giường tầng dưới phía trước nhé, B01 còn thì giữ giúp anh.

### Expected Agent Response

B01 còn trống và là giường tầng dưới phía trước. Em giữ B01, giá 340.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"HN-NA-20260722-2215-GN38","passenger_count":1,"seat_preference":"Tầng dưới, phía trước"},"expected_result":{"assigned_seats":["B01"],"unit_fare_vnd":340000,"total_fare_vnd":340000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước","assigned_seats":["B01"]},"clear":[]}
```

## Turn 7

### Customer

Pickup tại Công viên Hòa Bình nha, anh ở gần đó.

### Expected Agent Response

Em ghi nhận điểm đón Công viên Hòa Bình. Anh muốn xuống ở điểm trả nào tại Nghệ An?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json

{"set":{"pickup_location":"Công viên Hòa Bình"},"clear":[]}
```

## Turn 8

### Customer

Cho anh xuống Văn phòng Vinh, người nhà sẽ tới đón.

### Expected Agent Response

Em ghi điểm trả Văn phòng Vinh. Anh cho em tên hành khách ngồi B01.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Văn phòng Vinh"},"clear":[]}
```

## Turn 9

### Customer

Tên hành khách là Đặng Alex Sơn, adult, cũng là anh luôn.

### Expected Agent Response

Em ghi Đặng Alex Sơn, hành khách người lớn, ghế B01. Anh xác nhận dùng chính tên này đứng booking nhé?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Đặng Alex Sơn","type":"ADULT","seat":"B01"}]},"clear":[]}
```

## Turn 10

### Customer

Đúng, booking name là Đặng Alex Sơn.

### Expected Agent Response

Em ghi nhận người đặt Đặng Alex Sơn. Anh cho em số điện thoại Việt Nam đủ mười chữ số.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Đặng Alex Sơn"},"clear":[]}
```

## Turn 11

### Customer

Số local của anh là 0931000023.

### Expected Agent Response

Em ghi nhận 0931000023. Anh muốn chọn QR, bank transfer hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0931000023"},"clear":[]}
```

## Turn 12

### Customer

Nếu chọn bank transfer thì em có báo đã thanh toán ngay khi anh nói đã chuyển không?

### Expected Agent Response

Không ạ. Chuyển khoản chỉ được ghi nhận là đã thanh toán khi hệ thống xác nhận giao dịch thành công; nếu chưa có bằng chứng thì vẫn chưa thanh toán.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 13

### Customer

Okay, chọn bank transfer nhưng cứ để chưa thanh toán, anh sẽ chuyển sau.

### Expected Agent Response

Em ghi nhận thanh toán bằng chuyển khoản và hiện chưa thanh toán. Em sẽ đọc lại ngày và giờ đã được làm rõ trước khi đặt.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"BANK_TRANSFER","payment_status":"PENDING"},"clear":[]}
```

## Turn 14

### Customer

Recap giúp anh, nhất là date với departure time, nãy anh nói nhầm Friday.

### Expected Agent Response

Một người đi Hà Nội–Nghệ An ngày 22/07/2026, chuyến 22:15 giường nằm 38 chỗ, ghế B01; đón Công viên Hòa Bình, trả Văn phòng Vinh. Người đặt Đặng Alex Sơn, số 0931000023, chọn chuyển khoản nhưng chưa thực hiện, tổng 340.000 đồng.

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

Vậy final date là Wednesday 22 July, xe chạy 22:15 đúng chứ? Anh vừa chuyển 340.000 đồng, mã SYN-BT-023-340A; em check giúp anh luôn.

### Expected Agent Response

Đúng ạ: ngày cuối là 22/07/2026 và giờ đi 22:15. Cổng thanh toán cũng đã xác nhận chuyển khoản thành công, mã đối soát SYN-GW-023-OK-01; khoản 340.000 đồng đã thanh toán đủ. Em chưa đặt vé cho tới khi anh xác nhận toàn bộ thông tin.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"VERIFY_PAYMENT","missing_fields":[],"arguments":{"payment_method":"BANK_TRANSFER","payment_reference":"SYN-BT-023-340A"},"expected_result":{"payment_status":"PAID","provider_reference":"SYN-GW-023-OK-01"}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"BANK_TRANSFER","payment_status":"PAID"},"clear":[]}
```

## Turn 16

### Customer

Anh confirm toàn bộ thông tin cuối là đúng và đồng ý tổng tiền 340.000 đồng.

### Expected Agent Response

Anh đã xác nhận đúng ngày 22/07 và toàn bộ thông tin cuối. Em chờ lệnh xuất vé của anh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 17

### Customer

Yes, book it now và đọc mã vé cho anh.

### Expected Agent Response

Vé mã VA-CASE_023 đã được xác nhận; khoản chuyển khoản 340.000 đồng đã thanh toán đủ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260722-2215-GN38","customer_name":"Đặng Alex Sơn","customer_phone":"0931000023"},"expected_result":{"booking_id":"VA-CASE_023","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_023","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","departure_time":"22:15","trip_id":"HN-NA-20260722-2215-GN38","passenger_count":1,"vehicle_type":"Giường nằm 38 chỗ","seat_preference":"Tầng dưới, phía trước","assigned_seats":["B01"],"pickup_location":"Công viên Hòa Bình","dropoff_location":"Văn phòng Vinh","customer_name":"Đặng Alex Sơn","customer_phone":"0931000023","passenger_details":[{"name":"Đặng Alex Sơn","type":"ADULT","seat":"B01"}],"payment_method":"BANK_TRANSFER","payment_status":"PAID","booking_id":"VA-CASE_023","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Đặng Alex Sơn","phone":"0931000023"},"passengers":{"count":1,"details":[{"name":"Đặng Alex Sơn","type":"ADULT","seat":"B01"}]},"trip":{"trip_id":"HN-NA-20260722-2215-GN38","origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","departure_time":"22:15","arrival_time":"03:15"},"vehicle":{"type":"Giường nằm 38 chỗ","seat_preference":"Tầng dưới, phía trước","assigned_seats":["B01"]},"pickup_dropoff":{"pickup_location":"Công viên Hòa Bình","dropoff_location":"Văn phòng Vinh"},"payment":{"method":"BANK_TRANSFER","status":"PAID","unit_fare_vnd":340000,"total_fare_vnd":340000},"booking":{"booking_id":"VA-CASE_023","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":16}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_023
- Khách hàng: Đặng Alex Sơn
- Số điện thoại: 0931000023
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-22 22:15
- Loại xe: Giường nằm 38 chỗ
- Ghế: B01
- Điểm đón: Công viên Hòa Bình
- Điểm trả: Văn phòng Vinh
- Số hành khách: 1
- Thanh toán: Chuyển khoản ngân hàng | Đã thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Không tự gán “Next Friday”; phải làm rõ thành ngày ISO 2026-07-22 và 22:15.
- Bảo toàn code-switch trong lời khách và không làm rơi `ticket`, `schedule`, `pickup`, `confirm`.
- Chỉ ghi nhận chuyển khoản đã thanh toán sau khi đối chiếu mã giao dịch và nhận kết quả thành công từ cổng thanh toán ở lượt 15.
- Chỉ xác nhận booking sau lượt xác nhận cuối số 16.
