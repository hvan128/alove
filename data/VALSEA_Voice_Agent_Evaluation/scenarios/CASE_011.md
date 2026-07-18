# CASE_011 — Cuộc gọi mơ hồ chỉ nói muốn lên Đà Lạt

## 1. Scenario Metadata

- Scenario type: hotline_behavior
- Customer region: Miền Nam
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: medium
- Call datetime: 2026-07-18T10:00:00+07:00
- Coverage tags: identity_check, vague_request

## 2. Customer Persona

- Age: 29
- Location: Thành phố Hồ Chí Minh
- Speaking style: Thân mật, nói ngắn và cung cấp thông tin từng chút một
- Calling context: Gọi lần đầu để hỏi đúng nhà xe rồi mới nói nhu cầu

## 3. Conversation

## Turn 1

### Customer

Alo, đây có phải nhà xe Alove hông em? Anh đang tìm chỗ đặt vé.

### Expected Agent Response

Dạ đúng rồi anh, đây là tổng đài đặt vé Alove. Anh muốn đi tuyến nào để em hỗ trợ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "GREET_AND_DISCOVER",
  "missing_fields": [
    "origin",
    "destination"
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

## Turn 2

### Customer

Ờ, anh tính lên Đà Lạt đó, chứ chưa biết nói sao nữa.

### Expected Agent Response

Dạ em ghi nhận điểm đến Đà Lạt. Anh khởi hành từ tỉnh, thành phố nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CLARIFY_AMBIGUITY",
  "missing_fields": [
    "origin"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "destination": "Đà Lạt"
  },
  "clear": []
}
```

## Turn 3

### Customer

Anh đi từ Sài Gòn, chắc bắt xe trong thành phố.

### Expected Agent Response

Dạ, tuyến Sài Gòn đi Đà Lạt. Anh muốn đi ngày nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "travel_date"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "origin": "Sài Gòn"
  },
  "clear": []
}
```

## Turn 4

### Customer

Tối thứ Hai ngày 20 tháng Bảy nha em, anh muốn chuyến khuya một chút.

### Expected Agent Response

Dạ, em ghi nhận ngày 20 tháng 7 năm 2026. Anh đi mấy người và khoảng mấy giờ tối ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "passenger_count"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "travel_date": "2026-07-20"
  },
  "clear": []
}
```

## Turn 5

### Customer

Một mình anh thôi, khoảng mười giờ đêm có chuyến thì coi giúp.

### Expected Agent Response

Dạ, em tìm thấy chuyến 22 giờ ngày 20 tháng 7 từ Sài Gòn đi Đà Lạt còn chỗ.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "SEARCH_TRIPS",
  "missing_fields": [],
  "arguments": {
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-20",
    "passenger_count": 1
  },
  "expected_result": {
    "trip_ids": [
      "SG-DL-20260720-2200-GN34"
    ]
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "passenger_count": 1
  },
  "clear": []
}
```

## Turn 6

### Customer

Chuyến đó là xe giường nằm phải hông, vé bao nhiêu vậy em?

### Expected Agent Response

Dạ đúng, chuyến 22 giờ là xe giường nằm 34 chỗ, giá 320.000 đồng một người. Anh chọn chuyến này chứ ạ?

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
  "set": {
    "trip_id": "SG-DL-20260720-2200-GN34",
    "departure_time": "22:00",
    "vehicle_type": "Giường nằm 34 chỗ"
  },
  "clear": []
}
```

## Turn 7

### Customer

Chọn chuyến đó. Anh ra Hàng Xanh đón cho tiện được hông?

### Expected Agent Response

Dạ được, điểm chính thức là Ngã tư Hàng Xanh. Em ghi điểm đón này cho anh nhé.

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
    "pickup_location": "Ngã tư Hàng Xanh"
  },
  "clear": []
}
```

## Turn 8

### Customer

Ừ, điểm trả cho anh ở Chợ Đà Lạt, sáng xuống đó dễ kiếm xe.

### Expected Agent Response

Dạ, em đã ghi điểm trả Chợ Đà Lạt. Anh cho em xin họ tên người đi ạ.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "customer_name"
  ],
  "arguments": {},
  "expected_result": {}
}
```

### Expected Internal State Update

```json
{
  "set": {
    "dropoff_location": "Chợ Đà Lạt"
  },
  "clear": []
}
```

## Turn 9

### Customer

Tên anh là Trần Minh Khoa, Khoa như khoa học nha.

### Expected Agent Response

Dạ, em ghi nhận hành khách Trần Minh Khoa. Anh đọc giúp số điện thoại liên hệ ạ.

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
    "customer_name": "Trần Minh Khoa"
  },
  "clear": []
}
```

## Turn 10

### Customer

Số của anh là không chín không một không không không không một một.

### Expected Agent Response

Dạ, em ghi nhận số 0901000011. Anh muốn chọn vị trí giường thế nào ạ?

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
    "customer_phone": "0901000011"
  },
  "clear": []
}
```

## Turn 11

### Customer

Cho anh ghế tầng dưới phía trước, em giữ chỗ đó giúp, đi đèo anh hơi dễ say.

### Expected Agent Response

Dạ, ghế B01 tầng dưới phía trước đang còn; em giữ ghế B01, đơn giá 320.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "SG-DL-20260720-2200-GN34",
    "passenger_count": 1,
    "seat_preference": "ghế tầng dưới phía trước"
  },
  "expected_result": {
    "assigned_seats": [
      "B01"
    ],
    "unit_fare_vnd": 320000,
    "total_fare_vnd": 320000
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "seat_preference": "ghế tầng dưới phía trước",
    "assigned_seats": [
      "B01"
    ]
  },
  "clear": []
}
```

## Turn 12

### Customer

Vé cứ ghi đúng tên Trần Minh Khoa, người lớn, ghế B01 nha.

### Expected Agent Response

Dạ, em đã gắn hành khách Trần Minh Khoa với ghế B01. Anh muốn thanh toán theo cách nào?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CAPTURE_PASSENGER_DETAILS",
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
  "set": {
    "passenger_details": [
      {
        "name": "Trần Minh Khoa",
        "type": "ADULT",
        "seat": "B01"
      }
    ]
  },
  "clear": []
}
```

## Turn 13

### Customer

Anh trả tiền mặt lúc lên xe, khỏi chuyển khoản trước.

### Expected Agent Response

Dạ, phương thức là tiền mặt khi lên xe, trạng thái đang chờ thanh toán. Em đọc lại: một vé Sài Gòn đi Đà Lạt ngày 20 tháng 7, 22 giờ, ghế B01, đón Ngã tư Hàng Xanh, trả Chợ Đà Lạt. Anh xác nhận đúng không ạ?

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
    "payment_method": "CASH_ON_BOARDING",
    "payment_status": "PENDING"
  },
  "clear": []
}
```

## Turn 14

### Customer

Đúng hết rồi em, anh xác nhận và nhờ em chốt luôn vé này.

### Expected Agent Response

Dạ, em đã ghi nhận cả xác nhận thông tin và yêu cầu chốt vé. Anh chờ em trả mã vé ngay sau đây.

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

## Turn 15

### Customer

Ừ em, có mã thì đọc chậm từng phần cho anh ghi lại.

### Expected Agent Response

Dạ, vé đã được xác nhận với mã VA-CASE_011. Anh thanh toán tiền mặt khi lên xe và có mặt trước giờ đón theo hướng dẫn.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "SG-DL-20260720-2200-GN34",
    "customer_name": "Trần Minh Khoa",
    "customer_phone": "0901000011"
  },
  "expected_result": {
    "booking_id": "VA-CASE_011",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
      "booking_id": "VA-CASE_011",
    "booking_status": "CONFIRMED"
  },
  "clear": []
}
```

## 4. Internal State Tracking

```json
{
  "origin": "Sài Gòn",
  "destination": "Đà Lạt",
  "travel_date": "2026-07-20",
  "departure_time": "22:00",
  "trip_id": "SG-DL-20260720-2200-GN34",
  "passenger_count": 1,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "ghế tầng dưới phía trước",
  "assigned_seats": [
    "B01"
  ],
  "pickup_location": "Ngã tư Hàng Xanh",
  "dropoff_location": "Chợ Đà Lạt",
  "customer_name": "Trần Minh Khoa",
  "customer_phone": "0901000011",
  "passenger_details": [
    {
      "name": "Trần Minh Khoa",
      "type": "ADULT",
      "seat": "B01"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_011",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Trần Minh Khoa",
    "phone": "0901000011"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Trần Minh Khoa",
        "type": "ADULT",
        "seat": "B01"
      }
    ]
  },
  "trip": {
    "trip_id": "SG-DL-20260720-2200-GN34",
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-20",
    "departure_time": "22:00",
    "arrival_time": "05:30"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "ghế tầng dưới phía trước",
    "assigned_seats": [
      "B01"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Ngã tư Hàng Xanh",
    "dropoff_location": "Chợ Đà Lạt"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 320000,
    "total_fare_vnd": 320000
  },
  "booking": {
    "booking_id": "VA-CASE_011",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 14
  }
}
```

## 6. Final Ticket

### VÉ XE ALOVE
- Mã vé: VA-CASE_011
- Khách hàng: Trần Minh Khoa
- Số điện thoại: 0901000011
- Tuyến: Sài Gòn → Đà Lạt
- Khởi hành: 2026-07-20 22:00
- Loại xe: Giường nằm 34 chỗ
- Ghế: B01
- Điểm đón: Ngã tư Hàng Xanh
- Điểm trả: Chợ Đà Lạt
- Số hành khách: 1
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Nhận ra câu hỏi kiểm tra đúng nhà xe rồi chuyển tự nhiên sang khai thác nhu cầu còn mơ hồ.
- Không suy đoán điểm đi khi khách chỉ nói muốn lên Đà Lạt; phải hỏi và giữ đúng câu trả lời Sài Gòn.
- Chỉ chọn chuyến, ghế B01 và hai điểm đón/trả có thật trong dữ liệu chuyến.
- Mã vé đọc cho khách, trạng thái cuối, workflow và vé phải cùng là VA-CASE_011.
