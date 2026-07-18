# CASE_016 — Người Hà Nội nói khẩu ngữ và tự sửa giờ chuyến

## 1. Scenario Metadata

- Scenario type: regional_speech
- Customer region: Hà Nội
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: medium
- Call datetime: 2026-07-20T11:15:00+07:00
- Coverage tags: northern, regional_language

## 2. Customer Persona

- Age: 33
- Location: Hà Nội
- Speaking style: Khẩu ngữ miền Bắc tự nhiên, nhiều từ đệm và tự sửa ngay trong câu
- Calling context: Đặt một vé về Vinh sau giờ làm

## 3. Conversation

## Turn 1

### Customer

Alo, ờ, nhà xe đấy nhỉ? Anh cần một vé từ Hà Nội về Vinh ngày mai.

### Expected Agent Response

Dạ đúng tổng đài Alove. Em ghi một hành khách từ Hà Nội đi Nghệ An ngày mai, tức 21 tháng 7 năm 2026; anh muốn đi giờ nào?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "GREET_AND_DISCOVER",
  "missing_fields": [
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
    "travel_date": "2026-07-21",
    "passenger_count": 1
  },
  "clear": []
}
```

## Turn 2

### Customer

Tối ấy em, tầm tám đến mười giờ đều được, em xem còn chuyến nào.

### Expected Agent Response

Dạ, có chuyến 20 giờ Limousine VIP và chuyến 21 giờ 30 giường nằm còn chỗ cho một người.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "SEARCH_TRIPS",
  "missing_fields": [],
  "arguments": {
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-21",
    "passenger_count": 1
  },
  "expected_result": {
    "trip_ids": [
      "HN-NA-20260721-2000-VIP21",
      "HN-NA-20260721-2130-GN34"
    ]
  }
}
```

### Expected Internal State Update

```json
{
  "set": {},
  "clear": []
}
```

## Turn 3

### Customer

Thế lấy 20 giờ... à khoan, anh tan làm muộn, sửa thành chuyến 21 giờ 30 nhé.

### Expected Agent Response

Dạ, em dùng lựa chọn sau cùng là chuyến 21 giờ 30, giường nằm 34 chỗ, giá 350.000 đồng.

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
    "trip_id": "HN-NA-20260721-2130-GN34",
    "departure_time": "21:30",
    "vehicle_type": "Giường nằm 34 chỗ"
  },
  "clear": []
}
```

## Turn 4

### Customer

Ừ, xe giường nằm là được. Chuyến ấy đến Vinh khoảng mấy giờ cơ?

### Expected Agent Response

Dạ, chuyến dự kiến đến lúc 02 giờ 30. Anh chọn điểm đón nào trong Bến xe Mỹ Đình, Văn phòng Hà Nội hoặc Công viên Hòa Bình ạ?

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

## Turn 5

### Customer

Ra Bến xe Mỹ Đình cho chắc, chứ vòng vèo lại nhỡ xe.

### Expected Agent Response

Dạ, em ghi điểm đón Bến xe Mỹ Đình. Anh muốn xuống điểm nào tại Nghệ An?

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
    "pickup_location": "Bến xe Mỹ Đình"
  },
  "clear": []
}
```

## Turn 6

### Customer

Xuống Văn phòng Vinh nhé, ờ đúng, Văn phòng Vinh chứ không phải bến.

### Expected Agent Response

Dạ, em ghi đúng lựa chọn cuối là Văn phòng Vinh. Anh cho em xin họ tên ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CLARIFY_AMBIGUITY",
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
    "dropoff_location": "Văn phòng Vinh"
  },
  "clear": []
}
```

## Turn 7

### Customer

Anh Nguyễn Đức Tùng, Đức như đạo đức ấy.

### Expected Agent Response

Dạ, em ghi Nguyễn Đức Tùng. Anh đọc số điện thoại liên hệ giúp em nhé.

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
    "customer_name": "Nguyễn Đức Tùng"
  },
  "clear": []
}
```

## Turn 8

### Customer

Không chín sáu sáu, không không không, không một sáu.

### Expected Agent Response

Dạ, số 0966000016. Anh thích ghế tầng trên hay tầng dưới ạ?

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
    "customer_phone": "0966000016"
  },
  "clear": []
}
```

## Turn 9

### Customer

Cho anh ghế tầng dưới, ghế nào còn cũng được.

### Expected Agent Response

Dạ, ghế B03 tầng dưới đang còn; em giữ B03, giá 350.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2130-GN34",
    "passenger_count": 1,
    "seat_preference": "ghế tầng dưới"
  },
  "expected_result": {
    "assigned_seats": [
      "B03"
    ],
    "unit_fare_vnd": 350000,
    "total_fare_vnd": 350000
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "seat_preference": "ghế tầng dưới",
    "assigned_seats": [
      "B03"
    ]
  },
  "clear": []
}
```

## Turn 10

### Customer

Ghi Nguyễn Đức Tùng, người lớn, ghế B03 nhé.

### Expected Agent Response

Dạ, thông tin hành khách và ghế đã được ghi đúng. Anh muốn thanh toán cách nào?

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
        "name": "Nguyễn Đức Tùng",
        "type": "ADULT",
        "seat": "B03"
      }
    ]
  },
  "clear": []
}
```

## Turn 11

### Customer

Chuyển khoản được chứ? Anh sẽ chuyển sau khi nhận thông tin.

### Expected Agent Response

Dạ được, em ghi chuyển khoản ngân hàng và hiện đang chờ thanh toán; chỉ khi giao dịch thành công mới chuyển sang đã thanh toán.

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

## Turn 12

### Customer

Thế em nhắc lại giờ đón với điểm trả một lượt đi, anh hay nhớ lộn.

### Expected Agent Response

Dạ, chuyến khởi hành 21 giờ 30 ngày 21 tháng 7, đón Bến xe Mỹ Đình và trả Văn phòng Vinh.

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

## Turn 13

### Customer

Còn tên, ghế với tiền thế nào nhỉ?

### Expected Agent Response

Dạ, hành khách Nguyễn Đức Tùng, ghế B03 tầng dưới, giá 350.000 đồng, thanh toán chuyển khoản đang chờ. Toàn bộ thông tin đó đúng chứ ạ?

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

## Turn 14

### Customer

Ừ đúng rồi, lấy bản 21 giờ 30 ấy; anh xác nhận và chốt vé luôn.

### Expected Agent Response

Dạ, em đã ghi nhận bản cuối cùng cùng yêu cầu chốt chuyến 21 giờ 30. Anh chờ em trả mã vé.

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

Anh đang nghe đây, em đọc mã vé một lượt nhé.

### Expected Agent Response

Dạ, vé đã xác nhận với mã VA-CASE_016 cho chuyến 21 giờ 30.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2130-GN34",
    "customer_name": "Nguyễn Đức Tùng",
    "customer_phone": "0966000016"
  },
  "expected_result": {
    "booking_id": "VA-CASE_016",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_016",
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
  "travel_date": "2026-07-21",
  "departure_time": "21:30",
  "trip_id": "HN-NA-20260721-2130-GN34",
  "passenger_count": 1,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "ghế tầng dưới",
  "assigned_seats": [
    "B03"
  ],
  "pickup_location": "Bến xe Mỹ Đình",
  "dropoff_location": "Văn phòng Vinh",
  "customer_name": "Nguyễn Đức Tùng",
  "customer_phone": "0966000016",
  "passenger_details": [
    {
      "name": "Nguyễn Đức Tùng",
      "type": "ADULT",
      "seat": "B03"
    }
  ],
  "payment_method": "BANK_TRANSFER",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_016",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Nguyễn Đức Tùng",
    "phone": "0966000016"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Nguyễn Đức Tùng",
        "type": "ADULT",
        "seat": "B03"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-NA-20260721-2130-GN34",
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-21",
    "departure_time": "21:30",
    "arrival_time": "02:30"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "ghế tầng dưới",
    "assigned_seats": [
      "B03"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Bến xe Mỹ Đình",
    "dropoff_location": "Văn phòng Vinh"
  },
  "payment": {
    "method": "BANK_TRANSFER",
    "status": "PENDING",
    "unit_fare_vnd": 350000,
    "total_fare_vnd": 350000
  },
  "booking": {
    "booking_id": "VA-CASE_016",
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
- Mã vé: VA-CASE_016
- Khách hàng: Nguyễn Đức Tùng
- Số điện thoại: 0966000016
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-21 21:30
- Loại xe: Giường nằm 34 chỗ
- Ghế: B03
- Điểm đón: Bến xe Mỹ Đình
- Điểm trả: Văn phòng Vinh
- Số hành khách: 1
- Thanh toán: Chuyển khoản ngân hàng | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu đúng từ đệm và cách tự sửa trong khẩu ngữ Hà Nội, ưu tiên lựa chọn sau cùng là chuyến 21 giờ 30.
- Chuẩn hóa “về Vinh” thành tuyến Hà Nội đi Nghệ An nhưng giữ đúng điểm trả Văn phòng Vinh khách đã sửa rõ.
- Diễn đạt chuyển khoản đang chờ bằng lời tự nhiên và không coi giao dịch chưa thực hiện là đã thanh toán.
- Recap phải bảo toàn tên, ghế B03, điểm đón Mỹ Đình và lựa chọn giờ cuối trước khi cấp mã vé.
