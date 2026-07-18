# CASE_009 — Chuyến 22 giờ thiếu cặp ghế dưới liền nhau, khách chọn 23 giờ 30

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Sài Gòn
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-19T15:30:00+07:00

## 2. Customer Persona

Age: 27
Location: Quận 3, Sài Gòn
Speaking style: Gấp gáp vì đặt trong ngày nhưng vẫn đòi cặp ghế tầng dưới liền nhau.
Calling context: Cần hai vé đi Đà Lạt ngay tối 19/07; chuyến 22:00 còn ghế nhưng không đáp ứng cặp ghế yêu cầu.

## 3. Conversation

## Turn 1

### Customer

Alo em, anh cần gấp hai vé Sài Gòn lên Đà Lạt tối nay, còn chuyến không?

### Expected Agent Response

Em chào anh. Em ghi nhận 2 hành khách, Sài Gòn đi Đà Lạt hôm nay 19/07/2026. Anh muốn khoảng mấy giờ và có yêu cầu ghế không?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time","seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-19","passenger_count":2},"clear":[]}
```

## Turn 2

### Customer

Anh muốn chuyến 22:00, bắt buộc hai ghế tầng dưới liền nhau vì đi với mẹ.

### Expected Agent Response

Em sẽ kiểm tra cả số ghế còn và quan hệ liền nhau, không chỉ kiểm tra tổng số chỗ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-19","passenger_count":2},"expected_result":{"trip_ids":["SG-DL-20260719-2200-GN34","SG-DL-20260719-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai ghế tầng dưới liền nhau"},"clear":[]}
```

## Turn 3

### Customer

Kết quả chuyến 22:00 thế nào em?

### Expected Agent Response

Chuyến 22:00 vẫn còn ghế. Tuy nhiên hai ghế tầng dưới còn lại là B01 và D01, ở hai vùng khác nhau và không liền nhau, nên không đáp ứng đúng yêu cầu của anh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"PRESENT_TRIP_OPTIONS","missing_fields":["trip_id"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

Vậy không phải cả chuyến bán hết đúng không?

### Expected Agent Response

Đúng anh, chuyến 22:00 chưa hết chỗ; chỉ không còn cặp ghế tầng dưới liền nhau. Các ghế đơn khác vẫn còn.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["trip_id"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 5

### Customer

Có chuyến nào sau đó còn đúng một cặp tầng dưới liền nhau không?

### Expected Agent Response

Chuyến Limousine 22 Phòng lúc 23:30 còn P01 và P02, cùng tầng dưới phía trước và liền nhau; giá 450.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"PRESENT_TRIP_OPTIONS","missing_fields":["trip_id"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 6

### Customer

Chọn chuyến 23:30 đó cho anh, miễn đúng cặp P01 P02.

### Expected Agent Response

Dạ, em chọn Limousine 22 Phòng lúc 23:30, đến 07:00 sáng hôm sau.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"23:30","trip_id":"SG-DL-20260719-2330-LIMO","vehicle_type":"Limousine 22 Phòng"},"clear":[]}
```

## Turn 7

### Customer

Giữ chỗ P01 với P02 ngay giúp anh.

### Expected Agent Response

Em đã giữ P01 và P02, đúng cặp phòng tầng dưới liền nhau; tổng 900.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260719-2330-LIMO","passenger_count":2,"seat_preference":"Hai ghế tầng dưới liền nhau"},"expected_result":{"assigned_seats":["P01","P02"],"unit_fare_vnd":450000,"total_fare_vnd":900000}}
```

### Expected Internal State Update

```json
{"set":{"assigned_seats":["P01","P02"]},"clear":[]}
```

## Turn 8

### Customer

Anh là Phan Minh Quân P01, mẹ anh Nguyễn Thị Lý P02, mẹ là người cao tuổi.

### Expected Agent Response

Em đã ghi anh Phan Minh Quân là người lớn, ghế P01; cô Nguyễn Thị Lý là người cao tuổi, ghế P02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Phan Minh Quân","passenger_details":[{"name":"Phan Minh Quân","type":"ADULT","seat":"P01"},{"name":"Nguyễn Thị Lý","type":"SENIOR","seat":"P02"}]},"clear":[]}
```

## Turn 9

### Customer

Hai mẹ con đón ở Bến xe Miền Đông mới.

### Expected Agent Response

Dạ, em chọn Bến xe Miền Đông mới; anh chị cần có mặt trước 23:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Miền Đông mới"},"clear":[]}
```

## Turn 10

### Customer

Xuống Văn phòng Đà Lạt nhé.

### Expected Agent Response

Em đã chọn Văn phòng Đà Lạt làm điểm trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Văn phòng Đà Lạt"},"clear":[]}
```

## Turn 11

### Customer

Số anh Quân là 0901122339.

### Expected Agent Response

Dạ, em ghi người đặt Phan Minh Quân, số 0901122339.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0901122339"},"clear":[]}
```

## Turn 12

### Customer

Anh trả tiền mặt lúc lên xe vì đặt gấp.

### Expected Agent Response

Em ghi anh sẽ trả tiền mặt khi lên xe; khoản này đang chờ thanh toán.

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

Tổng chín trăm nghìn và tới bảy giờ sáng phải không?

### Expected Agent Response

Đúng anh, tổng 900.000 đồng và giờ đến là 07:00.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 14

### Customer

Em nhắc lại tại sao mình bỏ chuyến 22:00 để anh nói với mẹ.

### Expected Agent Response

Chuyến 22:00 còn ghế nhưng B01 và D01 không liền nhau. Phương án cuối chuyển sang 23:30 vì P01, P02 là cặp tầng dưới liền nhau.

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

Đọc chậm từng người với từng phòng trong phương án 23:30 cho mẹ anh cùng nghe nhé.

### Expected Agent Response

Anh Phan Minh Quân ở phòng P01, cô Nguyễn Thị Lý ở phòng P02; số liên hệ 0901122339. Hai người đi Sài Gòn–Đà Lạt ngày 19/07 lúc 23:30, Limousine 22 Phòng; đón Bến xe Miền Đông mới, trả Văn phòng Đà Lạt; trả tiền mặt khi lên xe; tổng 900.000 đồng.

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

Mẹ anh đã nghe rõ P01 với P02; anh đồng ý chốt chuyến 23:30 này.

### Expected Agent Response

Dạ, em đã ghi nhận anh đồng ý với cặp phòng và chuyến thay thế.

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

Giữ đúng cặp P01–P02 và đọc mã cho anh.

### Expected Agent Response

Dạ, vé đã được xác nhận với mã VA-CASE_009.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260719-2330-LIMO","customer_name":"Phan Minh Quân","customer_phone":"0901122339"},"expected_result":{"booking_id":"VA-CASE_009","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_009","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Sài Gòn",
  "destination": "Đà Lạt",
  "travel_date": "2026-07-19",
  "departure_time": "23:30",
  "trip_id": "SG-DL-20260719-2330-LIMO",
  "passenger_count": 2,
  "vehicle_type": "Limousine 22 Phòng",
  "seat_preference": "Hai ghế tầng dưới liền nhau",
  "assigned_seats": [
    "P01",
    "P02"
  ],
  "pickup_location": "Bến xe Miền Đông mới",
  "dropoff_location": "Văn phòng Đà Lạt",
  "customer_name": "Phan Minh Quân",
  "customer_phone": "0901122339",
  "passenger_details": [
    {
      "name": "Phan Minh Quân",
      "type": "ADULT",
      "seat": "P01"
    },
    {
      "name": "Nguyễn Thị Lý",
      "type": "SENIOR",
      "seat": "P02"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_009",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Phan Minh Quân",
    "phone": "0901122339"
  },
  "passengers": {
    "count": 2,
    "details": [
      {
        "name": "Phan Minh Quân",
        "type": "ADULT",
        "seat": "P01"
      },
      {
        "name": "Nguyễn Thị Lý",
        "type": "SENIOR",
        "seat": "P02"
      }
    ]
  },
  "trip": {
    "trip_id": "SG-DL-20260719-2330-LIMO",
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-19",
    "departure_time": "23:30",
    "arrival_time": "07:00"
  },
  "vehicle": {
    "type": "Limousine 22 Phòng",
    "seat_preference": "Hai ghế tầng dưới liền nhau",
    "assigned_seats": [
      "P01",
      "P02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Bến xe Miền Đông mới",
    "dropoff_location": "Văn phòng Đà Lạt"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 450000,
    "total_fare_vnd": 900000
  },
  "booking": {
    "booking_id": "VA-CASE_009",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 16
  }
}
```

## 6. Final Ticket

VÉ XE KHÁCH
Mã vé: VA-CASE_009
Khách hàng: Phan Minh Quân
Số điện thoại: 0901122339
Tuyến: Sài Gòn → Đà Lạt
Khởi hành: 2026-07-19 23:30
Loại xe: Limousine 22 Phòng
Ghế: P01, P02
Điểm đón: Bến xe Miền Đông mới
Điểm trả: Văn phòng Đà Lạt
Số hành khách: 2
Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Phân biệt chính xác chuyến 22:00 còn ghế với việc không còn cặp lower-adjacent.
- Chỉ đề xuất chuyến 23:30 sau khi đối chiếu P01–P02 có thật và liền nhau.
- Ticket cuối tuyệt đối không mô tả chuyến 22:00 là sold out.
