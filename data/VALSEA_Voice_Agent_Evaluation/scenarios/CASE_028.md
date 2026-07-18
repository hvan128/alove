# CASE_028 — Nghệ An code-switch caller changes date and upgrades after confirmation

## 1. Scenario Metadata

- Scenario type: extreme
- Customer region: Nghệ An
- Audio condition: simulated telephone clipping in text metadata; no acoustic result claimed
- Languages: Vietnamese, English
- Difficulty: extreme
- Call datetime: 2026-07-18T16:25:00+07:00
- Coverage tags: regional_language, code_switch, telephone, changed_mind

## 2. Customer Persona

- Age: 33
- Location: Thành phố Vinh
- Speaking style: dùng tự nhiên mô, rứa, ni cùng các từ book, ticket, upgrade và VIP cabin
- Calling context: ban đầu xác nhận chuyến thường ngày 21, sau đó đổi sang ngày 22 và xe VIP nên phải tìm và xác nhận lại

## 3. Conversation

## Turn 1

### Customer

Alo em, anh muốn book hai ticket từ Nghệ An ra Hà Nội ngày 21 tháng 7, chuyến mô đi muộn một chút ấy.

### Expected Agent Response

Em chào anh. Em ghi nhận Nghệ An đi Hà Nội ngày 21/07/2026 cho hai người và sẽ tra các chuyến tối còn đủ chỗ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-21","passenger_count":2},"clear":[]}
```

## Turn 2

### Customer

Check schedule giúp anh, miễn còn hai ghế nằm cạnh nhau là được.

### Expected Agent Response

Ngày 21 có chuyến 20:30 Limousine 21 Phòng VIP giá 530.000 đồng và chuyến 22:15 giường nằm 38 chỗ giá 340.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-21","passenger_count":2},"expected_result":{"trip_ids":["NA-HN-20260721-2030-VIP21","NA-HN-20260721-2215-GN38"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Chọn chuyến 22:15 giường nằm 38 chỗ, đi muộn rứa hợp việc anh hơn.

### Expected Agent Response

Em chọn chuyến NA-HN-20260721-2215-GN38 lúc 22:15, đến 03:15. Anh muốn vị trí ghế thế nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"NA-HN-20260721-2215-GN38","departure_time":"22:15","vehicle_type":"Giường nằm 38 chỗ"},"clear":[]}
```

## Turn 4

### Customer

Giữ B01 với B02 tầng dưới phía trước, hai ghế ni nằm liền nhau phải không?

### Expected Agent Response

Đúng, B01 và B02 là hai giường tầng dưới phía trước liền nhau và đều còn. Tổng ban đầu là 680.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"NA-HN-20260721-2215-GN38","passenger_count":2,"seat_preference":"Tầng dưới, phía trước, liền nhau"},"expected_result":{"assigned_seats":["B01","B02"],"unit_fare_vnd":340000,"total_fare_vnd":680000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước, liền nhau","assigned_seats":["B01","B02"]},"clear":[]}
```

## Turn 5

### Customer

Pickup ở Quảng trường Hồ Chí Minh, anh ở gần đó.

### Expected Agent Response

Em ghi nhận Quảng trường Hồ Chí Minh. Anh muốn xuống điểm mô tại Hà Nội?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Quảng trường Hồ Chí Minh"},"clear":[]}
```

## Turn 6

### Customer

Xuống Bến xe Mỹ Đình, khỏi trung chuyển chi thêm.

### Expected Agent Response

Em ghi điểm trả Bến xe Mỹ Đình. Anh cho tên hai hành khách theo B01 và B02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe Mỹ Đình"},"clear":[]}
```

## Turn 7

### Customer

B01 Nguyễn Văn Hòa, B02 Hồ Thị Mai, cả hai người lớn.

### Expected Agent Response

Em ghi Nguyễn Văn Hòa ghế B01 và Hồ Thị Mai ghế B02. Ai đứng tên đặt vé ạ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Nguyễn Văn Hòa","type":"ADULT","seat":"B01"},{"name":"Hồ Thị Mai","type":"ADULT","seat":"B02"}]},"clear":[]}
```

## Turn 8

### Customer

Anh Hòa đứng tên, Nguyễn Văn Hòa.

### Expected Agent Response

Em ghi người đặt Nguyễn Văn Hòa. Anh đọc số điện thoại đủ mười chữ số nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Nguyễn Văn Hòa"},"clear":[]}
```

## Turn 9

### Customer

Số anh 0914... alo, đường truyền cắt mất đoạn... 028, em nghe đủ chưa?

### Expected Agent Response

Em chưa nghe đủ mười chữ số nên chưa lưu. Anh đọc lại từng nhóm số giúp em.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CLARIFY_AMBIGUITY","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 10

### Customer

Không chín một bốn, không không không, không không hai tám: 0914000028.

### Expected Agent Response

Em xác nhận 0914000028. Anh muốn thanh toán QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0914000028"},"clear":[]}
```

## Turn 11

### Customer

Tiền mặt khi lên xe cho tiện, giờ anh chưa trả tiền mô em.

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

## Turn 12

### Customer

Em recap booking ngày 21 cho anh nghe trước khi confirm.

### Expected Agent Response

Hai người đi Nghệ An–Hà Nội ngày 21/07/2026, chuyến 22:15 giường nằm 38 chỗ, B01–B02; đón Quảng trường Hồ Chí Minh, trả Bến xe Mỹ Đình. Người đặt Nguyễn Văn Hòa, số 0914000028, trả tiền mặt khi lên xe và chưa thanh toán, tổng 680.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 13

### Customer

Anh confirm đúng booking ngày 21, chuyến 22:15 và hai ghế đó.

### Expected Agent Response

Bản ngày 21 đã được anh xác nhận nhưng em chưa xuất vé. Nếu anh còn cân nhắc ngày đi hoặc loại xe thì mình chỉnh ngay lúc này.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 14

### Customer

Khoan, anh đổi ý. Change sang ngày 22 ni và upgrade lên VIP cabin; tìm chuyến VIP cho hai người giúp anh.

### Expected Agent Response

Em bỏ phần xác nhận cùng chuyến và ghế cũ để tìm lại theo ngày mới. Ngày 22 có chuyến 20:30 Limousine 21 Phòng VIP, còn đủ hai chỗ, giá 530.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-22","passenger_count":2},"expected_result":{"trip_ids":["NA-HN-20260722-2030-VIP21"]}}
```

### Expected Internal State Update

```json
{"set":{"travel_date":"2026-07-22"},"clear":["departure_time","trip_id","vehicle_type","seat_preference","assigned_seats","passenger_details","explicit_confirmation"]}
```

## Turn 15

### Customer

Chọn VIP cabin 20:30 đó, đến Hà Nội 01:30 đúng không?

### Expected Agent Response

Đúng ạ. Em chọn NA-HN-20260722-2030-VIP21 lúc 20:30, đến 01:30. Anh cần chọn lại phòng vì ghế cũ đã được xóa.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference","passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"NA-HN-20260722-2030-VIP21","departure_time":"20:30","vehicle_type":"Limousine 21 Phòng VIP"},"clear":[]}
```

## Turn 16

### Customer

Giữ A01 với A02 lower cabin phía trước, rồi gán lại Hòa A01, Mai A02.

### Expected Agent Response

Em giữ A01–A02, hai phòng tầng dưới phía trước liền nhau; Nguyễn Văn Hòa ghế A01, Hồ Thị Mai ghế A02. Tổng mới 1.060.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"NA-HN-20260722-2030-VIP21","passenger_count":2,"seat_preference":"Phòng tầng dưới, phía trước, liền nhau"},"expected_result":{"assigned_seats":["A01","A02"],"unit_fare_vnd":530000,"total_fare_vnd":1060000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Phòng tầng dưới, phía trước, liền nhau","assigned_seats":["A01","A02"],"passenger_details":[{"name":"Nguyễn Văn Hòa","type":"ADULT","seat":"A01"},{"name":"Hồ Thị Mai","type":"ADULT","seat":"A02"}]},"clear":[]}
```

## Turn 17

### Customer

Đổi rứa có đúng chính sách đổi vé không, và chênh tổng bao nhiêu? Em đọc bản cuối luôn.

### Expected Agent Response

Khách được đổi trước giờ xe chạy nếu còn chỗ và chấp nhận chênh lệch. Tổng mới 1.060.000 đồng, cao hơn lựa chọn cũ 380.000 đồng. Bản cuối: ngày 22/07, chuyến VIP 20:30, A01–A02; các thông tin đón/trả, tên, số điện thoại và tiền mặt giữ nguyên. Anh cần xác nhận lại vì lần xác nhận cũ không còn hiệu lực.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 18

### Customer

Anh xác nhận final ngày 22, VIP 20:30, A01–A02, tổng 1.060.000 đồng và mọi thông tin còn lại đúng.

### Expected Agent Response

Em đã chốt bản ngày 22 thay cho lựa chọn ngày 21. Anh yêu cầu xuất vé là em hoàn tất ngay.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 19

### Customer

Đúng rồi, book cái vé cuối ni và đọc mã cho anh.

### Expected Agent Response

Vé cuối mã VA-CASE_028 đã được xác nhận; tiền vé sẽ được thanh toán khi anh lên xe.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"NA-HN-20260722-2030-VIP21","customer_name":"Nguyễn Văn Hòa","customer_phone":"0914000028"},"expected_result":{"booking_id":"VA-CASE_028","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_028","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-22","departure_time":"20:30","trip_id":"NA-HN-20260722-2030-VIP21","passenger_count":2,"vehicle_type":"Limousine 21 Phòng VIP","seat_preference":"Phòng tầng dưới, phía trước, liền nhau","assigned_seats":["A01","A02"],"pickup_location":"Quảng trường Hồ Chí Minh","dropoff_location":"Bến xe Mỹ Đình","customer_name":"Nguyễn Văn Hòa","customer_phone":"0914000028","passenger_details":[{"name":"Nguyễn Văn Hòa","type":"ADULT","seat":"A01"},{"name":"Hồ Thị Mai","type":"ADULT","seat":"A02"}],"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING","booking_id":"VA-CASE_028","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Nguyễn Văn Hòa","phone":"0914000028"},"passengers":{"count":2,"details":[{"name":"Nguyễn Văn Hòa","type":"ADULT","seat":"A01"},{"name":"Hồ Thị Mai","type":"ADULT","seat":"A02"}]},"trip":{"trip_id":"NA-HN-20260722-2030-VIP21","origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-22","departure_time":"20:30","arrival_time":"01:30"},"vehicle":{"type":"Limousine 21 Phòng VIP","seat_preference":"Phòng tầng dưới, phía trước, liền nhau","assigned_seats":["A01","A02"]},"pickup_dropoff":{"pickup_location":"Quảng trường Hồ Chí Minh","dropoff_location":"Bến xe Mỹ Đình"},"payment":{"method":"CASH_ON_BOARDING","status":"PENDING","unit_fare_vnd":530000,"total_fare_vnd":1060000},"booking":{"booking_id":"VA-CASE_028","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":18}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_028
- Khách hàng: Nguyễn Văn Hòa
- Số điện thoại: 0914000028
- Tuyến: Nghệ An → Hà Nội
- Khởi hành: 2026-07-22 20:30
- Loại xe: Limousine 21 Phòng VIP
- Ghế: A01, A02
- Điểm đón: Quảng trường Hồ Chí Minh
- Điểm trả: Bến xe Mỹ Đình
- Số hành khách: 2
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu đúng mô/rứa/ni/chi và các từ code-switch trong cùng một người gọi.
- Sau đổi ngày/xe ở lượt 14 phải xóa trip, ghế, passenger-seat mapping và xác nhận cũ rồi tìm/giữ lại.
- Không dùng xác nhận lượt 13 để đặt cấu hình mới; xác nhận có hiệu lực cuối là lượt 18.
- Ground giá mới, chênh lệch, xe VIP, A01–A02 và change policy; không tuyên bố khả năng chống clipping thực.
