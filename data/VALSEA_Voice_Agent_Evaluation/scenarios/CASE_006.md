# CASE_006 — Cặp đôi đổi sang tiền mặt sau chuyển khoản thất bại

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Sài Gòn
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-18T17:35:00+07:00

## 2. Customer Persona

Age: 34
Location: Bình Thạnh, Sài Gòn
Speaking style: Thân thiện, dùng khẩu ngữ miền Nam và báo ngay khi giao dịch lỗi.
Calling context: Đặt hai phòng đi Đà Lạt đêm 20/07; chuyển khoản không thành công nên đổi tiền mặt.

## 3. Conversation

## Turn 1

### Customer

Alo em, anh với vợ muốn đặt hai vé Sài Gòn lên Đà Lạt đêm ngày 20.

### Expected Agent Response

Em chào anh. Em ghi nhận Sài Gòn đi Đà Lạt ngày 20/07/2026, 2 hành khách. Anh muốn giờ nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-20","passenger_count":2},"clear":[]}
```

## Turn 2

### Customer

Chuyến trễ nhất còn phòng là mấy giờ vậy?

### Expected Agent Response

Có chuyến giường nằm 22:00 và Limousine 22 Phòng lúc 23:30; cả hai còn đủ 2 chỗ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-20","passenger_count":2},"expected_result":{"trip_ids":["SG-DL-20260720-2200-GN34","SG-DL-20260720-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Lấy chuyến 23:30 limousine cho anh, sáng tới lúc nào?

### Expected Agent Response

Chuyến 23:30 đến Đà Lạt lúc 07:00, đơn giá 450.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"23:30","trip_id":"SG-DL-20260720-2330-LIMO","vehicle_type":"Limousine 22 Phòng"},"clear":[]}
```

## Turn 4

### Customer

Còn hai phòng tầng dưới liền nhau thì chọn giùm anh.

### Expected Agent Response

Còn P01 và P02, cùng tầng dưới phía trước và liền nhau.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"PRESENT_TRIP_OPTIONS","missing_fields":["assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai phòng tầng dưới liền nhau"},"clear":[]}
```

## Turn 5

### Customer

Giữ P01, P02 luôn nha em.

### Expected Agent Response

Em đã giữ P01 và P02; tổng 900.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260720-2330-LIMO","passenger_count":2,"seat_preference":"Hai phòng tầng dưới liền nhau"},"expected_result":{"assigned_seats":["P01","P02"],"unit_fare_vnd":450000,"total_fare_vnd":900000}}
```

### Expected Internal State Update

```json
{"set":{"assigned_seats":["P01","P02"]},"clear":[]}
```

## Turn 6

### Customer

Tên anh Bùi Đức Long ghế P01, vợ anh Trương Ngọc Lan ghế P02.

### Expected Agent Response

Em đã ghi hai hành khách người lớn: Bùi Đức Long P01 và Trương Ngọc Lan P02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Bùi Đức Long","passenger_details":[{"name":"Bùi Đức Long","type":"ADULT","seat":"P01"},{"name":"Trương Ngọc Lan","type":"ADULT","seat":"P02"}]},"clear":[]}
```

## Turn 7

### Customer

Tụi anh đón ở Văn phòng Phạm Ngũ Lão nghen.

### Expected Agent Response

Dạ, em chọn Văn phòng Phạm Ngũ Lão; anh chị cần có mặt trước 23:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Văn phòng Phạm Ngũ Lão"},"clear":[]}
```

## Turn 8

### Customer

Xuống Chợ Đà Lạt luôn cho tiện lấy phòng.

### Expected Agent Response

Em đã chọn Chợ Đà Lạt làm điểm trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Chợ Đà Lạt"},"clear":[]}
```

## Turn 9

### Customer

Số liên hệ anh là 0967890126.

### Expected Agent Response

Dạ, em ghi người đặt Bùi Đức Long, số 0967890126.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0967890126"},"clear":[]}
```

## Turn 10

### Customer

Anh chọn chuyển khoản ngân hàng, trước mắt để chờ thanh toán nha.

### Expected Agent Response

Em ghi anh chọn chuyển khoản ngân hàng; khoản thanh toán đang chờ kết quả và chỉ được coi là đã trả khi giao dịch thành công.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"BANK_TRANSFER","payment_status":"PENDING"},"clear":[]}
```

## Turn 11

### Customer

Anh vừa thử mà ứng dụng báo giao dịch thất bại rồi, em đừng ghi là đã trả tiền.

### Expected Agent Response

Dạ, em đã bỏ phương thức chuyển khoản khỏi yêu cầu và đưa phần thanh toán về trạng thái chưa bắt đầu để anh chọn lại.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_status":"NOT_STARTED"},"clear":["payment_method"]}
```

## Turn 12

### Customer

Giờ có thể đổi qua cách nào để vẫn giữ chỗ hai phòng?

### Expected Agent Response

Anh có thể chọn QR, chuyển khoản lại hoặc trả tiền mặt khi lên xe. Hai phòng vẫn đang được giữ; anh chọn cách thay thế nhé.

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

Đổi hẳn sang tiền mặt lúc lên xe đi em.

### Expected Agent Response

Dạ, em đổi sang trả tiền mặt khi lên xe; khoản thanh toán sẽ chờ đến lúc anh lên xe.

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

Tổng cuối vẫn chín trăm nghìn, không phát sinh do đổi cách trả chứ?

### Expected Agent Response

Đúng anh, 2 người nhân 450.000 đồng là 900.000 đồng; đổi phương thức không làm đổi giá.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 15

### Customer

Đọc bản cuối sau sự cố chuyển khoản, nhớ nói rõ cách trả tiền mới giúp anh.

### Expected Agent Response

Anh Bùi Đức Long P01 và chị Trương Ngọc Lan P02, số liên hệ 0967890126; đi Sài Gòn–Đà Lạt ngày 20/07 lúc 23:30, đón Văn phòng Phạm Ngũ Lão, trả Chợ Đà Lạt; trả tiền mặt khi lên xe; tổng 900.000 đồng. Phương thức chuyển khoản cũ đã được bỏ.

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

Anh chọn đúng bản sau cùng này và đồng ý trả tiền mặt lúc lên xe.

### Expected Agent Response

Dạ, em đã ghi nhận lựa chọn cuối; phần đặt chỗ không còn dùng chuyển khoản.

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

Xong phần thanh toán rồi, em cấp mã vé nhé.

### Expected Agent Response

Dạ, vé đã được xác nhận với mã VA-CASE_006.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260720-2330-LIMO","customer_name":"Bùi Đức Long","customer_phone":"0967890126"},"expected_result":{"booking_id":"VA-CASE_006","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_006","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Sài Gòn",
  "destination": "Đà Lạt",
  "travel_date": "2026-07-20",
  "departure_time": "23:30",
  "trip_id": "SG-DL-20260720-2330-LIMO",
  "passenger_count": 2,
  "vehicle_type": "Limousine 22 Phòng",
  "seat_preference": "Hai phòng tầng dưới liền nhau",
  "assigned_seats": [
    "P01",
    "P02"
  ],
  "pickup_location": "Văn phòng Phạm Ngũ Lão",
  "dropoff_location": "Chợ Đà Lạt",
  "customer_name": "Bùi Đức Long",
  "customer_phone": "0967890126",
  "passenger_details": [
    {
      "name": "Bùi Đức Long",
      "type": "ADULT",
      "seat": "P01"
    },
    {
      "name": "Trương Ngọc Lan",
      "type": "ADULT",
      "seat": "P02"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_006",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Bùi Đức Long",
    "phone": "0967890126"
  },
  "passengers": {
    "count": 2,
    "details": [
      {
        "name": "Bùi Đức Long",
        "type": "ADULT",
        "seat": "P01"
      },
      {
        "name": "Trương Ngọc Lan",
        "type": "ADULT",
        "seat": "P02"
      }
    ]
  },
  "trip": {
    "trip_id": "SG-DL-20260720-2330-LIMO",
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-20",
    "departure_time": "23:30",
    "arrival_time": "07:00"
  },
  "vehicle": {
    "type": "Limousine 22 Phòng",
    "seat_preference": "Hai phòng tầng dưới liền nhau",
    "assigned_seats": [
      "P01",
      "P02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Văn phòng Phạm Ngũ Lão",
    "dropoff_location": "Chợ Đà Lạt"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 450000,
    "total_fare_vnd": 900000
  },
  "booking": {
    "booking_id": "VA-CASE_006",
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
Mã vé: VA-CASE_006
Khách hàng: Bùi Đức Long
Số điện thoại: 0967890126
Tuyến: Sài Gòn → Đà Lạt
Khởi hành: 2026-07-20 23:30
Loại xe: Limousine 22 Phòng
Ghế: P01, P02
Điểm đón: Văn phòng Phạm Ngũ Lão
Điểm trả: Chợ Đà Lạt
Số hành khách: 2
Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Giữ trạng thái PENDING khi khách báo chuyển khoản thất bại, tuyệt đối không gán PAID.
- Chỉ đổi payment method sang CASH_ON_BOARDING sau lựa chọn rõ ràng của khách.
- Hoàn tất chuyến 23:30 với hai phòng P01–P02 có thật.
