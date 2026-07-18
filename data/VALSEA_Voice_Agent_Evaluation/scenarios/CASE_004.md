# CASE_004 — Cặp đôi so sánh ba loại xe rồi nâng cấp phòng VIP

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Hà Nội
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-18T15:00:00+07:00

## 2. Customer Persona

Age: 29
Location: Thanh Xuân, Hà Nội
Speaking style: Cân nhắc giá kỹ, rồi đổi ý khi nghe lại lựa chọn.
Calling context: Đặt hai vé đi Nghệ An ngày 20/07 cho một cặp đôi.

## 3. Conversation

## Turn 1

### Customer

Em ơi, anh đặt hai vé Hà Nội về Nghệ An ngày 20, buổi tối có những loại xe nào?

### Expected Agent Response

Em chào anh. Em ghi nhận 2 hành khách, ngày 20/07/2026. Em sẽ tìm các chuyến tối để anh so sánh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-20","passenger_count":2},"clear":[]}
```

## Turn 2

### Customer

Tìm giúp anh hết các chuyến tối còn đủ hai chỗ nhé.

### Expected Agent Response

Có ba chuyến: 20:00 Limousine 21 Phòng VIP giá 530.000 đồng; 21:30 giường nằm 34 chỗ giá 350.000 đồng; 22:15 giường nằm 38 chỗ giá 340.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-20","passenger_count":2},"expected_result":{"trip_ids":["HN-NA-20260720-2000-VIP21","HN-NA-20260720-2130-GN34","HN-NA-20260720-2215-GN38"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Em nói luôn giờ tới của từng chuyến để anh cân nhắc.

### Expected Agent Response

VIP 20:00 đến 01:00; giường nằm 34 chỗ lúc 21:30 đến 02:30; giường nằm 38 chỗ lúc 22:15 đến 03:15.

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

Ban đầu lấy chuyến rẻ nhất 22:15, xe 38 chỗ cho hai đứa anh.

### Expected Agent Response

Dạ, em chọn chuyến 22:15, giường nằm 38 chỗ, đơn giá 340.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"22:15","trip_id":"HN-NA-20260720-2215-GN38","vehicle_type":"Giường nằm 38 chỗ"},"clear":[]}
```

## Turn 5

### Customer

Chuyến đó còn cặp ghế tầng dưới liền nhau không?

### Expected Agent Response

Còn B01 và B02, đều tầng dưới phía trước và liền nhau. Em có thể giữ cặp này.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"PRESENT_TRIP_OPTIONS","missing_fields":["assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai ghế tầng dưới liền nhau"},"clear":[]}
```

## Turn 6

### Customer

Giữ B01 với B02 tạm cho anh.

### Expected Agent Response

Em đã giữ B01, B02 trên chuyến 22:15; tổng 680.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2215-GN38","passenger_count":2,"seat_preference":"Hai ghế tầng dưới liền nhau"},"expected_result":{"assigned_seats":["B01","B02"],"unit_fare_vnd":340000,"total_fare_vnd":680000}}
```

### Expected Internal State Update

```json
{"set":{"assigned_seats":["B01","B02"]},"clear":[]}
```

## Turn 7

### Customer

À khoan, bạn gái anh muốn đến sớm hơn. Nâng cấp sang chuyến phòng VIP 20:00 đi, bỏ cặp ghế cũ nhé.

### Expected Agent Response

Dạ, em đổi sang Limousine 21 Phòng VIP lúc 20:00 và bỏ giữ ghế của chuyến 22:15. Giá mới là 530.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference","assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"20:00","trip_id":"HN-NA-20260720-2000-VIP21","vehicle_type":"Limousine 21 Phòng VIP"},"clear":["seat_preference","assigned_seats"]}
```

## Turn 8

### Customer

Phòng VIP còn hai phòng tầng dưới liền nhau thì giữ giúp anh.

### Expected Agent Response

Còn A01 và A02, cùng tầng dưới phía trước và liền nhau. Em giữ hai phòng này, tổng 1.060.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2000-VIP21","passenger_count":2,"seat_preference":"Hai phòng tầng dưới liền nhau"},"expected_result":{"assigned_seats":["A01","A02"],"unit_fare_vnd":530000,"total_fare_vnd":1060000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai phòng tầng dưới liền nhau","assigned_seats":["A01","A02"]},"clear":[]}
```

## Turn 9

### Customer

Người đi là Đỗ Thành Nam ghế A01 và Nguyễn Ngọc Mai ghế A02.

### Expected Agent Response

Em đã ghi hai hành khách người lớn: Đỗ Thành Nam A01 và Nguyễn Ngọc Mai A02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Đỗ Thành Nam","passenger_details":[{"name":"Đỗ Thành Nam","type":"ADULT","seat":"A01"},{"name":"Nguyễn Ngọc Mai","type":"ADULT","seat":"A02"}]},"clear":[]}
```

## Turn 10

### Customer

Bọn anh đón ở Văn phòng Hà Nội.

### Expected Agent Response

Dạ, em chọn điểm đón Văn phòng Hà Nội; anh chị cần có mặt trước 19:30.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Văn phòng Hà Nội"},"clear":[]}
```

## Turn 11

### Customer

Điểm trả là Văn phòng Vinh luôn nhé.

### Expected Agent Response

Em đã chọn Văn phòng Vinh làm điểm trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Văn phòng Vinh"},"clear":[]}
```

## Turn 12

### Customer

Số anh Nam là 0945678904, anh đứng tên đặt.

### Expected Agent Response

Dạ, em ghi người đặt Đỗ Thành Nam, số 0945678904.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0945678904"},"clear":[]}
```

## Turn 13

### Customer

Anh trả QR, nhưng hiện tại cứ để chờ thanh toán.

### Expected Agent Response

Em ghi thanh toán bằng QR và hiện đang chờ giao dịch hoàn tất; chưa có kết quả thành công thì chưa coi là đã trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PENDING"},"clear":[]}
```

## Turn 14

### Customer

Phòng VIP có những tiện ích gì, có chắc riêng tư hơn không?

### Expected Agent Response

Thông tin hiện có chỉ xác nhận loại xe Limousine 21 Phòng VIP, giờ chạy và giá; em không đủ căn cứ để hứa thêm tiện ích hay mức riêng tư cụ thể.

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

Vậy em đọc lại phương án cuối, đừng lẫn với chuyến 22:15 lúc đầu.

### Expected Agent Response

Phương án cuối là VIP 20:00 ngày 20/07, đến 01:00; Đỗ Thành Nam A01, Nguyễn Ngọc Mai A02; đón Văn phòng Hà Nội, trả Văn phòng Vinh; thanh toán QR đang chờ hoàn tất; tổng 1.060.000 đồng. Chuyến 22:15 cùng ghế B01, B02 đã được bỏ khỏi yêu cầu cuối.

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

Anh chọn đúng phương án nâng cấp 20:00 và đồng ý bỏ hẳn lựa chọn 22:15.

### Expected Agent Response

Dạ, em đã ghi nhận anh đồng ý với phương án VIP 20:00.

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

Khóa phương án nâng cấp và cấp mã cho anh.

### Expected Agent Response

Dạ, vé đã được xác nhận với mã VA-CASE_004.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2000-VIP21","customer_name":"Đỗ Thành Nam","customer_phone":"0945678904"},"expected_result":{"booking_id":"VA-CASE_004","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_004","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Hà Nội",
  "destination": "Nghệ An",
  "travel_date": "2026-07-20",
  "departure_time": "20:00",
  "trip_id": "HN-NA-20260720-2000-VIP21",
  "passenger_count": 2,
  "vehicle_type": "Limousine 21 Phòng VIP",
  "seat_preference": "Hai phòng tầng dưới liền nhau",
  "assigned_seats": [
    "A01",
    "A02"
  ],
  "pickup_location": "Văn phòng Hà Nội",
  "dropoff_location": "Văn phòng Vinh",
  "customer_name": "Đỗ Thành Nam",
  "customer_phone": "0945678904",
  "passenger_details": [
    {
      "name": "Đỗ Thành Nam",
      "type": "ADULT",
      "seat": "A01"
    },
    {
      "name": "Nguyễn Ngọc Mai",
      "type": "ADULT",
      "seat": "A02"
    }
  ],
  "payment_method": "QR",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_004",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Đỗ Thành Nam",
    "phone": "0945678904"
  },
  "passengers": {
    "count": 2,
    "details": [
      {
        "name": "Đỗ Thành Nam",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Nguyễn Ngọc Mai",
        "type": "ADULT",
        "seat": "A02"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-NA-20260720-2000-VIP21",
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-20",
    "departure_time": "20:00",
    "arrival_time": "01:00"
  },
  "vehicle": {
    "type": "Limousine 21 Phòng VIP",
    "seat_preference": "Hai phòng tầng dưới liền nhau",
    "assigned_seats": [
      "A01",
      "A02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Văn phòng Hà Nội",
    "dropoff_location": "Văn phòng Vinh"
  },
  "payment": {
    "method": "QR",
    "status": "PENDING",
    "unit_fare_vnd": 530000,
    "total_fare_vnd": 1060000
  },
  "booking": {
    "booking_id": "VA-CASE_004",
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
Mã vé: VA-CASE_004
Khách hàng: Đỗ Thành Nam
Số điện thoại: 0945678904
Tuyến: Hà Nội → Nghệ An
Khởi hành: 2026-07-20 20:00
Loại xe: Limousine 21 Phòng VIP
Ghế: A01, A02
Điểm đón: Văn phòng Hà Nội
Điểm trả: Văn phòng Vinh
Số hành khách: 2
Thanh toán: QR | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- So sánh đúng ba chuyến theo giờ, loại xe và giá từ catalog.
- Khi nâng cấp, xóa ghế và seat preference của chuyến cũ trước khi giữ phòng VIP.
- Không tự mô tả tiện ích VIP ngoài dữ liệu fixture.
