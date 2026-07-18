# CASE_021 — Book two tickets bằng Vietnamese–English code switching

## 1. Scenario Metadata

- Scenario type: code_switching
- Customer region: Sài Gòn
- Audio condition: clean mobile call (text-only benchmark)
- Languages: Vietnamese, English
- Difficulty: hard
- Call datetime: 2026-07-18T12:15:00+07:00
- Coverage tags: code_switch, booking_confirmation

## 2. Customer Persona

- Age: 31
- Location: Quận 1, Sài Gòn
- Speaking style: nhân viên văn phòng chuyển tự nhiên giữa tiếng Việt và thuật ngữ đặt vé tiếng Anh
- Calling context: gọi trong giờ nghỉ để đặt hai vé đi Đà Lạt cùng đồng nghiệp

## 3. Conversation

## Turn 1

### Customer

Alo em, anh muốn book two tickets từ Sài Gòn lên Đà Lạt, em check giúp anh với.

### Expected Agent Response

Em chào anh. Em đã ghi nhận tuyến Sài Gòn đi Đà Lạt cho hai người; anh muốn đi ngày nào ạ?

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

Ngày 21 tháng 7 nhé, check schedule quanh mười giờ tối, trễ hơn chút cũng được.

### Expected Agent Response

Ngày 21 tháng 7 có chuyến 22:00 giường nằm 34 chỗ giá 320.000 đồng một người và chuyến 23:30 Limousine 22 Phòng giá 450.000 đồng một người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-21","passenger_count":2},"expected_result":{"trip_ids":["SG-DL-20260721-2200-GN34","SG-DL-20260721-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{"travel_date":"2026-07-21"},"clear":[]}
```

## Turn 3

### Customer

Hai loại xe đó khác nhau sao em, anh chỉ cần nằm ngủ được chứ không nhất thiết phòng riêng.

### Expected Agent Response

Chuyến 22:00 là giường nằm 34 chỗ, còn chuyến 23:30 là Limousine 22 Phòng. Nếu anh không cần phòng riêng thì chuyến 22:00 phù hợp và tiết kiệm hơn.

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

Vậy lấy chuyến 22:00, loại giường nằm 34 chỗ cho anh.

### Expected Agent Response

Em chọn chuyến 22:00, đến Đà Lạt lúc 05:30. Anh muốn vị trí giường thế nào ạ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"trip_id":"SG-DL-20260721-2200-GN34","departure_time":"22:00","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 5

### Customer

Cho anh hai ticket tầng dưới, nằm liền nhau phía trước nếu còn.

### Expected Agent Response

Còn hai giường tầng dưới phía trước liền nhau B01 và B02. Tổng hai vé là 640.000 đồng; em giữ đúng hai chỗ này cho anh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":["pickup_location","dropoff_location"],"arguments":{"trip_id":"SG-DL-20260721-2200-GN34","passenger_count":2,"seat_preference":"Tầng dưới, phía trước, liền nhau"},"expected_result":{"assigned_seats":["B01","B02"],"unit_fare_vnd":320000,"total_fare_vnd":640000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước, liền nhau","assigned_seats":["B01","B02"]},"clear":[]}
```

## Turn 6

### Customer

Pickup ở Văn phòng Phạm Ngũ Lão nha, chỗ đó anh tiện chạy qua.

### Expected Agent Response

Em ghi nhận điểm đón Văn phòng Phạm Ngũ Lão. Anh muốn xuống ở điểm trả nào tại Đà Lạt?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Văn phòng Phạm Ngũ Lão"},"clear":[]}
```

## Turn 7

### Customer

Tụi anh xuống Chợ Đà Lạt, không cần trung chuyển thêm đâu.

### Expected Agent Response

Em ghi nhận điểm trả Chợ Đà Lạt. Anh cho em tên hai hành khách theo thứ tự ghế B01 và B02 nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Chợ Đà Lạt"},"clear":[]}
```

## Turn 8

### Customer

B01 là Trần Minh Khoa, B02 là Lê Bảo Anh, cả hai đều người lớn.

### Expected Agent Response

Em đã ghi nhận Trần Minh Khoa ghế B01 và Lê Bảo Anh ghế B02. Người đứng tên đặt vé là ai ạ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_name"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"passenger_details":[{"name":"Trần Minh Khoa","type":"ADULT","seat":"B01"},{"name":"Lê Bảo Anh","type":"ADULT","seat":"B02"}]},"clear":[]}
```

## Turn 9

### Customer

Anh Khoa đứng tên luôn, đầy đủ là Trần Minh Khoa.

### Expected Agent Response

Vâng, người đặt vé là Trần Minh Khoa. Anh đọc giúp em số điện thoại liên hệ đủ mười chữ số.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Trần Minh Khoa"},"clear":[]}
```

## Turn 10

### Customer

Số anh là 0901000021, em đọc lại giùm cho chắc.

### Expected Agent Response

Em ghi nhận 0901000021. Anh muốn thanh toán bằng QR, chuyển khoản hay tiền mặt khi lên xe?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0901000021"},"clear":[]}
```

## Turn 11

### Customer

Anh chọn QR, nhưng chưa quét bây giờ thì giao dịch vẫn chưa thanh toán, đúng không?

### Expected Agent Response

Đúng ạ. Em ghi nhận thanh toán QR; chỉ khi có xác nhận giao dịch thành công em mới báo đã thanh toán.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PENDING"},"clear":[]}
```

## Turn 12

### Customer

À cho anh hỏi lại: pickup mình chốt là Văn phòng Phạm Ngũ Lão, còn hai ticket vẫn là B01 với B02 đúng không em?

### Expected Agent Response

Đúng anh: pickup là Văn phòng Phạm Ngũ Lão, hai ticket là B01 và B02 trên chuyến Sài Gòn đi Đà Lạt lúc 22:00.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 13

### Customer

Recap toàn bộ booking giúp anh trước khi anh confirm.

### Expected Agent Response

Hai người đi Sài Gòn–Đà Lạt ngày 21/07/2026, chuyến 22:00 giường nằm 34 chỗ, ghế B01 và B02; đón tại Văn phòng Phạm Ngũ Lão, trả tại Chợ Đà Lạt. Người đặt Trần Minh Khoa, số 0901000021, thanh toán QR chưa hoàn tất, tổng 640.000 đồng.

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

Cho anh kiểm tra lại: B01 là Khoa, B02 là Bảo Anh và điểm trả đúng Chợ Đà Lạt phải không?

### Expected Agent Response

Đúng ạ: B01 là Trần Minh Khoa, B02 là Lê Bảo Anh và điểm trả là Chợ Đà Lạt. Em chưa tạo booking cho tới khi anh xác nhận rõ toàn bộ.

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

Anh confirm toàn bộ thông tin em vừa đọc là đúng, giữ đúng chuyến và hai ghế đó.

### Expected Agent Response

Thông tin cuối đã được anh xác nhận đầy đủ. Nếu anh muốn xuất vé ngay, anh nói em tiến hành nhé.

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

Đúng rồi, book ngay và xuất mã vé cho anh nhé.

### Expected Agent Response

Đặt vé đã hoàn tất với mã VA-CASE_021 và vé đã được xác nhận. Thanh toán QR vẫn chưa thực hiện và chỉ hoàn tất khi giao dịch được xác nhận.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260721-2200-GN34","customer_name":"Trần Minh Khoa","customer_phone":"0901000021"},"expected_result":{"booking_id":"VA-CASE_021","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_021","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-21","departure_time":"22:00","trip_id":"SG-DL-20260721-2200-GN34","passenger_count":2,"vehicle_type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước, liền nhau","assigned_seats":["B01","B02"],"pickup_location":"Văn phòng Phạm Ngũ Lão","dropoff_location":"Chợ Đà Lạt","customer_name":"Trần Minh Khoa","customer_phone":"0901000021","passenger_details":[{"name":"Trần Minh Khoa","type":"ADULT","seat":"B01"},{"name":"Lê Bảo Anh","type":"ADULT","seat":"B02"}],"payment_method":"QR","payment_status":"PENDING","booking_id":"VA-CASE_021","booking_status":"CONFIRMED","explicit_confirmation":true}
```

## 5. Final Workflow Output

```json
{"customer":{"name":"Trần Minh Khoa","phone":"0901000021"},"passengers":{"count":2,"details":[{"name":"Trần Minh Khoa","type":"ADULT","seat":"B01"},{"name":"Lê Bảo Anh","type":"ADULT","seat":"B02"}]},"trip":{"trip_id":"SG-DL-20260721-2200-GN34","origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-21","departure_time":"22:00","arrival_time":"05:30"},"vehicle":{"type":"Giường nằm 34 chỗ","seat_preference":"Tầng dưới, phía trước, liền nhau","assigned_seats":["B01","B02"]},"pickup_dropoff":{"pickup_location":"Văn phòng Phạm Ngũ Lão","dropoff_location":"Chợ Đà Lạt"},"payment":{"method":"QR","status":"PENDING","unit_fare_vnd":320000,"total_fare_vnd":640000},"booking":{"booking_id":"VA-CASE_021","booking_status":"CONFIRMED"},"outcome":{"completed_goal":true,"confirmation_turn":15}}
```

## 6. Final Ticket

VÉ XE KHÁCH

- Mã vé: VA-CASE_021
- Khách hàng: Trần Minh Khoa
- Số điện thoại: 0901000021
- Tuyến: Sài Gòn → Đà Lạt
- Khởi hành: 2026-07-21 22:00
- Loại xe: Giường nằm 34 chỗ
- Ghế: B01, B02
- Điểm đón: Văn phòng Phạm Ngũ Lão
- Điểm trả: Chợ Đà Lạt
- Số hành khách: 2
- Thanh toán: QR | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Giữ nguyên và hiểu đúng `book`, `ticket`, `schedule`, `pickup`, `confirm` trong lời khách.
- Không tạo booking trước lượt xác nhận rõ ràng số 15.
- Trip, ghế, điểm đón/trả và giá phải khớp catalog; QR không được ghi PAID khi chưa có bằng chứng.
- Mã vé và ticket cuối phải khớp hoàn toàn workflow object.
