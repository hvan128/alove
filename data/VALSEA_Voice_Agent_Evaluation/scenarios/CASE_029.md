# CASE_029 — Hà Tĩnh family changes pickup and payment after recap

## 1. Scenario Metadata

- Scenario type: extreme
- Customer region: Hà Tĩnh
- Audio condition: simulated bus-station overlap and background announcement in text metadata; no acoustic result claimed
- Languages: Vietnamese
- Difficulty: extreme
- Call datetime: 2026-07-18T14:10:00+07:00
- Coverage tags: regional_language, bus_station, multiple_passengers, changed_mind

## 2. Customer Persona

- Age: 40
- Location: Bến xe Hà Tĩnh
- Speaking style: giọng Hà Tĩnh tự nhiên, có chi/rứa/vô; đang chăm cả trẻ em và người cao tuổi nên yêu cầu nhiều bước
- Calling context: đặt bốn vé gia đình, hỏi chính sách trẻ em và hỗ trợ xe lăn, làm rõ địa danh rồi đổi điểm đón/thanh toán sau xác nhận đầu

## 3. Conversation

## Turn 1

### Customer

Alo em, chị đang ở bến nên loa chen hơi nhiều. Nhà chị bốn người muốn đi Hà Tĩnh ra Hà Nội ngày 22 tháng 7; tiếng loa vừa nói “Đà Nẵng” không liên quan nghe.

### Expected Agent Response

Em chào chị. Em bỏ qua địa danh từ thông báo nền và cần chị xác nhận ý định của người gọi là Hà Tĩnh đi Hà Nội ngày 22/07 cho bốn người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["origin","destination","passenger_count"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 2

### Customer

Đúng rồi, bốn người: hai người lớn, một cháu nhỏ và một bà lớn tuổi, đi Hà Nội chứ không đi mô khác.

### Expected Agent Response

Em ghi nhận Hà Tĩnh đi Hà Nội ngày 22/07/2026 cho bốn người, gồm hai người lớn, một trẻ em và một người cao tuổi. Chị muốn hỏi chính sách trước khi tìm chuyến không?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","passenger_count":4},"clear":[]}
```

## Turn 3

### Customer

Cháu nhỏ có cần ghế riêng không, hay nằm cùng mẹ cho đỡ tiền rứa em?

### Expected Agent Response

Theo chính sách nhà xe, trẻ em phải đi cùng người lớn, có thông tin hành khách và ghế riêng, đồng thời được tính cùng đơn giá niêm yết như người lớn.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

Rứa thì tìm chuyến 19:00, cần đủ bốn ghế tầng dưới.

### Expected Agent Response

Chuyến HT-HN-20260722-1900-GN34 lúc 19:00 còn đủ bốn ghế tầng dưới, giá 390.000 đồng mỗi người và dự kiến đến lúc 01:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","passenger_count":4},"expected_result":{"trip_ids":["HT-HN-20260722-1900-GN34"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 5

### Customer

Chọn chuyến 19:00 giường nằm 34 chỗ đó.

### Expected Agent Response

Em chọn chuyến 19:00. Hiện có ba ghế tầng dưới phía trước liền nhau B01–B03 và ghế D01 ở tầng dưới khu giữa.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"HT-HN-20260722-1900-GN34","departure_time":"19:00","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 6

### Customer

Trước khi giữ ghế, bà đi cùng có xe lăn gấp gọn. Nhà xe hỗ trợ bà lên xuống và xếp xe vô khoang được không? Chị cần cả bốn ghế tầng dưới để bà không phải leo tầng.

### Expected Agent Response

Nhà xe có thể hỗ trợ bà lên xuống và xếp xe lăn gấp gọn nếu mình báo trước. Em đã ghi chú yêu cầu này cùng ưu tiên bốn ghế tầng dưới; chị chọn cụ thể các ghế để em giữ nhé.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["assigned_seats","pickup_location","dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Bốn giường tầng dưới; ba giường phía trước liền nhau và một giường khu giữa; cần hỗ trợ lên xuống và xếp xe lăn gấp"},"clear":[]}
```

## Turn 7

### Customer

Vậy giữ B01, B02, B03 cho ba mẹ con liền nhau, D01 cho bà; nhớ kèm ghi chú hỗ trợ xe lăn gấp cho bà nghe em.

### Expected Agent Response

Em giữ B01–B03 tầng dưới phía trước nối liền và D01 tầng dưới khu giữa, kèm ghi chú hỗ trợ bà lên xuống và xếp xe lăn gấp. Tổng bốn vé là 1.560.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"HT-HN-20260722-1900-GN34","passenger_count":4,"seat_preference":"Bốn giường tầng dưới; ba giường phía trước liền nhau và một giường khu giữa; cần hỗ trợ lên xuống và xếp xe lăn gấp"},"expected_result":{"assigned_seats":["B01","B02","B03","D01"],"unit_fare_vnd":390000,"total_fare_vnd":1560000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Bốn giường tầng dưới; ba giường phía trước liền nhau và một giường khu giữa; cần hỗ trợ lên xuống và xếp xe lăn gấp","assigned_seats":["B01","B02","B03","D01"]},"clear":[]}
```

## Turn 8

### Customer

Đón ở gần chợ Cày được không em, chị chỉ biết cái mốc đó thôi.

### Expected Agent Response

“Gần chợ Cày” chưa phải điểm đón chính thức nên em không tự chọn thay chị. Chị chọn Bến xe Hà Tĩnh, Văn phòng Hà Tĩnh hoặc Ngã ba Đồng Lộc nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 9

### Customer

Vậy trước mắt chọn Bến xe Hà Tĩnh, chỗ ni dễ tìm hơn.

### Expected Agent Response

Em ghi nhận Bến xe Hà Tĩnh. Chị muốn xuống điểm nào tại Hà Nội?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Hà Tĩnh"},"clear":[]}
```

## Turn 10

### Customer

Xuống Văn phòng Hà Nội, con chị ra đó đón.

### Expected Agent Response

Em ghi điểm trả Văn phòng Hà Nội. Chị đọc tên, loại hành khách và ghế của bốn người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Văn phòng Hà Nội"},"clear":[]}
```

## Turn 11

### Customer

B01 Phan Đức Thắng người lớn, B02 Nguyễn Thị Hoa người lớn, B03 cháu Phan Minh An trẻ em, D01 bà Lê Thị Lý người cao tuổi.

### Expected Agent Response

Em ghi đủ bốn hành khách và ghế; trẻ em đi cùng hai người lớn và có ghế riêng. Ai sẽ đứng tên đặt vé ạ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Phan Đức Thắng","type":"ADULT","seat":"B01"},{"name":"Nguyễn Thị Hoa","type":"ADULT","seat":"B02"},{"name":"Phan Minh An","type":"CHILD","seat":"B03"},{"name":"Lê Thị Lý","type":"SENIOR","seat":"D01"}]},"clear":[]}
```

## Turn 12

### Customer

Anh Thắng đứng tên, đầy đủ Phan Đức Thắng.

### Expected Agent Response

Em ghi người đặt Phan Đức Thắng. Chị cho số điện thoại liên hệ đủ mười chữ số.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Phan Đức Thắng"},"clear":[]}
```

## Turn 13

### Customer

Số liên hệ 0915000029, số của anh Thắng đó.

### Expected Agent Response

Em ghi nhận 0915000029. Chị chọn QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0915000029"},"clear":[]}
```

## Turn 14

### Customer

Chọn QR, nhưng chưa quét nên cứ để chưa thanh toán.

### Expected Agent Response

Em ghi thanh toán QR và hiện chưa thanh toán. Em sẽ đọc lại toàn bộ thông tin trước khi đặt.

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

Em đọc lại cả bốn vé, ghế tầng dưới, điểm đón và tổng tiền cho chị.

### Expected Agent Response

Bốn người đi Hà Tĩnh–Hà Nội ngày 22/07/2026, chuyến 19:00 giường nằm 34 chỗ; B01, B02, B03 và D01 đều tầng dưới. Đón Bến xe Hà Tĩnh, trả Văn phòng Hà Nội; đã ghi chú hỗ trợ bà lên xuống và xếp xe lăn gấp. Người đặt Phan Đức Thắng, số 0915000029, thanh toán QR chưa hoàn tất, tổng 1.560.000 đồng.

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

Chị xác nhận phần em vừa đọc là đúng, cứ theo Bến xe Hà Tĩnh và QR.

### Expected Agent Response

Em đang giữ bản đón ở Bến xe Hà Tĩnh và thanh toán QR theo lời chị, nhưng chưa xuất vé. Chị kiểm tra xem gia đình còn cần chỉnh gì không nhé.

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

Khoan em, đổi điểm đón sang Văn phòng Hà Tĩnh cho bà đỡ đi xa, với đổi QR sang tiền mặt khi lên xe.

### Expected Agent Response

Em đổi điểm đón sang Văn phòng Hà Tĩnh và chuyển sang trả tiền mặt khi lên xe. Vì chị đổi thông tin sau lần đọc lại trước, phần xác nhận cũ không còn hiệu lực và chị cần xác nhận lại.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Văn phòng Hà Tĩnh","payment_method":"CASH_ON_BOARDING","payment_status":"PENDING"},"clear":["explicit_confirmation"]}
```

## Turn 18

### Customer

Em đọc bản cuối lần nữa, đừng lẫn điểm đón cũ với mới.

### Expected Agent Response

Bản cuối: bốn người, ngày 22/07, chuyến 19:00, ghế B01/B02/B03/D01; đón Văn phòng Hà Tĩnh, trả Văn phòng Hà Nội; vẫn giữ ghi chú hỗ trợ bà lên xuống và xếp xe lăn gấp. Tiền vé sẽ trả bằng tiền mặt khi lên xe, tổng 1.560.000 đồng; Bến xe Hà Tĩnh và QR không còn là lựa chọn cuối.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 19

### Customer

Chị xác nhận bản mới đúng: Văn phòng Hà Tĩnh, tiền mặt và yêu cầu hỗ trợ xe lăn gấp vẫn giữ nguyên.

### Expected Agent Response

Em đã ghi nhận bản mới, gồm cả yêu cầu hỗ trợ bà. Chị ra lệnh xuất vé là em hoàn tất ngay.

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

Hoàn tất ngay và đọc mã vé cho cả nhà chị.

### Expected Agent Response

Vé mã VA-CASE_029 đã được xác nhận; tiền vé sẽ được thanh toán khi gia đình lên xe.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HT-HN-20260722-1900-GN34","customer_name":"Phan Đức Thắng","customer_phone":"0915000029"},"expected_result":{"booking_id":"VA-CASE_029","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_029","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","departure_time":"19:00","trip_id":"HT-HN-20260722-1900-GN34","passenger_count":4,"vehicle_type":"Giường nằm 34 chỗ","seat_preference":"Bốn giường tầng dưới; ba giường phía trước liền nhau và một giường khu giữa; cần hỗ trợ lên xuống và xếp xe lăn gấp","assigned_seats":["B01","B02","B03","D01"],"pickup_location":"Văn phòng Hà Tĩnh","dropoff_location":"Văn phòng Hà Nội","customer_name":"Phan Đức Thắng","customer_phone":"0915000029","passenger_details":[{"name":"Phan Đức Thắng","type":"ADULT","seat":"B01"},{"name":"Nguyễn Thị Hoa","type":"ADULT","seat":"B02"},{"name":"Phan Minh An","type":"CHILD","seat":"B03"},{"name":"Lê Thị Lý","type":"SENIOR","seat":"D01"}],"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING","booking_id":"VA-CASE_029","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Phan Đức Thắng","phone":"0915000029"},"passengers":{"count":4,"details":[{"name":"Phan Đức Thắng","type":"ADULT","seat":"B01"},{"name":"Nguyễn Thị Hoa","type":"ADULT","seat":"B02"},{"name":"Phan Minh An","type":"CHILD","seat":"B03"},{"name":"Lê Thị Lý","type":"SENIOR","seat":"D01"}]},"trip":{"trip_id":"HT-HN-20260722-1900-GN34","origin":"Hà Tĩnh","destination":"Hà Nội","travel_date":"2026-07-22","departure_time":"19:00","arrival_time":"01:00"},"vehicle":{"type":"Giường nằm 34 chỗ","seat_preference":"Bốn giường tầng dưới; ba giường phía trước liền nhau và một giường khu giữa; cần hỗ trợ lên xuống và xếp xe lăn gấp","assigned_seats":["B01","B02","B03","D01"]},"pickup_dropoff":{"pickup_location":"Văn phòng Hà Tĩnh","dropoff_location":"Văn phòng Hà Nội"},"payment":{"method":"CASH_ON_BOARDING","status":"PENDING","unit_fare_vnd":390000,"total_fare_vnd":1560000},"booking":{"booking_id":"VA-CASE_029","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":19}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_029
- Khách hàng: Phan Đức Thắng
- Số điện thoại: 0915000029
- Tuyến: Hà Tĩnh → Hà Nội
- Khởi hành: 2026-07-22 19:00
- Loại xe: Giường nằm 34 chỗ
- Ghế: B01, B02, B03, D01
- Điểm đón: Văn phòng Hà Tĩnh
- Điểm trả: Văn phòng Hà Nội
- Số hành khách: 4
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Hỗ trợ: Lên/xuống xe và xếp xe lăn gấp
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Không lấy “Đà Nẵng” từ thông báo nền làm destination và không tự ánh xạ “chợ Cày”.
- Áp dụng đúng chính sách trẻ em và hỗ trợ xe lăn; cả trẻ em và người cao tuổi có ghế riêng trong danh sách còn trống.
- Ground B01–B03 là chuỗi liền tầng dưới phía trước và D01 là tầng dưới khu giữa.
- Sau đổi pickup/payment ở lượt 17 phải xóa xác nhận cũ; xác nhận hiệu lực cuối là lượt 19.
