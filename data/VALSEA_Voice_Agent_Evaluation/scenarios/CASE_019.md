# CASE_019 — Gia đình miền Nam chọn ba phòng gần nhau

## 1. Scenario Metadata

- Scenario type: regional_speech
- Customer region: Miền Nam
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: hard
- Call datetime: 2026-07-20T18:05:00+07:00
- Coverage tags: southern, regional_language

## 2. Customer Persona

- Age: 35
- Location: Thành phố Hồ Chí Minh
- Speaking style: Khẩu ngữ miền Nam với hông, nghen, bữa, tui nhưng không cố tình viết sai âm
- Calling context: Đặt chuyến Đà Lạt cho hai vợ chồng và con nhỏ

## 3. Conversation

## Turn 1

### Customer

Alo em, bữa giờ nhà chị tính lên Đà Lạt chơi, tối mai có chuyến xe nào hông?

### Expected Agent Response

Dạ, tối mai là ngày 21 tháng 7 năm 2026. Chị đi từ Sài Gòn và có mấy hành khách ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "GREET_AND_DISCOVER",
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
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-21"
  },
  "clear": []
}
```

## Turn 2

### Customer

Tụi tui có hai người lớn với một bé, tổng ba vé nghen.

### Expected Agent Response

Dạ, em ghi ba hành khách gồm hai người lớn và một trẻ em. Trẻ em phải đi cùng người lớn, có thông tin và ghế riêng, cùng đơn giá của chuyến.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ANSWER_AND_REDIRECT",
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
    "passenger_count": 3
  },
  "clear": []
}
```

## Turn 3

### Customer

Đúng rồi, bé đi cùng ba mẹ. Em coi giúp tối có chuyến nào còn ba chỗ.

### Expected Agent Response

Dạ, chuyến 22 giờ giường nằm 34 chỗ và chuyến 23 giờ 30 Limousine 22 Phòng đều còn đủ ba chỗ.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "SEARCH_TRIPS",
  "missing_fields": [],
  "arguments": {
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-21",
    "passenger_count": 3
  },
  "expected_result": {
    "trip_ids": [
      "SG-DL-20260721-2200-GN34",
      "SG-DL-20260721-2330-LIMO"
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

## Turn 4

### Customer

Có con nhỏ nên lấy chuyến 23 giờ 30 phòng riêng cho dễ ngủ được hông?

### Expected Agent Response

Dạ được, em chọn chuyến 23 giờ 30 Limousine 22 Phòng, đơn giá 450.000 đồng mỗi người.

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
    "trip_id": "SG-DL-20260721-2330-LIMO",
    "departure_time": "23:30",
    "vehicle_type": "Limousine 22 Phòng"
  },
  "clear": []
}
```

## Turn 5

### Customer

Tụi tui đón ở Ngã tư Hàng Xanh nha, chỗ đó tiện tập trung.

### Expected Agent Response

Dạ, điểm đón Ngã tư Hàng Xanh. Chị muốn trả tại đâu ở Đà Lạt ạ?

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

## Turn 6

### Customer

Xuống Chợ Đà Lạt nghen, sáng kiếm đồ ăn luôn.

### Expected Agent Response

Dạ, điểm trả Chợ Đà Lạt. Chị cho em xin tên ba hành khách ạ?

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
    "dropoff_location": "Chợ Đà Lạt"
  },
  "clear": []
}
```

## Turn 7

### Customer

Chị Lê Thị Kim Oanh, chồng chị Trần Quốc Bảo, con là Trần Gia Nhi.

### Expected Agent Response

Dạ, em ghi hai người lớn Lê Thị Kim Oanh, Trần Quốc Bảo và trẻ em Trần Gia Nhi. Chị đọc số điện thoại liên hệ ạ?

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
    "customer_name": "Lê Thị Kim Oanh"
  },
  "clear": []
}
```

## Turn 8

### Customer

Số chị không chín không chín không không không không một chín.

### Expected Agent Response

Dạ, số liên hệ là 0909000019. Chị muốn ba phòng ở vị trí nào?

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
    "customer_phone": "0909000019"
  },
  "clear": []
}
```

## Turn 9

### Customer

Cho ba phòng tầng dưới gần nhau hông em, bé nằm giữa ba mẹ cho dễ coi.

### Expected Agent Response

Dạ, P01, P02 và P03 cùng tầng dưới, phía trước và nối liền nhau; em giữ ba phòng, tổng 1.350.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "SG-DL-20260721-2330-LIMO",
    "passenger_count": 3,
    "seat_preference": "ba phòng tầng dưới gần nhau"
  },
  "expected_result": {
    "assigned_seats": [
      "P01",
      "P02",
      "P03"
    ],
    "unit_fare_vnd": 450000,
    "total_fare_vnd": 1350000
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "seat_preference": "ba phòng tầng dưới gần nhau",
    "assigned_seats": [
      "P01",
      "P02",
      "P03"
    ]
  },
  "clear": []
}
```

## Turn 10

### Customer

P01 cho tui, P02 cho bé Nhi nằm giữa, P03 cho anh Bảo nghen.

### Expected Agent Response

Dạ, em đã xếp chị ở P01, bé Nhi ở giữa tại P02 và anh Bảo ở P03.

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
        "name": "Lê Thị Kim Oanh",
        "type": "ADULT",
        "seat": "P01"
      },
      {
        "name": "Trần Gia Nhi",
        "type": "CHILD",
        "seat": "P02"
      },
      {
        "name": "Trần Quốc Bảo",
        "type": "ADULT",
        "seat": "P03"
      }
    ]
  },
  "clear": []
}
```

## Turn 11

### Customer

Bé có xe đẩy gấp gọn, mang theo chung hành lý được hông?

### Expected Agent Response

Dạ, xe đẩy trẻ em gấp gọn được tính trong hạn mức hành lý ký gửi; mỗi hành khách có tối đa 20 kg ký gửi và 7 kg túi xách tay.

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

## Turn 12

### Customer

Vậy được rồi. Nhà chị trả tiền mặt lúc lên xe.

### Expected Agent Response

Dạ, em ghi tiền mặt khi lên xe và hiện đang chờ thanh toán.

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

## Turn 13

### Customer

Em nhắc lại ba cái tên với ghế coi có lộn bé hông.

### Expected Agent Response

Dạ: Lê Thị Kim Oanh P01, bé Trần Gia Nhi ở giữa tại P02, Trần Quốc Bảo P03; đi Sài Gòn đến Đà Lạt ngày 21 tháng 7 lúc 23 giờ 30, đón Hàng Xanh, trả Chợ Đà Lạt. Chị xác nhận đúng chứ ạ?

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

Đúng rồi em, bé Nhi P02 nằm giữa ba mẹ P01 với P03; chị xác nhận và chốt ba vé luôn nghen.

### Expected Agent Response

Dạ, em đã nhận xác nhận cho đúng thứ tự mẹ–bé–ba cùng yêu cầu chốt ba vé. Chị chờ em đọc mã.

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

Ừ, em đọc mã và nhắc lại tổng tiền cho chị.

### Expected Agent Response

Dạ, ba vé đã xác nhận với mã VA-CASE_019, tổng tiền 1.350.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "SG-DL-20260721-2330-LIMO",
    "customer_name": "Lê Thị Kim Oanh",
    "customer_phone": "0909000019"
  },
  "expected_result": {
    "booking_id": "VA-CASE_019",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_019",
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
  "travel_date": "2026-07-21",
  "departure_time": "23:30",
  "trip_id": "SG-DL-20260721-2330-LIMO",
  "passenger_count": 3,
  "vehicle_type": "Limousine 22 Phòng",
  "seat_preference": "ba phòng tầng dưới gần nhau",
  "assigned_seats": [
    "P01",
    "P02",
    "P03"
  ],
  "pickup_location": "Ngã tư Hàng Xanh",
  "dropoff_location": "Chợ Đà Lạt",
  "customer_name": "Lê Thị Kim Oanh",
  "customer_phone": "0909000019",
  "passenger_details": [
    {
      "name": "Lê Thị Kim Oanh",
      "type": "ADULT",
      "seat": "P01"
    },
    {
      "name": "Trần Gia Nhi",
      "type": "CHILD",
      "seat": "P02"
    },
    {
      "name": "Trần Quốc Bảo",
      "type": "ADULT",
      "seat": "P03"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_019",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Lê Thị Kim Oanh",
    "phone": "0909000019"
  },
  "passengers": {
    "count": 3,
    "details": [
      {
        "name": "Lê Thị Kim Oanh",
        "type": "ADULT",
        "seat": "P01"
      },
      {
        "name": "Trần Gia Nhi",
        "type": "CHILD",
        "seat": "P02"
      },
      {
        "name": "Trần Quốc Bảo",
        "type": "ADULT",
        "seat": "P03"
      }
    ]
  },
  "trip": {
    "trip_id": "SG-DL-20260721-2330-LIMO",
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-21",
    "departure_time": "23:30",
    "arrival_time": "07:00"
  },
  "vehicle": {
    "type": "Limousine 22 Phòng",
    "seat_preference": "ba phòng tầng dưới gần nhau",
    "assigned_seats": [
      "P01",
      "P02",
      "P03"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Ngã tư Hàng Xanh",
    "dropoff_location": "Chợ Đà Lạt"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 450000,
    "total_fare_vnd": 1350000
  },
  "booking": {
    "booking_id": "VA-CASE_019",
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
- Mã vé: VA-CASE_019
- Khách hàng: Lê Thị Kim Oanh
- Số điện thoại: 0909000019
- Tuyến: Sài Gòn → Đà Lạt
- Khởi hành: 2026-07-21 23:30
- Loại xe: Limousine 22 Phòng
- Ghế: P01, P02, P03
- Điểm đón: Ngã tư Hàng Xanh
- Điểm trả: Chợ Đà Lạt
- Số hành khách: 3
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu đúng hông, nghen, bữa và tui mà vẫn giữ lời thoại miền Nam tự nhiên, không cường điệu âm địa phương.
- Áp dụng chính sách trẻ em có ghế riêng và chính sách xe đẩy gấp gọn đúng nội dung khách hỏi.
- Xếp bé Nhi ở P02 giữa mẹ P01 và ba P03, đúng quan hệ liền kề của ba phòng tầng dưới.
- Chỉ phát hành ba vé sau khi khách đọc lại đúng từng tên, vị trí và tổng tiền.
