# CASE_025 — Repair điểm đến và số điện thoại trên cuộc gọi mô phỏng 8 kHz

## 1. Scenario Metadata

- Scenario type: difficult_audio
- Customer region: Hà Nội
- Audio condition: telephone 8 kHz clipping simulated through metadata and repair turns; no acoustic result claimed
- Languages: Vietnamese
- Difficulty: hard
- Call datetime: 2026-07-18T20:05:00+07:00
- Coverage tags: telephone, clipping, repair

## 2. Customer Persona

- Age: 42
- Location: Hà Nội
- Speaking style: nói tự nhiên, chủ động báo đường truyền chập chờn, dùng từ gợi nghĩa để làm rõ tên
- Calling context: đặt một vé về Nghệ An; điểm đến ban đầu bị cắt và số điện thoại có hai cách đọc mâu thuẫn

## 3. Conversation

## Turn 1

### Customer

Alo em, sóng bên anh đang chập chờn, nếu mất chữ thì hỏi lại nhé. Anh cần một vé từ Hà Nội đi Nghệ... ngày 22 tháng 7, phần tên tỉnh chắc vừa bị cắt rồi.

### Expected Agent Response

Em chào anh. Em nghe rõ điểm đi Hà Nội và ngày 22/07/2026 cho một người, nhưng điểm đến mới có “Nghệ...”, nên em chưa lưu. Anh nói lại đầy đủ tên tỉnh và giờ muốn đi nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["destination","departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","travel_date":"2026-07-22","passenger_count":1},"clear":[]}
```

## Turn 2

### Customer

Đi Nghệ An em nhé, đầy đủ là Nghệ An. Giờ anh muốn chuyến 21:30.

### Expected Agent Response

Em xác nhận điểm đến là Nghệ An và giờ mong muốn 21:30. Em sẽ tra đúng tuyến Hà Nội–Nghệ An ngày 22/07.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"destination":"Nghệ An"},"clear":[]}
```

## Turn 3

### Customer

Đúng rồi, em tìm chuyến 21:30 còn chỗ cho anh.

### Expected Agent Response

Chuyến HN-NA-20260722-2130-GN34 còn chỗ, giá 350.000 đồng và dự kiến đến lúc 02:30.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","passenger_count":1},"expected_result":{"trip_ids":["HN-NA-20260722-2130-GN34"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

Đúng chuyến 21:30, chọn nó giúp anh.

### Expected Agent Response

Em chọn chuyến 21:30, giường nằm 34 chỗ. Anh muốn giường vị trí nào?

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

Anh thích ghế tầng dưới phía trước, B03 còn thì giữ B03.

### Expected Agent Response

B03 còn và là giường tầng dưới phía trước. Em giữ B03, giá 350.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"HN-NA-20260722-2130-GN34","passenger_count":1,"seat_preference":"Tầng dưới, phía trước"},"expected_result":{"assigned_seats":["B03"],"unit_fare_vnd":350000,"total_fare_vnd":350000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước","assigned_seats":["B03"]},"clear":[]}
```

## Turn 6

### Customer

Điểm đón Văn phòng Hà Nội, anh không ra bến xe được.

### Expected Agent Response

Em ghi nhận Văn phòng Hà Nội. Anh muốn xuống Bến xe Vinh, Văn phòng Vinh hay Trung tâm Nghệ An?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Văn phòng Hà Nội"},"clear":[]}
```

## Turn 7

### Customer

Xuống Bến xe Vinh nhé em, nhà anh ra đón.

### Expected Agent Response

Em ghi điểm trả Bến xe Vinh. Anh đọc giúp em tên hành khách; nếu tín hiệu mất đoạn em sẽ chưa lưu tên.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details","customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe Vinh"},"clear":[]}
```

## Turn 8

### Customer

Tên anh là Nguyễn Đức Hiếu — Hiếu như “hiếu thảo”, chữ cuối có dấu sắc. Anh là người lớn và tự đứng tên đặt vé.

### Expected Agent Response

Em ghi nhận Nguyễn Đức Hiếu, hành khách người lớn ghế B03 và cũng là người đặt vé. Anh cho số điện thoại đủ mười chữ số nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Nguyễn Đức Hiếu","type":"ADULT","seat":"B03"}],"customer_name":"Nguyễn Đức Hiếu"},"clear":[]}
```

## Turn 9

### Customer

Em đọc lại tên và ghế cho anh kiểm tra trước đã, đường dây dễ làm lẫn Hiếu với Hữu lắm.

### Expected Agent Response

Em đọc là Nguyễn Đức Hiếu — Hiếu có dấu sắc — người lớn, ghế B03. Em chưa ghi số điện thoại; anh đọc giúp em khi sẵn sàng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 10

### Customer

Số anh là 0912000025... khoan, đoạn cuối anh vừa nghe vọng lại giống 0052; em đừng chọn một trong hai nhé.

### Expected Agent Response

Em đang có hai cách đọc mâu thuẫn nên chưa lưu số nào. Anh đọc lại chậm theo nhóm ba–ba–bốn và chốt riêng bốn số cuối.

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

Không chín một, hai không không, không không hai năm: 0912000025.

### Expected Agent Response

Em xác nhận số 0912000025, đủ mười chữ số. Anh muốn thanh toán cách nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0912000025"},"clear":[]}
```

## Turn 12

### Customer

Anh trả tiền mặt khi lên xe, trạng thái cứ để chờ thanh toán.

### Expected Agent Response

Em ghi nhận anh sẽ trả tiền mặt khi lên xe; hiện chưa thanh toán.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING"},"clear":[]}
```

## Turn 13

### Customer

Vì cuộc gọi bị cắt, em đọc riêng cho anh tuyến, giờ đi, họ tên và số điện thoại trước nhé.

### Expected Agent Response

Tuyến Hà Nội–Nghệ An; giờ đi 21:30; họ tên Nguyễn Đức Hiếu; số điện thoại 0912000025. Anh nghe đúng cả bốn thông tin chứ ạ?

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

Đúng cả bốn trường đó. Giờ em đọc cả vé, ghế, điểm đón và điểm trả đi.

### Expected Agent Response

Một người đi Hà Nội–Nghệ An ngày 22/07/2026, chuyến 21:30 giường nằm 34 chỗ, ghế B03; đón Văn phòng Hà Nội, trả Bến xe Vinh. Người đặt Nguyễn Đức Hiếu, số 0912000025, trả tiền mặt khi lên xe và chưa thanh toán, tổng 350.000 đồng.

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

Anh xác nhận toàn bộ thông tin cuối là đúng, gồm B03 và Văn phòng Hà Nội.

### Expected Agent Response

Em đã chốt đúng bản anh vừa xác nhận. Anh nói “đặt vé” là em phát hành ngay.

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

Đặt vé ngay giúp anh và đọc mã chậm một lần.

### Expected Agent Response

Vé mã VA-CASE_025 đã được xác nhận; tiền vé sẽ được thanh toán khi anh lên xe.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260722-2130-GN34","customer_name":"Nguyễn Đức Hiếu","customer_phone":"0912000025"},"expected_result":{"booking_id":"VA-CASE_025","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_025","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","departure_time":"21:30","trip_id":"HN-NA-20260722-2130-GN34","passenger_count":1,"vehicle_type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước","assigned_seats":["B03"],"pickup_location":"Văn phòng Hà Nội","dropoff_location":"Bến xe Vinh","customer_name":"Nguyễn Đức Hiếu","customer_phone":"0912000025","passenger_details":[{"name":"Nguyễn Đức Hiếu","type":"ADULT","seat":"B03"}],"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING","booking_id":"VA-CASE_025","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Nguyễn Đức Hiếu","phone":"0912000025"},"passengers":{"count":1,"details":[{"name":"Nguyễn Đức Hiếu","type":"ADULT","seat":"B03"}]},"trip":{"trip_id":"HN-NA-20260722-2130-GN34","origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-22","departure_time":"21:30","arrival_time":"02:30"},"vehicle":{"type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước","assigned_seats":["B03"]},"pickup_dropoff":{"pickup_location":"Văn phòng Hà Nội","dropoff_location":"Bến xe Vinh"},"payment":{"method":"CASH_ON_BOARDING","status":"PENDING","unit_fare_vnd":350000,"total_fare_vnd":350000},"booking":{"booking_id":"VA-CASE_025","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":15}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_025
- Khách hàng: Nguyễn Đức Hiếu
- Số điện thoại: 0912000025
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-22 21:30
- Loại xe: Giường nằm 34 chỗ
- Ghế: B03
- Điểm đón: Văn phòng Hà Nội
- Điểm trả: Bến xe Vinh
- Số hành khách: 1
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Không tự hoàn thành điểm đến bị cắt hoặc chọn giữa hai số điện thoại mâu thuẫn; phải yêu cầu khách nói lại.
- Nhãn telephone/clipping chỉ mô tả kịch bản text-only, không được dùng để tuyên bố đo chất lượng 8 kHz.
- Dùng gợi nghĩa “hiếu thảo” để giữ đúng dấu trong Nguyễn Đức Hiếu và chốt đúng số 0912000025.
- Chỉ gọi `CONFIRM_BOOKING` sau xác nhận toàn bộ ở lượt 15.
