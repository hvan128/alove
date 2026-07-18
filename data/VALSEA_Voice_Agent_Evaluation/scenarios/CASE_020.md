# CASE_020 — Người Huế ở Hà Nội đặt hai phòng đi Vinh

## 1. Scenario Metadata

- Scenario type: regional_speech
- Customer region: Miền Trung - Huế
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: hard
- Call datetime: 2026-07-20T20:10:00+07:00
- Coverage tags: central, regional_language

## 2. Customer Persona

- Age: 31
- Location: Hà Nội
- Speaking style: Giọng miền Trung thể hiện qua mô, răng, rứa, ni, vô, chi trong cú pháp tự nhiên
- Calling context: Đặt vé cho hai đồng nghiệp từ Hà Nội vào Vinh công tác

## 3. Conversation

## Turn 1

### Customer

Alo em, anh quê Huế đang ở Hà Nội, ngày 22 muốn vô Vinh; bên mình có chuyến mô không?

### Expected Agent Response

Dạ, có các chuyến Hà Nội đi Nghệ An ngày 22 tháng 7 năm 2026. Anh đi mấy người và muốn đi khoảng giờ nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "GREET_AND_DISCOVER",
  "missing_fields": [
    "passenger_count",
    "departure_time"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-22"
  },
  "clear": []
}
```

## Turn 2

### Customer

Hai người, tụi anh muốn đi tối, chừng tám đến mười giờ đều được.

### Expected Agent Response

Dạ, em kiểm tra các chuyến tối còn đủ hai chỗ.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "SEARCH_TRIPS",
  "missing_fields": [],
  "arguments": {
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-22",
    "passenger_count": 2
  },
  "expected_result": {
    "trip_ids": [
      "HN-NA-20260722-2000-VIP21",
      "HN-NA-20260722-2130-GN34",
      "HN-NA-20260722-2215-GN38"
    ]
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "passenger_count": 2
  },
  "clear": []
}
```

## Turn 3

### Customer

Em đọc giờ với loại xe từng chuyến ni cho anh nghe thử.

### Expected Agent Response

Dạ, có 20 giờ Limousine 21 Phòng VIP giá 530.000 đồng; 21 giờ 30 giường nằm 34 chỗ giá 350.000 đồng; 22 giờ 15 giường nằm 38 chỗ giá 340.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "PRESENT_TRIP_OPTIONS",
  "missing_fields": [],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {},
  "clear": []
}
```

## Turn 4

### Customer

Chọn chuyến 20 giờ phòng VIP đi, tới sớm còn kịp làm việc.

### Expected Agent Response

Dạ, em chọn chuyến 20 giờ Limousine 21 Phòng VIP, dự kiến đến 01 giờ.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "UPDATE_REQUIREMENTS",
  "missing_fields": [],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "trip_id": "HN-NA-20260722-2000-VIP21",
    "departure_time": "20:00",
    "vehicle_type": "Limousine 21 Phòng VIP"
  },
  "clear": []
}
```

## Turn 5

### Customer

Răng giá cao rứa em, có phải mỗi người 530 nghìn không?

### Expected Agent Response

Dạ đúng, đơn giá chuyến là 530.000 đồng mỗi người; hai người tổng 1.060.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ANSWER_AND_REDIRECT",
  "missing_fields": [
    "pickup_location"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {},
  "clear": []
}
```

## Turn 6

### Customer

Điểm đón mô tiện khu Phạm Văn Đồng? Công viên Hòa Bình được thì ghi chỗ ni.

### Expected Agent Response

Dạ, Công viên Hòa Bình là điểm đón chính thức của chuyến; em ghi điểm này cho anh.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "dropoff_location"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "pickup_location": "Công viên Hòa Bình"
  },
  "clear": []
}
```

## Turn 7

### Customer

Vô Nghệ An cho tụi anh xuống Trung tâm Nghệ An, không cần vô bến xe.

### Expected Agent Response

Dạ, điểm trả Trung tâm Nghệ An. Anh cho em xin tên hai hành khách ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "customer_name",
    "passenger_details"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "dropoff_location": "Trung tâm Nghệ An"
  },
  "clear": []
}
```

## Turn 8

### Customer

Anh Nguyễn Hoàng Nam, người đi cùng là Lê Minh Quân, cả hai người lớn.

### Expected Agent Response

Dạ, em ghi Nguyễn Hoàng Nam và Lê Minh Quân. Anh đọc giúp số điện thoại liên hệ ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "customer_phone"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "customer_name": "Nguyễn Hoàng Nam"
  },
  "clear": []
}
```

## Turn 9

### Customer

Số anh không chín không hai không không không không không hai không.

### Expected Agent Response

Dạ, số 0902000020. Hai anh muốn chọn phòng thế nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "seat_preference"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "customer_phone": "0902000020"
  },
  "clear": []
}
```

## Turn 10

### Customer

Cho hai phòng tầng dưới liền nhau, có cần báo chi thêm không?

### Expected Agent Response

Dạ, A01 và A02 tầng dưới phía trước, liền nhau đang còn; em giữ hai phòng, tổng 1.060.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260722-2000-VIP21",
    "passenger_count": 2,
    "seat_preference": "hai phòng tầng dưới liền nhau"
  },
  "expected_result": {
    "assigned_seats": [
      "A01",
      "A02"
    ],
    "unit_fare_vnd": 530000,
    "total_fare_vnd": 1060000
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "seat_preference": "hai phòng tầng dưới liền nhau",
    "assigned_seats": [
      "A01",
      "A02"
    ]
  },
  "clear": []
}
```

## Turn 11

### Customer

A01 cho Nguyễn Hoàng Nam, A02 cho Lê Minh Quân.

### Expected Agent Response

Dạ, em đã gắn đúng hai hành khách với A01 và A02.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CAPTURE_PASSENGER_DETAILS",
  "missing_fields": [],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "passenger_details": [
      {
        "name": "Nguyễn Hoàng Nam",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Lê Minh Quân",
        "type": "ADULT",
        "seat": "A02"
      }
    ]
  },
  "clear": []
}
```

## Turn 12

### Customer

Mỗi người có vali mười tám ký với túi xách sáu ký, hành lý rứa có ổn không?

### Expected Agent Response

Dạ, mỗi hành khách được tối đa 20 kg ký gửi và 7 kg túi xách tay, nên mức anh nêu nằm trong hạn mức.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ANSWER_AND_REDIRECT",
  "missing_fields": [
    "payment_method"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {},
  "clear": []
}
```

## Turn 13

### Customer

Tụi anh chuyển khoản, nhưng lúc ni chưa chuyển nên để chờ thanh toán.

### Expected Agent Response

Dạ, em ghi chuyển khoản ngân hàng và hiện đang chờ thanh toán; chưa có giao dịch thành công nên chưa thể coi là đã thanh toán.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CAPTURE_PAYMENT_PREFERENCE",
  "missing_fields": [],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "payment_method": "BANK_TRANSFER",
    "payment_status": "PENDING"
  },
  "clear": []
}
```

## Turn 14

### Customer

Em đọc lại toàn bộ chuyến, ghế, điểm đón trả cho anh dò.

### Expected Agent Response

Dạ: Nguyễn Hoàng Nam A01 và Lê Minh Quân A02, Hà Nội đi Nghệ An ngày 22 tháng 7 lúc 20 giờ, Limousine VIP; đón Công viên Hòa Bình, trả Trung tâm Nghệ An, chuyển khoản đang chờ. Anh xác nhận đúng chứ ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_DETAILS",
  "missing_fields": [],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {},
  "clear": []
}
```

## Turn 15

### Customer

Đúng hết rứa rồi, hai phòng liền nhau và đúng điểm ni; anh xác nhận và chốt hai vé luôn.

### Expected Agent Response

Dạ, em đã nhận xác nhận cùng yêu cầu chốt hai vé. Anh chuẩn bị ghi mã giúp em.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_DETAILS",
  "missing_fields": [],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "explicit_confirmation": true
  },
  "clear": []
}
```

## Turn 16

### Customer

Anh sẵn sàng rồi, em đọc mã với tổng tiền nhé.

### Expected Agent Response

Dạ, hai vé đã xác nhận với mã VA-CASE_020, tổng tiền 1.060.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260722-2000-VIP21",
    "customer_name": "Nguyễn Hoàng Nam",
    "customer_phone": "0902000020"
  },
  "expected_result": {
    "booking_id": "VA-CASE_020",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_020",
    "booking_status": "CONFIRMED"
  },
  "clear": []
}
```

## 4. Internal State Tracking

```json
{
  "origin": "Hà Nội",
  "destination": "Nghệ An",
  "travel_date": "2026-07-22",
  "departure_time": "20:00",
  "trip_id": "HN-NA-20260722-2000-VIP21",
  "passenger_count": 2,
  "vehicle_type": "Limousine 21 Phòng VIP",
  "seat_preference": "hai phòng tầng dưới liền nhau",
  "assigned_seats": [
    "A01",
    "A02"
  ],
  "pickup_location": "Công viên Hòa Bình",
  "dropoff_location": "Trung tâm Nghệ An",
  "customer_name": "Nguyễn Hoàng Nam",
  "customer_phone": "0902000020",
  "passenger_details": [
    {
      "name": "Nguyễn Hoàng Nam",
      "type": "ADULT",
      "seat": "A01"
    },
    {
      "name": "Lê Minh Quân",
      "type": "ADULT",
      "seat": "A02"
    }
  ],
  "payment_method": "BANK_TRANSFER",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_020",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Nguyễn Hoàng Nam",
    "phone": "0902000020"
  },
  "passengers": {
    "count": 2,
    "details": [
      {
        "name": "Nguyễn Hoàng Nam",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Lê Minh Quân",
        "type": "ADULT",
        "seat": "A02"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-NA-20260722-2000-VIP21",
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-22",
    "departure_time": "20:00",
    "arrival_time": "01:00"
  },
  "vehicle": {
    "type": "Limousine 21 Phòng VIP",
    "seat_preference": "hai phòng tầng dưới liền nhau",
    "assigned_seats": [
      "A01",
      "A02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Công viên Hòa Bình",
    "dropoff_location": "Trung tâm Nghệ An"
  },
  "payment": {
    "method": "BANK_TRANSFER",
    "status": "PENDING",
    "unit_fare_vnd": 530000,
    "total_fare_vnd": 1060000
  },
  "booking": {
    "booking_id": "VA-CASE_020",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 15
  }
}
```

## 6. Final Ticket

### VÉ XE ALOVE
- Mã vé: VA-CASE_020
- Khách hàng: Nguyễn Hoàng Nam
- Số điện thoại: 0902000020
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-22 20:00
- Loại xe: Limousine 21 Phòng VIP
- Ghế: A01, A02
- Điểm đón: Công viên Hòa Bình
- Điểm trả: Trung tâm Nghệ An
- Số hành khách: 2
- Thanh toán: Chuyển khoản ngân hàng | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu đúng mô, răng, rứa, ni, vô và chi trong cú pháp của người Huế đang gọi từ Hà Nội.
- So sánh đúng ba chuyến tối rồi giữ lựa chọn cuối là Limousine 20 giờ với giá 530.000 đồng mỗi người.
- Xác nhận hai phòng A01–A02 liền nhau và trả lời đúng hạn mức vali 18 kg cùng túi xách 6 kg.
- Diễn đạt khoản chuyển tiền còn chờ bằng lời tự nhiên và giữ workflow, vé khớp hai hành khách.
