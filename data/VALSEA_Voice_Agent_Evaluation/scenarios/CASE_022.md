# CASE_022 — Upgrade sang VIP cabin và chọn lower cabin

## 1. Scenario Metadata

- Scenario type: code_switching
- Customer region: Hà Nội
- Audio condition: clean telephone call (text-only benchmark)
- Languages: Vietnamese, English
- Difficulty: hard
- Call datetime: 2026-07-18T19:10:00+07:00
- Coverage tags: code_switch, upgrade, seat_selection

## 2. Customer Persona

- Age: 29
- Location: Cầu Giấy, Hà Nội
- Speaking style: giọng Bắc tự nhiên, dùng thuật ngữ du lịch tiếng Anh trong câu tiếng Việt
- Calling context: đặt hai vé về Nghệ An và cân nhắc nâng hạng xe

## 3. Conversation

## Turn 1

### Customer

Alo, cho chị check schedule Hà Nội đi Nghệ An ngày 22 tháng 7, hai ticket nhé em.

### Expected Agent Response

Em chào chị. Em đã ghi nhận tuyến Hà Nội đi Nghệ An ngày 22 tháng 7 cho hai người và sẽ tra các chuyến còn đủ chỗ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","passenger_count":2},"clear":[]}
```

## Turn 2

### Customer

Ừ, em tìm giúp chị, ưu tiên buổi tối nhưng cho chị xem đủ lựa chọn.

### Expected Agent Response

Có chuyến 20:00 Limousine 21 Phòng VIP giá 530.000 đồng, 21:30 giường nằm 34 chỗ giá 350.000 đồng và 22:15 giường nằm 38 chỗ giá 340.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","passenger_count":2},"expected_result":{"trip_ids":["HN-NA-20260722-2000-VIP21","HN-NA-20260722-2130-GN34","HN-NA-20260722-2215-GN38"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Chuyến 21:30 là loại thường đúng không, đến Vinh khoảng mấy giờ?

### Expected Agent Response

Đúng ạ, chuyến 21:30 là giường nằm 34 chỗ, đến lúc 02:30 ngày hôm sau.

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

Tạm chọn chuyến 21:30 đó cho chị, để chị hỏi thêm đã.

### Expected Agent Response

Em tạm ghi nhận chuyến 21:30 giường nằm 34 chỗ. Chị muốn hỏi thêm điều gì trước khi chọn ghế?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"HN-NA-20260722-2130-GN34","departure_time":"21:30","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 5

### Customer

Nếu chị upgrade lên VIP cabin thì có chuyến nào, giá chênh bao nhiêu?

### Expected Agent Response

Chuyến VIP là 20:00, loại Limousine 21 Phòng VIP, giá 530.000 đồng mỗi người, cao hơn chuyến 21:30 là 180.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"HN-NA-20260722-2000-VIP21","departure_time":"20:00","vehicle_type":"Limousine 21 Phòng VIP"},"clear":["seat_preference","assigned_seats","passenger_details"]}
```

## Turn 6

### Customer

Okay, cho chị xem seat map, còn lower cabin nào nằm cạnh nhau không?

### Expected Agent Response

Hiện còn hai cặp phòng tầng dưới liền nhau: A01–A02 ở phía trước và B01–B02 ở khu giữa.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"PRESENT_TRIP_OPTIONS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 7

### Customer

Chị lấy A01 với A02, lower cabin phía trước cho dễ xuống.

### Expected Agent Response

Em giữ A01 và A02, hai phòng tầng dưới phía trước liền nhau. Tổng hai vé là 1.060.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"HN-NA-20260722-2000-VIP21","passenger_count":2,"seat_preference":"Phòng tầng dưới, phía trước, liền nhau"},"expected_result":{"assigned_seats":["A01","A02"],"unit_fare_vnd":530000,"total_fare_vnd":1060000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Phòng tầng dưới, phía trước, liền nhau","assigned_seats":["A01","A02"]},"clear":[]}
```

## Turn 8

### Customer

Đón chị ở Bến xe Mỹ Đình nhé, chị sẽ có mặt sớm.

### Expected Agent Response

Em ghi nhận điểm đón Bến xe Mỹ Đình. Chị muốn trả tại điểm nào ở Nghệ An?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Mỹ Đình"},"clear":[]}
```

## Turn 9

### Customer

Xuống Bến xe Vinh, nhà chị ra đó đón.

### Expected Agent Response

Vâng, điểm trả là Bến xe Vinh. Chị cho em tên hai hành khách theo A01 và A02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe Vinh"},"clear":[]}
```

## Turn 10

### Customer

A01 Nguyễn Thu Hà, A02 Phạm Hải Nam, đều là người lớn em nhé.

### Expected Agent Response

Em đã ghi nhận Nguyễn Thu Hà ghế A01 và Phạm Hải Nam ghế A02. Ai sẽ đứng tên đặt vé ạ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Nguyễn Thu Hà","type":"ADULT","seat":"A01"},{"name":"Phạm Hải Nam","type":"ADULT","seat":"A02"}]},"clear":[]}
```

## Turn 11

### Customer

Chị Hà đứng tên, Nguyễn Thu Hà.

### Expected Agent Response

Em ghi người đặt là Nguyễn Thu Hà. Chị cho em số điện thoại liên hệ đủ mười chữ số.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Nguyễn Thu Hà"},"clear":[]}
```

## Turn 12

### Customer

Số của chị 0911000022.

### Expected Agent Response

Em ghi nhận 0911000022. Chị chọn QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0911000022"},"clear":[]}
```

## Turn 13

### Customer

Chị trả tiền mặt khi lên xe, khỏi gửi link payment.

### Expected Agent Response

Em ghi nhận chị sẽ trả tiền mặt khi lên xe; hiện chưa thanh toán. Em sẽ đọc lại toàn bộ trước khi đặt.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING"},"clear":[]}
```

## Turn 14

### Customer

Recap giúp chị tổng tiền và nhớ là đã upgrade sang VIP cabin nhé.

### Expected Agent Response

Hai người đi Hà Nội–Nghệ An ngày 22/07/2026, chuyến 20:00 Limousine 21 Phòng VIP, phòng A01–A02 tầng dưới phía trước; đón Mỹ Đình, trả Bến xe Vinh. Người đặt Nguyễn Thu Hà, số 0911000022, trả tiền mặt khi lên xe và chưa thanh toán, tổng 1.060.000 đồng.

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

Đến 01:00 sáng và đúng hai lower cabin cạnh nhau chứ em?

### Expected Agent Response

Đúng ạ, chuyến dự kiến đến lúc 01:00 và A01–A02 là hai phòng tầng dưới phía trước liền nhau. Vé vẫn chưa được phát hành cho tới khi chị xác nhận.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 16

### Customer

Chị xác nhận toàn bộ recap cuối là đúng, giữ chuyến VIP và hai phòng A01, A02.

### Expected Agent Response

Bản chốt cuối đã được chị xác nhận. Em có thể xuất vé ngay khi chị yêu cầu.

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

Đúng rồi em, book vé và gửi mã cho chị.

### Expected Agent Response

Vé mã VA-CASE_022 đã được xác nhận; tiền vé sẽ được thanh toán khi chị lên xe.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260722-2000-VIP21","customer_name":"Nguyễn Thu Hà","customer_phone":"0911000022"},"expected_result":{"booking_id":"VA-CASE_022","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_022","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","departure_time":"20:00","trip_id":"HN-NA-20260722-2000-VIP21","passenger_count":2,"vehicle_type":"Limousine 21 Phòng VIP","seat_preference":"Phòng tầng dưới, phía trước, liền nhau","assigned_seats":["A01","A02"],"pickup_location":"Bến xe Mỹ Đình","dropoff_location":"Bến xe Vinh","customer_name":"Nguyễn Thu Hà","customer_phone":"0911000022","passenger_details":[{"name":"Nguyễn Thu Hà","type":"ADULT","seat":"A01"},{"name":"Phạm Hải Nam","type":"ADULT","seat":"A02"}],"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING","booking_id":"VA-CASE_022","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Nguyễn Thu Hà","phone":"0911000022"},"passengers":{"count":2,"details":[{"name":"Nguyễn Thu Hà","type":"ADULT","seat":"A01"},{"name":"Phạm Hải Nam","type":"ADULT","seat":"A02"}]},"trip":{"trip_id":"HN-NA-20260722-2000-VIP21","origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","departure_time":"20:00","arrival_time":"01:00"},"vehicle":{"type":"Limousine 21 Phòng VIP","seat_preference":"Phòng tầng dưới, phía trước, liền nhau","assigned_seats":["A01","A02"]},"pickup_dropoff":{"pickup_location":"Bến xe Mỹ Đình","dropoff_location":"Bến xe Vinh"},"payment":{"method":"CASH_ON_BOARDING","status":"PENDING","unit_fare_vnd":530000,"total_fare_vnd":1060000},"booking":{"booking_id":"VA-CASE_022","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":16}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_022
- Khách hàng: Nguyễn Thu Hà
- Số điện thoại: 0911000022
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-22 20:00
- Loại xe: Limousine 21 Phòng VIP
- Ghế: A01, A02
- Điểm đón: Bến xe Mỹ Đình
- Điểm trả: Bến xe Vinh
- Số hành khách: 2
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu đúng yêu cầu `upgrade`, `VIP cabin`, `seat map`, `lower cabin` và giữ nguyên các thuật ngữ trong lời khách.
- Thay lựa chọn giường nằm bằng đúng chuyến VIP trước khi giữ ghế, không để sót ghế cũ.
- A01–A02 phải được ground là tầng dưới, phía trước và liền nhau theo seat metadata.
- Chỉ có một `CONFIRM_BOOKING`, sau xác nhận rõ ràng ở lượt 16.
