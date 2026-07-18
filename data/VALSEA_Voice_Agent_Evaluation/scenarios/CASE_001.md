# CASE_001 — Khách lần đầu đặt vé Hà Nội đi Nghệ An

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Hà Nội
Audio condition: clean_hotline
Language: vi
Difficulty: easy
Call datetime: 2026-07-18T09:00:00+07:00

## 2. Customer Persona

Age: 24
Location: Cầu Giấy, Hà Nội
Speaking style: Lịch sự, hơi ngập ngừng và hỏi từng bước vì chưa từng gọi đặt vé.
Calling context: Gọi buổi sáng để đặt một chỗ về Vinh vào tối hôm sau.

## 3. Conversation

## Turn 1

### Customer

Alo em ơi, anh chưa đặt vé xe qua điện thoại bao giờ. Anh muốn đi từ Hà Nội về Vinh thì làm thế nào?

### Expected Agent Response

Em chào anh. Em có thể hỗ trợ đặt chuyến Hà Nội đi Nghệ An, trả tại Vinh. Trước hết anh cho em biết ngày đi và số hành khách nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["travel_date","passenger_count"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","destination":"Nghệ An"},"clear":[]}
```

## Turn 2

### Customer

Anh đi ngày mai, có một mình thôi em.

### Expected Agent Response

Dạ, tính từ thời điểm anh gọi thì ngày mai là 19/07/2026 và có 1 hành khách. Anh muốn khởi hành khoảng mấy giờ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ASK_MISSING_INFORMATION","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"travel_date":"2026-07-19","passenger_count":1},"clear":[]}
```

## Turn 3

### Customer

Anh cần chuyến tối, sau chín giờ có chuyến nào không?

### Expected Agent Response

Em tìm thấy chuyến 21:30 ngày 19/07, xe giường nằm 34 chỗ, đến lúc 02:30 và giá 350.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-19","passenger_count":1},"expected_result":{"trip_ids":["HN-NA-20260719-2130-GN34"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

Ừ, lấy chuyến 21:30 đó cho anh.

### Expected Agent Response

Dạ, em ghi nhận chuyến 21:30, giường nằm 34 chỗ. Anh có yêu cầu vị trí ghế không?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"21:30","trip_id":"HN-NA-20260719-2130-GN34","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 5

### Customer

Nếu còn thì giữ chỗ ghế tầng dưới phía trước giúp anh, anh dễ say xe.

### Expected Agent Response

Chuyến còn ghế B01 ở tầng dưới, khu vực phía trước. Em sẽ giữ B01 cho anh với giá 350.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260719-2130-GN34","passenger_count":1,"seat_preference":"Tầng dưới, phía trước"},"expected_result":{"assigned_seats":["B01"],"unit_fare_vnd":350000,"total_fare_vnd":350000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước","assigned_seats":["B01"]},"clear":[]}
```

## Turn 6

### Customer

Người đi là anh, tên Nguyễn Minh Khôi nhé.

### Expected Agent Response

Em đã ghi hành khách Nguyễn Minh Khôi, người lớn, ghế B01. Anh cũng là người đứng tên đặt vé đúng không?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Nguyễn Minh Khôi","passenger_details":[{"name":"Nguyễn Minh Khôi","type":"ADULT","seat":"B01"}]},"clear":[]}
```

## Turn 7

### Customer

Đúng rồi. Điểm đón ở bến xe Mỹ Đình được chứ?

### Expected Agent Response

Được anh. Bến xe Mỹ Đình là điểm đón hợp lệ; anh cần có mặt trước giờ khởi hành 30 phút.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"ANSWER_AND_REDIRECT","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Mỹ Đình"},"clear":[]}
```

## Turn 8

### Customer

Ở Vinh thì cho anh xuống Bến xe Vinh luôn.

### Expected Agent Response

Dạ, em chọn điểm trả Bến xe Vinh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["payment_method","customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe Vinh"},"clear":[]}
```

## Turn 9

### Customer

Anh trả tiền mặt lúc lên xe có được không em?

### Expected Agent Response

Được anh. Em ghi phương thức tiền mặt khi lên xe; trạng thái thanh toán sẽ là chờ thanh toán.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING"},"clear":[]}
```

## Turn 10

### Customer

Anh có một vali khoảng mười ký, hành lý vậy có phải mua thêm vé không?

### Expected Agent Response

Không anh. Mỗi hành khách được mang tối đa 20 kg hành lý ký gửi và một túi xách tay tối đa 7 kg; vali 10 kg của anh nằm trong hạn mức.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 11

### Customer

Số điện thoại anh là 0912345601, em ghi giúp.

### Expected Agent Response

Em đã ghi số 0912345601. Em sẽ dùng số này làm thông tin liên hệ cho mã vé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0912345601"},"clear":[]}
```

## Turn 12

### Customer

Tên anh có dấu Khôi, không phải Khởi nhé, em đọc lại xem.

### Expected Agent Response

Dạ, em đang ghi đúng là Nguyễn Minh Khôi, số 0912345601.

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

Tổng cộng đúng ba trăm năm mươi nghìn thôi phải không?

### Expected Agent Response

Đúng anh, 1 vé nhân đơn giá 350.000 đồng là tổng 350.000 đồng, thanh toán tiền mặt khi lên xe.

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

Trước khi chốt, em gom ngày giờ, ghế và điểm đón trả thành một lượt cho anh nghe nhé.

### Expected Agent Response

Dạ: anh Nguyễn Minh Khôi, 0912345601; đi Hà Nội đến Nghệ An ngày 19/07/2026 lúc 21:30, xe giường nằm 34 chỗ, ghế B01; đón Bến xe Mỹ Đình, trả Bến xe Vinh; 1 hành khách; trả tiền mặt khi lên xe, tổng 350.000 đồng.

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

Anh nghe khớp hết rồi: chuyến 21:30, ghế B01. Anh đồng ý chốt đúng bản này.

### Expected Agent Response

Dạ, em đã ghi nhận anh đồng ý với toàn bộ thông tin và sẵn sàng cấp mã vé.

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

Cứ tiến hành và đọc mã vé cho anh.

### Expected Agent Response

Dạ, vé đã được xác nhận với mã VA-CASE_001. Anh vui lòng có mặt tại Bến xe Mỹ Đình trước 21:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260719-2130-GN34","customer_name":"Nguyễn Minh Khôi","customer_phone":"0912345601"},"expected_result":{"booking_id":"VA-CASE_001","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_001","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Hà Nội",
  "destination": "Nghệ An",
  "travel_date": "2026-07-19",
  "departure_time": "21:30",
  "trip_id": "HN-NA-20260719-2130-GN34",
  "passenger_count": 1,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "Tầng dưới, phía trước",
  "assigned_seats": [
    "B01"
  ],
  "pickup_location": "Bến xe Mỹ Đình",
  "dropoff_location": "Bến xe Vinh",
  "customer_name": "Nguyễn Minh Khôi",
  "customer_phone": "0912345601",
  "passenger_details": [
    {
      "name": "Nguyễn Minh Khôi",
      "type": "ADULT",
      "seat": "B01"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_001",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Nguyễn Minh Khôi",
    "phone": "0912345601"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Nguyễn Minh Khôi",
        "type": "ADULT",
        "seat": "B01"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-NA-20260719-2130-GN34",
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-19",
    "departure_time": "21:30",
    "arrival_time": "02:30"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "Tầng dưới, phía trước",
    "assigned_seats": [
      "B01"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Bến xe Mỹ Đình",
    "dropoff_location": "Bến xe Vinh"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 350000,
    "total_fare_vnd": 350000
  },
  "booking": {
    "booking_id": "VA-CASE_001",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 15
  }
}
```

## 6. Final Ticket

VÉ XE KHÁCH
Mã vé: VA-CASE_001
Khách hàng: Nguyễn Minh Khôi
Số điện thoại: 0912345601
Tuyến: Hà Nội → Nghệ An
Khởi hành: 2026-07-19 21:30
Loại xe: Giường nằm 34 chỗ
Ghế: B01
Điểm đón: Bến xe Mỹ Đình
Điểm trả: Bến xe Vinh
Số hành khách: 1
Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu Vinh thuộc điểm đến Nghệ An nhưng vẫn dùng đúng trip trong catalog.
- Hướng dẫn khách lần đầu theo từng trường, không bỏ qua điểm đón, điểm trả hoặc thanh toán.
- Chỉ tạo booking sau lượt 15 có lời xác nhận rõ ràng.
