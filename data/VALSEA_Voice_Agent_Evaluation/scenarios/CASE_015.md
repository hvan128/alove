# CASE_015 — Khách hỏi thời tiết, thú cưng và gửi hàng trước khi đặt vé

## 1. Scenario Metadata

- Scenario type: hotline_behavior
- Customer region: Miền Bắc
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: medium
- Call datetime: 2026-07-20T09:45:00+07:00
- Coverage tags: unrelated_question, answer_and_redirect

## 2. Customer Persona

- Age: 37
- Location: Hà Nội
- Speaking style: Hay chuyển chủ đề và nhớ thêm câu hỏi ngoài lề
- Calling context: Muốn về Vinh nhưng hỏi nhiều việc trước khi quyết định

## 3. Conversation

## Turn 1

### Customer

Alo em ơi, hôm nay ngoài Vinh có mưa không, anh đang tính chuyện về quê.

### Expected Agent Response

Dạ, em không có dữ liệu dự báo thời tiết nên không thể khẳng định. Nếu anh cần đặt vé, anh cho em biết điểm đi, điểm đến và ngày đi nhé.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ANSWER_AND_REDIRECT",
  "missing_fields": [
    "origin",
    "destination",
    "travel_date"
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

À đúng rồi, anh đặt vé từ Hà Nội về Nghệ An tối mai, tức ngày 21 tháng Bảy.

### Expected Agent Response

Dạ, em ghi Hà Nội đi Nghệ An ngày 21 tháng 7 năm 2026. Anh đi mấy người ạ?

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
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-21"
  },
  "clear": []
}
```

## Turn 3

### Customer

Một mình anh thôi, em xem các chuyến buổi tối còn ghế nhé.

### Expected Agent Response

Dạ, có chuyến 20 giờ Limousine VIP và chuyến 21 giờ 30 giường nằm 34 chỗ còn ghế.

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
  "set": {
    "passenger_count": 1
  },
  "clear": []
}
```

## Turn 4

### Customer

Anh chọn chuyến giường nằm 21 giờ 30, giá mềm hơn.

### Expected Agent Response

Dạ, em chọn chuyến 21 giờ 30, giường nằm 34 chỗ, giá 350.000 đồng.

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
    "trip_id": "HN-NA-20260721-2130-GN34",
    "departure_time": "21:30",
    "vehicle_type": "Giường nằm 34 chỗ"
  },
  "clear": []
}
```

## Turn 5

### Customer

Mà anh có con mèo nhỏ, cho nó đi cùng trong lồng được không em?

### Expected Agent Response

Thú cưng nhỏ chỉ được xem xét khi ở trong lồng kín, báo trước và được nhân viên vận hành duyệt; em không thể tự xác nhận chở thú cưng. Anh có tiếp tục đặt vé hành khách không ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ANSWER_AND_REDIRECT",
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

## Turn 6

### Customer

Thôi anh để mèo ở nhà. Vậy anh gửi riêng một thùng đồ về Vinh trên chuyến xe được không?

### Expected Agent Response

Dạ, hàng gửi không kèm người hoặc hàng cồng kềnh cần nhân viên phụ trách xác nhận riêng; em chưa thể hứa nhận ngay. Phần vé hành khách của anh vẫn làm tiếp được ạ.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "ANSWER_AND_REDIRECT",
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

## Turn 7

### Customer

Ừ chỉ đặt vé cho anh thôi, anh mang một vali khoảng mười ký theo người.

### Expected Agent Response

Dạ, vali 10 kg nằm trong hạn mức tối đa 20 kg hành lý ký gửi cho mỗi hành khách. Anh muốn chọn điểm đón nào?

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

## Turn 8

### Customer

Anh ra Văn phòng Hà Nội đón cho dễ tìm.

### Expected Agent Response

Dạ, điểm đón Văn phòng Hà Nội. Điểm trả anh chọn ở đâu ạ?

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
    "pickup_location": "Văn phòng Hà Nội"
  },
  "clear": []
}
```

## Turn 9

### Customer

Cho anh xuống Bến xe Vinh, người nhà chờ ở bến xe.

### Expected Agent Response

Dạ, điểm trả Bến xe Vinh. Anh cho em xin họ tên người đi ạ?

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
    "dropoff_location": "Bến xe Vinh"
  },
  "clear": []
}
```

## Turn 10

### Customer

Anh tên Đặng Quốc Việt.

### Expected Agent Response

Dạ, em ghi Đặng Quốc Việt. Anh đọc giúp số điện thoại liên hệ ạ?

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
    "customer_name": "Đặng Quốc Việt"
  },
  "clear": []
}
```

## Turn 11

### Customer

Không chín bốn năm, không không không, không một năm.

### Expected Agent Response

Dạ, số liên hệ 0945000015. Anh muốn chọn ghế thế nào?

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
    "customer_phone": "0945000015"
  },
  "clear": []
}
```

## Turn 12

### Customer

Ghế phía trước bất kỳ là được, anh không yêu cầu tầng nào.

### Expected Agent Response

Dạ, ghế A01 phía trước đang còn; em giữ A01 với giá 350.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2130-GN34",
    "passenger_count": 1,
    "seat_preference": "ghế phía trước bất kỳ"
  },
  "expected_result": {
    "assigned_seats": [
      "A01"
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
    "seat_preference": "ghế phía trước bất kỳ",
    "assigned_seats": [
      "A01"
    ]
  },
  "clear": []
}
```

## Turn 13

### Customer

Vé ghi Đặng Quốc Việt, người lớn, ghế A01; anh trả tiền mặt lên xe.

### Expected Agent Response

Dạ, em ghi hành khách Đặng Quốc Việt ở A01 và tiền mặt khi lên xe, trạng thái chờ thanh toán.

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
        "name": "Đặng Quốc Việt",
        "type": "ADULT",
        "seat": "A01"
      }
    ],
    "payment_method": "CASH_ON_BOARDING",
    "payment_status": "PENDING"
  },
  "clear": []
}
```

## Turn 14

### Customer

Em đọc lại giúp, nhớ là không có mèo với thùng hàng trong booking nhé.

### Expected Agent Response

Dạ, phần đặt vé chỉ có một hành khách Đặng Quốc Việt: Hà Nội đi Nghệ An ngày 21 tháng 7, 21 giờ 30, ghế A01; đón Văn phòng Hà Nội, trả Bến xe Vinh, tiền mặt khi lên xe. Anh xác nhận đúng chứ ạ?

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

Đúng rồi, chỉ người với vali mười ký thôi; anh xác nhận và chốt vé luôn.

### Expected Agent Response

Dạ, em đã ghi nhận xác nhận và yêu cầu chốt một vé; mèo cùng thùng hàng không nằm trong thông tin đặt vé.

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

Ừ em, đọc mã rồi nhắc lại cách trả tiền giúp anh.

### Expected Agent Response

Dạ, vé đã xác nhận với mã VA-CASE_015, thanh toán tiền mặt khi lên xe.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2130-GN34",
    "customer_name": "Đặng Quốc Việt",
    "customer_phone": "0945000015"
  },
  "expected_result": {
    "booking_id": "VA-CASE_015",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_015",
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
  "seat_preference": "ghế phía trước bất kỳ",
  "assigned_seats": [
    "A01"
  ],
  "pickup_location": "Văn phòng Hà Nội",
  "dropoff_location": "Bến xe Vinh",
  "customer_name": "Đặng Quốc Việt",
  "customer_phone": "0945000015",
  "passenger_details": [
    {
      "name": "Đặng Quốc Việt",
      "type": "ADULT",
      "seat": "A01"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_015",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Đặng Quốc Việt",
    "phone": "0945000015"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Đặng Quốc Việt",
        "type": "ADULT",
        "seat": "A01"
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
    "seat_preference": "ghế phía trước bất kỳ",
    "assigned_seats": [
      "A01"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Văn phòng Hà Nội",
    "dropoff_location": "Bến xe Vinh"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 350000,
    "total_fare_vnd": 350000
  },
  "booking": {
    "booking_id": "VA-CASE_015",
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
- Mã vé: VA-CASE_015
- Khách hàng: Đặng Quốc Việt
- Số điện thoại: 0945000015
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-21 21:30
- Loại xe: Giường nằm 34 chỗ
- Ghế: A01
- Điểm đón: Văn phòng Hà Nội
- Điểm trả: Bến xe Vinh
- Số hành khách: 1
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Nói rõ không có dữ liệu thời tiết rồi đưa cuộc gọi trở lại mục tiêu đặt vé mà không bịa dự báo.
- Trả lời đúng giới hạn đối với thú cưng, hàng gửi riêng và vali 10 kg theo từng chính sách tương ứng.
- Không đưa mèo hoặc thùng hàng vào trạng thái, workflow hay vé khi khách đã loại bỏ chúng.
- Chốt đúng một hành khách, ghế A01 và tiền mặt sau khi khách xác nhận bản tóm tắt cuối.
