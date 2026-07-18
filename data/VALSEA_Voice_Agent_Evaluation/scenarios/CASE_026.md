# CASE_026 — Separate caller intent from a simulated bus-station announcement

## 1. Scenario Metadata

- Scenario type: difficult_audio
- Customer region: Sài Gòn
- Audio condition: simulated bus-station background and overlapping announcement in text metadata; no acoustic result claimed
- Languages: Vietnamese
- Difficulty: hard
- Call datetime: 2026-07-18T18:20:00+07:00
- Coverage tags: background_noise, bus_station, overlap

## 2. Customer Persona

- Age: 27
- Location: Bến xe Miền Đông mới
- Speaking style: giọng Nam, nói ngắn nhưng chủ động phân biệt lời mình với thông báo ở bến
- Calling context: đang đứng tại bến đông người để đặt hai vé đi Đà Lạt

## 3. Conversation

## Turn 1

### Customer

Alo em, anh đang ở bến xe nên hơi ồn. Anh cần hai vé Sài Gòn đi Đà Lạt ngày 22 tháng 7... loa vừa đọc “Đà Nẵng” đó không phải lời anh nghen.

### Expected Agent Response

Em chào anh. Em nghe có hai địa danh khác nhau nên chưa dùng thông báo “Đà Nẵng” làm ý định. Anh xác nhận tuyến của người gọi là Sài Gòn đi Đà Lạt cho hai người nhé?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["origin","destination"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 2

### Customer

Đúng, bỏ qua loa. Chính anh nói Sài Gòn đi Đà Lạt ngày 22, hai người lớn.

### Expected Agent Response

Em đã xác nhận ý định của người gọi: Sài Gòn đi Đà Lạt ngày 22/07/2026, hai người lớn. Anh muốn chuyến khoảng mấy giờ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","passenger_count":2},"clear":[]}
```

## Turn 3

### Customer

Tầm mười giờ tối, em kiếm chuyến giường nằm còn đủ hai ghế cho anh.

### Expected Agent Response

Có chuyến 22:00 giường nằm 34 chỗ giá 320.000 đồng và chuyến 23:30 Limousine 22 Phòng giá 450.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","passenger_count":2},"expected_result":{"trip_ids":["SG-DL-20260722-2200-GN34","SG-DL-20260722-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

Lấy chuyến 22:00 giường nằm 34 chỗ, tụi anh tới sớm được.

### Expected Agent Response

Em chọn chuyến SG-DL-20260722-2200-GN34 lúc 22:00, đến 05:30. Anh muốn vị trí ghế thế nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"SG-DL-20260722-2200-GN34","departure_time":"22:00","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 5

### Customer

Hai ghế tầng dưới phía trước liền nhau, B01 với B02 còn thì giữ nha.

### Expected Agent Response

B01 và B02 đều còn, là hai giường tầng dưới phía trước liền nhau. Tổng tiền 640.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"SG-DL-20260722-2200-GN34","passenger_count":2,"seat_preference":"Tầng dưới, phía trước, liền nhau"},"expected_result":{"assigned_seats":["B01","B02"],"unit_fare_vnd":320000,"total_fare_vnd":640000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước, liền nhau","assigned_seats":["B01","B02"]},"clear":[]}
```

## Turn 6

### Customer

Điểm đón ở bến... loa lại chen “Hà Nội”, khoan, em có nghe chữ nào sau “bến” không?

### Expected Agent Response

Em chỉ xác định được anh nói “ở bến”, chưa đủ để chọn điểm đón cụ thể. Anh nói lại đầy đủ tên điểm của chính anh.

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

Anh nói Bến xe Miền Đông mới, đúng chỗ anh đang đứng đây.

### Expected Agent Response

Em ghi nhận Bến xe Miền Đông mới, đây là điểm đón hợp lệ của chuyến. Anh muốn xuống điểm nào tại Đà Lạt?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Miền Đông mới"},"clear":[]}
```

## Turn 8

### Customer

Xuống Bến xe liên tỉnh Đà Lạt luôn, khỏi trung chuyển.

### Expected Agent Response

Em ghi điểm trả Bến xe liên tỉnh Đà Lạt. Anh cho em tên hai hành khách theo B01 và B02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe liên tỉnh Đà Lạt"},"clear":[]}
```

## Turn 9

### Customer

Từ từ em, tụi anh mỗi người có vali 15 ký với túi xách 5 ký, hành lý vậy được hông?

### Expected Agent Response

Được ạ. Mỗi hành khách được tối đa 20 kg ký gửi và một túi xách tay tối đa 7 kg; mức 15 kg và 5 kg mỗi người nằm trong hạn mức.

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

B01 Lâm Quốc Bảo, B02 Trương Mỹ Duyên, cả hai là người lớn.

### Expected Agent Response

Em ghi Lâm Quốc Bảo ghế B01 và Trương Mỹ Duyên ghế B02. Ai đứng tên đặt vé ạ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Lâm Quốc Bảo","type":"ADULT","seat":"B01"},{"name":"Trương Mỹ Duyên","type":"ADULT","seat":"B02"}]},"clear":[]}
```

## Turn 11

### Customer

Anh Bảo đứng tên, đầy đủ Lâm Quốc Bảo.

### Expected Agent Response

Em ghi người đặt Lâm Quốc Bảo. Anh cho số điện thoại liên hệ đủ mười chữ số.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Lâm Quốc Bảo"},"clear":[]}
```

## Turn 12

### Customer

Số anh 0902000026, em chỉ lấy giọng anh, đừng lấy số nào từ loa nha.

### Expected Agent Response

Em ghi nhận đúng số người gọi 0902000026. Anh chọn QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0902000026"},"clear":[]}
```

## Turn 13

### Customer

Tiền mặt lúc lên xe nghen, giờ chưa thanh toán gì hết.

### Expected Agent Response

Em ghi anh sẽ trả tiền mặt khi lên xe; hiện chưa thanh toán.

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

Em đọc chậm lại toàn bộ vé với hai điểm bến xe cho anh nghe.

### Expected Agent Response

Hai người đi Sài Gòn–Đà Lạt ngày 22/07/2026, chuyến 22:00 giường nằm 34 chỗ, ghế B01–B02; đón Bến xe Miền Đông mới, trả Bến xe liên tỉnh Đà Lạt. Người đặt Lâm Quốc Bảo, số 0902000026, trả tiền mặt khi lên xe và chưa thanh toán, tổng 640.000 đồng.

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

Xác nhận lần nữa: tuyến của anh là Đà Lạt, không phải Đà Nẵng hay Hà Nội từ tiếng loa.

### Expected Agent Response

Đúng ạ, tuyến cuối là Sài Gòn đi Đà Lạt; em đã bỏ qua các địa danh nghe từ thông báo nền.

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

Anh xác nhận toàn bộ thông tin cuối là đúng, gồm hai ghế và tổng 640.000 đồng.

### Expected Agent Response

Em đã chốt đúng tuyến Sài Gòn–Đà Lạt và toàn bộ thông tin anh vừa xác nhận. Anh đồng ý thì em xuất vé ngay.

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

Đặt ngay đi em, đọc mã vé cho anh trước khi loa phát tiếp.

### Expected Agent Response

Vé mã VA-CASE_026 đã được xác nhận; tiền vé sẽ được thanh toán khi anh lên xe.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260722-2200-GN34","customer_name":"Lâm Quốc Bảo","customer_phone":"0902000026"},"expected_result":{"booking_id":"VA-CASE_026","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_026","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","departure_time":"22:00","trip_id":"SG-DL-20260722-2200-GN34","passenger_count":2,"vehicle_type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước, liền nhau","assigned_seats":["B01","B02"],"pickup_location":"Bến xe Miền Đông mới","dropoff_location":"Bến xe liên tỉnh Đà Lạt","customer_name":"Lâm Quốc Bảo","customer_phone":"0902000026","passenger_details":[{"name":"Lâm Quốc Bảo","type":"ADULT","seat":"B01"},{"name":"Trương Mỹ Duyên","type":"ADULT","seat":"B02"}],"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING","booking_id":"VA-CASE_026","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Lâm Quốc Bảo","phone":"0902000026"},"passengers":{"count":2,"details":[{"name":"Lâm Quốc Bảo","type":"ADULT","seat":"B01"},{"name":"Trương Mỹ Duyên","type":"ADULT","seat":"B02"}]},"trip":{"trip_id":"SG-DL-20260722-2200-GN34","origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-22","departure_time":"22:00","arrival_time":"05:30"},"vehicle":{"type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước, liền nhau","assigned_seats":["B01","B02"]},"pickup_dropoff":{"pickup_location":"Bến xe Miền Đông mới","dropoff_location":"Bến xe liên tỉnh Đà Lạt"},"payment":{"method":"CASH_ON_BOARDING","status":"PENDING","unit_fare_vnd":320000,"total_fare_vnd":640000},"booking":{"booking_id":"VA-CASE_026","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":16}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_026
- Khách hàng: Lâm Quốc Bảo
- Số điện thoại: 0902000026
- Tuyến: Sài Gòn → Đà Lạt
- Khởi hành: 2026-07-22 22:00
- Loại xe: Giường nằm 34 chỗ
- Ghế: B01, B02
- Điểm đón: Bến xe Miền Đông mới
- Điểm trả: Bến xe liên tỉnh Đà Lạt
- Số hành khách: 2
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Tách ý định của người gọi khỏi địa danh “Đà Nẵng”, “Hà Nội” được mô phỏng như thông báo nền.
- Làm rõ điểm đón “ở bến” trước khi ánh xạ sang Bến xe Miền Đông mới.
- Trả lời hành lý đúng policy và không tuyên bố benchmark đã đo tiếng ồn thực.
- Chỉ có một `CONFIRM_BOOKING` sau xác nhận lượt 16.
