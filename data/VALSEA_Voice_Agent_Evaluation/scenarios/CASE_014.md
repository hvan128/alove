# CASE_014 — Đổi giờ, loại xe, số người và điểm đón trước khi chốt

## 1. Scenario Metadata

- Scenario type: hotline_behavior
- Customer region: Miền Nam
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: hard
- Call datetime: 2026-07-19T19:20:00+07:00
- Coverage tags: changed_mind, change_options

## 2. Customer Persona

- Age: 25
- Location: Thành phố Hồ Chí Minh
- Speaking style: Quyết định nhanh rồi liên tục đổi theo nhóm bạn
- Calling context: Đứng ra đặt chuyến Đà Lạt cho nhóm cuối tuần

## 3. Conversation

## Turn 1

### Customer

Alo em, anh muốn đặt vé từ Sài Gòn lên Đà Lạt tối ngày 21 tháng Bảy.

### Expected Agent Response

Dạ, em ghi tuyến Sài Gòn đi Đà Lạt ngày 21 tháng 7 năm 2026. Nhóm mình có mấy người ạ?

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

Lúc này chắc hai người thôi, tụi anh muốn coi chuyến nào đi tối.

### Expected Agent Response

Dạ, em sẽ kiểm tra các chuyến tối còn ít nhất hai chỗ.

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
    "passenger_count": 2
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
  "set": {
    "passenger_count": 2
  },
  "clear": []
}
```

## Turn 3

### Customer

Có những xe gì với mấy giờ vậy em, nói cả giá để anh lựa.

### Expected Agent Response

Dạ, 22 giờ có giường nằm 34 chỗ giá 320.000 đồng một người; 23 giờ 30 có Limousine 22 Phòng giá 450.000 đồng một người.

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

Thôi lấy xe giường nằm 22 giờ trước đi, tiết kiệm hơn.

### Expected Agent Response

Dạ, em tạm chọn chuyến 22 giờ, giường nằm 34 chỗ. Anh muốn đón ở điểm nào?

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
    "trip_id": "SG-DL-20260721-2200-GN34",
    "departure_time": "22:00",
    "vehicle_type": "Giường nằm 34 chỗ"
  },
  "clear": []
}
```

## Turn 5

### Customer

Đón ở Văn phòng Phạm Ngũ Lão nha, hai đứa đang tính ăn tối gần đó.

### Expected Agent Response

Dạ, em ghi Văn phòng Phạm Ngũ Lão làm điểm đón.

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
    "pickup_location": "Văn phòng Phạm Ngũ Lão"
  },
  "clear": []
}
```

## Turn 6

### Customer

Khoan, bạn Minh vừa tham gia thành ba người; nó muốn phòng riêng và chỉ tới kịp chuyến 23 giờ 30, đổi giùm anh.

### Expected Agent Response

Dạ, em cập nhật ba hành khách và tìm lại. Chuyến 23 giờ 30 Limousine 22 Phòng còn đủ ba phòng.

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
      "SG-DL-20260721-2330-LIMO"
    ]
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "passenger_count": 3
  },
  "clear": [
    "trip_id",
    "departure_time",
    "vehicle_type",
    "seat_preference",
    "assigned_seats",
    "passenger_details",
    "explicit_confirmation"
  ]
}
```

## Turn 7

### Customer

Ừ chọn luôn chuyến 23 giờ 30, xe Limousine 22 Phòng nha.

### Expected Agent Response

Dạ, em đã đổi sang chuyến 23 giờ 30, Limousine 22 Phòng, đơn giá 450.000 đồng mỗi người.

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
    "trip_id": "SG-DL-20260721-2330-LIMO",
    "departure_time": "23:30",
    "vehicle_type": "Limousine 22 Phòng"
  },
  "clear": []
}
```

## Turn 8

### Customer

Điểm đón cũng đổi qua Ngã tư Hàng Xanh nhé, Minh ở bên đó tiện hơn.

### Expected Agent Response

Dạ, em đã đổi điểm đón sang Ngã tư Hàng Xanh. Em sẽ dùng điểm này cho vé của anh.

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
    "pickup_location": "Ngã tư Hàng Xanh"
  },
  "clear": []
}
```

## Turn 9

### Customer

Tới Đà Lạt cho tụi anh xuống Chợ Đà Lạt, sáng đi bộ ra trung tâm.

### Expected Agent Response

Dạ, điểm trả là Chợ Đà Lạt. Anh cho em xin tên và số điện thoại người đặt.

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
    "dropoff_location": "Chợ Đà Lạt"
  },
  "clear": []
}
```

## Turn 10

### Customer

Anh Võ Gia Huy, số không chín ba bốn không không không không một bốn.

### Expected Agent Response

Dạ, em ghi Võ Gia Huy, số 0934000014. Anh cho tên hai người còn lại và yêu cầu vị trí phòng ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ASK_MISSING_INFORMATION",
  "missing_fields": [
    "passenger_details",
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
    "customer_name": "Võ Gia Huy",
    "customer_phone": "0934000014"
  },
  "clear": []
}
```

## Turn 11

### Customer

Hai bạn là Nguyễn Bảo Trân với Lâm Nhật Minh, cả ba đều người lớn.

### Expected Agent Response

Dạ, em đã ghi ba tên. Anh muốn các phòng ở tầng nào và có cần gần nhau không?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CAPTURE_PASSENGER_DETAILS",
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
  "set": {},
  "clear": []
}
```

## Turn 12

### Customer

Cho ba phòng tầng dưới gần nhau, để cả nhóm xuống xe cho lẹ.

### Expected Agent Response

Dạ, P01, P02 và P03 cùng tầng dưới, phía trước và nối liền nhau đang còn; em giữ ba phòng, tổng 1.350.000 đồng.

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

## Turn 13

### Customer

Gắn P01 cho Huy, P02 cho Bảo Trân, P03 cho Nhật Minh nha em.

### Expected Agent Response

Dạ, em đã gắn đúng ba hành khách với P01, P02 và P03. Anh chọn phương thức thanh toán nào?

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
        "name": "Võ Gia Huy",
        "type": "ADULT",
        "seat": "P01"
      },
      {
        "name": "Nguyễn Bảo Trân",
        "type": "ADULT",
        "seat": "P02"
      },
      {
        "name": "Lâm Nhật Minh",
        "type": "ADULT",
        "seat": "P03"
      }
    ]
  },
  "clear": []
}
```

## Turn 14

### Customer

Để QR đi, nhưng anh chưa quét ngay đâu.

### Expected Agent Response

Dạ, em ghi thanh toán QR và hiện đang chờ thanh toán; chỉ khi giao dịch thành công mới chuyển sang đã thanh toán.

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
    "payment_method": "QR",
    "payment_status": "PENDING"
  },
  "clear": []
}
```

## Turn 15

### Customer

Anh đổi nhiều quá, em đọc đúng bản cuối thôi để anh dò lại.

### Expected Agent Response

Dạ: ba người đi Sài Gòn đến Đà Lạt ngày 21 tháng 7, chuyến 23 giờ 30 Limousine 22 Phòng; P01, P02, P03; đón Ngã tư Hàng Xanh, trả Chợ Đà Lạt, QR đang chờ thanh toán. Anh xác nhận bản cuối này chứ ạ?

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

## Turn 16

### Customer

Đúng bản cuối đó: ba người, 23 giờ 30, Hàng Xanh; anh xác nhận và chốt ba vé theo bản này luôn.

### Expected Agent Response

Dạ, em đã ghi nhận ba vé theo thông tin anh vừa xác nhận; thông tin hai người lúc đầu đã được thay rồi ạ.

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

## Turn 17

### Customer

Ừ, anh chờ mã mới với tổng tiền đúng cho ba người.

### Expected Agent Response

Dạ, ba vé theo bản cuối đã xác nhận với mã VA-CASE_014, tổng tiền 1.350.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "SG-DL-20260721-2330-LIMO",
    "customer_name": "Võ Gia Huy",
    "customer_phone": "0934000014"
  },
  "expected_result": {
    "booking_id": "VA-CASE_014",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_014",
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
  "customer_name": "Võ Gia Huy",
  "customer_phone": "0934000014",
  "passenger_details": [
    {
      "name": "Võ Gia Huy",
      "type": "ADULT",
      "seat": "P01"
    },
    {
      "name": "Nguyễn Bảo Trân",
      "type": "ADULT",
      "seat": "P02"
    },
    {
      "name": "Lâm Nhật Minh",
      "type": "ADULT",
      "seat": "P03"
    }
  ],
  "payment_method": "QR",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_014",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Võ Gia Huy",
    "phone": "0934000014"
  },
  "passengers": {
    "count": 3,
    "details": [
      {
        "name": "Võ Gia Huy",
        "type": "ADULT",
        "seat": "P01"
      },
      {
        "name": "Nguyễn Bảo Trân",
        "type": "ADULT",
        "seat": "P02"
      },
      {
        "name": "Lâm Nhật Minh",
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
    "method": "QR",
    "status": "PENDING",
    "unit_fare_vnd": 450000,
    "total_fare_vnd": 1350000
  },
  "booking": {
    "booking_id": "VA-CASE_014",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 16
  }
}
```

## 6. Final Ticket

### VÉ XE ALOVE
- Mã vé: VA-CASE_014
- Khách hàng: Võ Gia Huy
- Số điện thoại: 0934000014
- Tuyến: Sài Gòn → Đà Lạt
- Khởi hành: 2026-07-21 23:30
- Loại xe: Limousine 22 Phòng
- Ghế: P01, P02, P03
- Điểm đón: Ngã tư Hàng Xanh
- Điểm trả: Chợ Đà Lạt
- Số hành khách: 3
- Thanh toán: QR | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Khi nhóm tăng từ hai lên ba người, phải tìm lại chuyến và xóa lựa chọn xe, ghế cùng hành khách phụ thuộc trước đó.
- Chỉ giữ chuyến 23 giờ 30, ba phòng P01–P03 và điểm đón Hàng Xanh ở trạng thái cuối.
- Diễn đạt QR đang chờ thanh toán bằng ngôn ngữ tự nhiên, không coi là đã trả tiền.
- Recap và vé cuối tuyệt đối không được tái sử dụng phương án hai người hoặc chuyến 22 giờ ban đầu.
