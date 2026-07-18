# CASE_017 — Khách Nghệ An đổi điểm đón sau lần xác nhận đầu

## 1. Scenario Metadata

- Scenario type: regional_speech
- Customer region: Nghệ An
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: hard
- Call datetime: 2026-07-20T16:40:00+07:00
- Coverage tags: nghe_an, regional_language

## 2. Customer Persona

- Age: 41
- Location: Thành phố Vinh
- Speaking style: Dùng mô, răng, rứa, ni tự nhiên trong câu nhưng phát âm được biểu diễn bằng chính tả chuẩn
- Calling context: Đặt vé ra Hà Nội và thay điểm đón khi nhớ lịch người nhà

## 3. Conversation

## Turn 1

### Customer

Alo em, xe ni có chạy từ Vinh ra Hà Nội không rứa? Anh muốn đặt một vé.

### Expected Agent Response

Dạ có tuyến Nghệ An đi Hà Nội. Anh muốn đi ngày nào và khoảng giờ nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "GREET_AND_DISCOVER",
  "missing_fields": [
    "travel_date",
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
    "origin": "Nghệ An",
    "destination": "Hà Nội",
    "passenger_count": 1
  },
  "clear": []
}
```

## Turn 2

### Customer

Anh đi tối mai ngày 21 tháng Bảy, coi chuyến nào tầm tám giờ trở đi.

### Expected Agent Response

Dạ, em ghi ngày 21 tháng 7 năm 2026 và kiểm tra các chuyến tối còn một chỗ.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "SEARCH_TRIPS",
  "missing_fields": [],
  "arguments": {
    "origin": "Nghệ An",
    "destination": "Hà Nội",
    "travel_date": "2026-07-21",
    "passenger_count": 1
  },
  "expected_result": {
    "trip_ids": [
      "NA-HN-20260721-2030-VIP21",
      "NA-HN-20260721-2215-GN38"
    ]
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "travel_date": "2026-07-21"
  },
  "clear": []
}
```

## Turn 3

### Customer

Có giờ mô với loại xe chi thì em nói anh nghe thử.

### Expected Agent Response

Dạ, có chuyến 20 giờ 30 Limousine 21 Phòng VIP giá 530.000 đồng và chuyến 22 giờ 15 giường nằm 38 chỗ giá 340.000 đồng.

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

Răng phòng VIP giá cao rứa, nhưng thôi chọn chuyến 20 giờ 30 cho tới Hà Nội sớm.

### Expected Agent Response

Dạ, em chọn chuyến 20 giờ 30 Limousine 21 Phòng VIP, dự kiến đến 01 giờ 30.

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
    "trip_id": "NA-HN-20260721-2030-VIP21",
    "departure_time": "20:30",
    "vehicle_type": "Limousine 21 Phòng VIP"
  },
  "clear": []
}
```

## Turn 5

### Customer

Chuyến ni đón ở mô trong Vinh vậy em?

### Expected Agent Response

Dạ, chuyến có Bến xe Vinh, Văn phòng Vinh hoặc Quảng trường Hồ Chí Minh. Anh chọn điểm nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
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

Trước mắt ghi Bến xe Vinh đi, chỗ đó anh biết đường.

### Expected Agent Response

Dạ, em tạm ghi điểm đón Bến xe Vinh. Anh muốn trả tại điểm nào ở Hà Nội ạ?

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
    "pickup_location": "Bến xe Vinh"
  },
  "clear": []
}
```

## Turn 7

### Customer

Cho anh xuống Bến xe Mỹ Đình, từ đó bắt xe về nhà tiện.

### Expected Agent Response

Dạ, điểm trả Bến xe Mỹ Đình. Anh cho em xin họ tên và số điện thoại ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "customer_name",
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
    "dropoff_location": "Bến xe Mỹ Đình"
  },
  "clear": []
}
```

## Turn 8

### Customer

Anh Hồ Văn Dũng, số không chín bảy bảy không không không không một bảy.

### Expected Agent Response

Dạ, em ghi Hồ Văn Dũng, số 0977000017. Anh muốn phòng ở tầng nào?

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
    "customer_name": "Hồ Văn Dũng",
    "customer_phone": "0977000017"
  },
  "clear": []
}
```

## Turn 9

### Customer

Cho anh một phòng tầng dưới, đi đêm leo lên leo xuống bất tiện.

### Expected Agent Response

Dạ, phòng B01 tầng dưới đang còn; em giữ B01 với giá 530.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "NA-HN-20260721-2030-VIP21",
    "passenger_count": 1,
    "seat_preference": "một phòng tầng dưới"
  },
  "expected_result": {
    "assigned_seats": [
      "B01"
    ],
    "unit_fare_vnd": 530000,
    "total_fare_vnd": 530000
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "seat_preference": "một phòng tầng dưới",
    "assigned_seats": [
      "B01"
    ]
  },
  "clear": []
}
```

## Turn 10

### Customer

B01 ghi Hồ Văn Dũng, người lớn, đúng anh đi.

### Expected Agent Response

Dạ, em đã gắn hành khách Hồ Văn Dũng với phòng B01. Anh chọn thanh toán cách nào?

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
        "name": "Hồ Văn Dũng",
        "type": "ADULT",
        "seat": "B01"
      }
    ]
  },
  "clear": []
}
```

## Turn 11

### Customer

Anh trả tiền mặt lúc lên xe cho gọn.

### Expected Agent Response

Dạ, em ghi tiền mặt khi lên xe, trạng thái chờ thanh toán.

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

## Turn 12

### Customer

Em đọc lại chuyến, ghế với điểm đón xem có sót chi không.

### Expected Agent Response

Dạ: một hành khách Hồ Văn Dũng, Nghệ An đi Hà Nội ngày 21 tháng 7, 20 giờ 30, phòng B01; đón Bến xe Vinh, trả Bến xe Mỹ Đình, tiền mặt khi lên xe. Anh xác nhận đúng không ạ?

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

Đúng rứa, anh xác nhận thông tin ni.

### Expected Agent Response

Dạ, em đã ghi nhận bản anh vừa xác nhận và chuẩn bị xử lý yêu cầu đặt vé.

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

## Turn 14

### Customer

Khoan em, người nhà vừa bảo đón anh ở Quảng trường Hồ Chí Minh; đổi điểm đón sang đó, đừng lấy Bến xe Vinh nữa.

### Expected Agent Response

Dạ, em đã đổi điểm đón sang Quảng trường Hồ Chí Minh. Vì anh vừa thay đổi thông tin, em xin đọc lại và nhờ anh xác nhận thêm một lần nữa ạ.

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
    "pickup_location": "Quảng trường Hồ Chí Minh"
  },
  "clear": [
    "explicit_confirmation"
  ]
}
```

## Turn 15

### Customer

Ừ, bản cuối đón Quảng trường Hồ Chí Minh, các mục khác giữ nguyên; anh xác nhận lại và chốt theo điểm mới.

### Expected Agent Response

Dạ, em đã nhận xác nhận mới cùng yêu cầu chốt vé tại Quảng trường Hồ Chí Minh. Anh chờ em trả mã.

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

Anh đang nghe, em đọc mã rồi nhắc đúng điểm đón mới giúp anh.

### Expected Agent Response

Dạ, vé đã xác nhận với mã VA-CASE_017, đón tại Quảng trường Hồ Chí Minh.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "NA-HN-20260721-2030-VIP21",
    "customer_name": "Hồ Văn Dũng",
    "customer_phone": "0977000017"
  },
  "expected_result": {
    "booking_id": "VA-CASE_017",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_017",
    "booking_status": "CONFIRMED"
  },
  "clear": []
}
```

## 4. Internal State Tracking

```json
{
  "origin": "Nghệ An",
  "destination": "Hà Nội",
  "travel_date": "2026-07-21",
  "departure_time": "20:30",
  "trip_id": "NA-HN-20260721-2030-VIP21",
  "passenger_count": 1,
  "vehicle_type": "Limousine 21 Phòng VIP",
  "seat_preference": "một phòng tầng dưới",
  "assigned_seats": [
    "B01"
  ],
  "pickup_location": "Quảng trường Hồ Chí Minh",
  "dropoff_location": "Bến xe Mỹ Đình",
  "customer_name": "Hồ Văn Dũng",
  "customer_phone": "0977000017",
  "passenger_details": [
    {
      "name": "Hồ Văn Dũng",
      "type": "ADULT",
      "seat": "B01"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_017",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Hồ Văn Dũng",
    "phone": "0977000017"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Hồ Văn Dũng",
        "type": "ADULT",
        "seat": "B01"
      }
    ]
  },
  "trip": {
    "trip_id": "NA-HN-20260721-2030-VIP21",
    "origin": "Nghệ An",
    "destination": "Hà Nội",
    "travel_date": "2026-07-21",
    "departure_time": "20:30",
    "arrival_time": "01:30"
  },
  "vehicle": {
    "type": "Limousine 21 Phòng VIP",
    "seat_preference": "một phòng tầng dưới",
    "assigned_seats": [
      "B01"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Quảng trường Hồ Chí Minh",
    "dropoff_location": "Bến xe Mỹ Đình"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 530000,
    "total_fare_vnd": 530000
  },
  "booking": {
    "booking_id": "VA-CASE_017",
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
- Mã vé: VA-CASE_017
- Khách hàng: Hồ Văn Dũng
- Số điện thoại: 0977000017
- Tuyến: Nghệ An → Hà Nội
- Khởi hành: 2026-07-21 20:30
- Loại xe: Limousine 21 Phòng VIP
- Ghế: B01
- Điểm đón: Quảng trường Hồ Chí Minh
- Điểm trả: Bến xe Mỹ Đình
- Số hành khách: 1
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu đúng mô, răng, rứa, ni và chi theo ngữ cảnh Nghệ An mà không biến lời khách thành chính tả mô phỏng phát âm.
- Chỉ dùng các giờ, loại xe và điểm đón có trong chuyến Nghệ An đi Hà Nội đã chọn.
- Khi khách đổi từ Bến xe Vinh sang Quảng trường Hồ Chí Minh sau khi nghe đọc lại, phải xóa xác nhận cũ rồi nhận xác nhận mới.
- Mã vé và mọi đầu ra cuối phải chỉ còn điểm đón Quảng trường Hồ Chí Minh.
