# CASE_018 — Khách Hà Tĩnh làm rõ địa danh địa phương trước khi đặt

## 1. Scenario Metadata

- Scenario type: regional_speech
- Customer region: Hà Tĩnh
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: hard
- Call datetime: 2026-07-20T17:25:00+07:00
- Coverage tags: ha_tinh, regional_language

## 2. Customer Persona

- Age: 48
- Location: Thành phố Hà Tĩnh
- Speaking style: Dùng chi, vô, rứa trong lời nói tự nhiên và mô tả điểm đón bằng mốc địa phương
- Calling context: Đặt vé ra Hà Nội, ban đầu yêu cầu đón gần vòng xuyến

## 3. Conversation

## Turn 1

### Customer

Alo em, chị ở Hà Tĩnh muốn đặt vé ra Hà Nội ngày kia, nhà xe có chuyến chi không?

### Expected Agent Response

Dạ, ngày kia tính từ 20 tháng 7 là ngày 22 tháng 7. Chị đi mấy người và muốn đi buổi nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CLARIFY_AMBIGUITY",
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
    "origin": "Hà Tĩnh",
    "destination": "Hà Nội",
    "travel_date": "2026-07-22"
  },
  "clear": []
}
```

## Turn 2

### Customer

Một mình chị, đi tối cho mát, khoảng bảy giờ có thì tốt.

### Expected Agent Response

Dạ, em tìm thấy chuyến 19 giờ ngày 22 tháng 7, giường nằm 34 chỗ, còn chỗ cho một người.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "SEARCH_TRIPS",
  "missing_fields": [],
  "arguments": {
    "origin": "Hà Tĩnh",
    "destination": "Hà Nội",
    "travel_date": "2026-07-22",
    "passenger_count": 1
  },
  "expected_result": {
    "trip_ids": [
      "HT-HN-20260722-1900-GN34"
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

## Turn 3

### Customer

Rứa thì lấy chuyến 19 giờ. Vé chuyến ni bao nhiêu em?

### Expected Agent Response

Dạ, chuyến 19 giờ có giá 390.000 đồng một người, dự kiến đến Hà Nội lúc 01 giờ.

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
    "trip_id": "HT-HN-20260722-1900-GN34",
    "departure_time": "19:00",
    "vehicle_type": "Giường nằm 34 chỗ"
  },
  "clear": []
}
```

## Turn 4

### Customer

Điểm đón cho chị chỗ vòng xuyến gần chợ thành phố được không, vô bến hơi vòng?

### Expected Agent Response

Dạ, 'vòng xuyến gần chợ' chưa phải tên điểm đón chính thức nên em chưa dám chọn thay chị. Chuyến có Bến xe Hà Tĩnh, Văn phòng Hà Tĩnh hoặc Ngã ba Đồng Lộc; chị chọn điểm nào ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CLARIFY_AMBIGUITY",
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

Có cách chi đón ngoài đường không, hay bắt buộc chọn ba chỗ đó?

### Expected Agent Response

Dạ, hệ thống hiện chỉ cho phép ba điểm đón em vừa nêu; địa danh ngoài danh sách cần nhân viên làm rõ, em không thể hứa đón ngoài đường.

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

Rứa thì ghi đúng Bến xe Hà Tĩnh, không phải tự hiểu là vòng xuyến nghe em.

### Expected Agent Response

Dạ, em chỉ ghi Bến xe Hà Tĩnh theo xác nhận của chị. Chị cần có mặt trước giờ khởi hành 30 phút.

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
    "pickup_location": "Bến xe Hà Tĩnh"
  },
  "clear": []
}
```

## Turn 7

### Customer

Ra Hà Nội chị xuống Bến xe Mỹ Đình.

### Expected Agent Response

Dạ, điểm trả Bến xe Mỹ Đình. Chị cho em xin họ tên và số điện thoại liên hệ ạ?

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

Chị Nguyễn Thị Xuân, số không chín tám tám không không không không một tám.

### Expected Agent Response

Dạ, em ghi Nguyễn Thị Xuân, số 0988000018. Chị muốn vị trí giường thế nào?

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
    "customer_name": "Nguyễn Thị Xuân",
    "customer_phone": "0988000018"
  },
  "clear": []
}
```

## Turn 9

### Customer

Cho chị ghế tầng dưới phía trước, chị mang túi nên muốn lên xuống nhanh.

### Expected Agent Response

Dạ, ghế B02 tầng dưới phía trước đang còn; em giữ B02, giá 390.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HT-HN-20260722-1900-GN34",
    "passenger_count": 1,
    "seat_preference": "ghế tầng dưới phía trước"
  },
  "expected_result": {
    "assigned_seats": [
      "B02"
    ],
    "unit_fare_vnd": 390000,
    "total_fare_vnd": 390000
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "seat_preference": "ghế tầng dưới phía trước",
    "assigned_seats": [
      "B02"
    ]
  },
  "clear": []
}
```

## Turn 10

### Customer

Tên Nguyễn Thị Xuân, người lớn, ghế B02 nghe em.

### Expected Agent Response

Dạ, em đã gắn hành khách Nguyễn Thị Xuân với B02. Chị muốn thanh toán cách nào?

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
        "name": "Nguyễn Thị Xuân",
        "type": "ADULT",
        "seat": "B02"
      }
    ]
  },
  "clear": []
}
```

## Turn 11

### Customer

Chị chọn QR nhưng chưa quét lúc ni, cứ để chờ thanh toán.

### Expected Agent Response

Dạ, em ghi thanh toán QR và hiện đang chờ; chưa có giao dịch thành công nên chưa thể coi là đã thanh toán.

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

## Turn 12

### Customer

Chuyến ni đến một giờ sáng phải không, có đổi điểm trả chi nữa không?

### Expected Agent Response

Dạ, theo lịch chuyến, xe dự kiến đến 01 giờ và điểm trả đang là Bến xe Mỹ Đình; em không tự thay đổi mục nào.

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

## Turn 13

### Customer

Đọc lại cho chị toàn bộ, nhất là đừng nhầm điểm vòng xuyến.

### Expected Agent Response

Dạ: Nguyễn Thị Xuân đi một người từ Hà Tĩnh ra Hà Nội ngày 22 tháng 7, 19 giờ, ghế B02; đón Bến xe Hà Tĩnh, trả Bến xe Mỹ Đình, thanh toán QR đang chờ. Chị xác nhận đúng không ạ?

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

Đúng rứa, đón Bến xe Hà Tĩnh; chị xác nhận hết và chốt vé ni luôn.

### Expected Agent Response

Dạ, em đã nhận xác nhận cùng yêu cầu chốt vé tại Bến xe Hà Tĩnh; điểm vòng xuyến sẽ không được dùng.

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

Ừ em, đọc mã vé và điểm đón cuối cho chị nghe.

### Expected Agent Response

Dạ, vé đã xác nhận với mã VA-CASE_018, đón đúng Bến xe Hà Tĩnh.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HT-HN-20260722-1900-GN34",
    "customer_name": "Nguyễn Thị Xuân",
    "customer_phone": "0988000018"
  },
  "expected_result": {
    "booking_id": "VA-CASE_018",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_018",
    "booking_status": "CONFIRMED"
  },
  "clear": []
}
```

## 4. Internal State Tracking

```json
{
  "origin": "Hà Tĩnh",
  "destination": "Hà Nội",
  "travel_date": "2026-07-22",
  "departure_time": "19:00",
  "trip_id": "HT-HN-20260722-1900-GN34",
  "passenger_count": 1,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "ghế tầng dưới phía trước",
  "assigned_seats": [
    "B02"
  ],
  "pickup_location": "Bến xe Hà Tĩnh",
  "dropoff_location": "Bến xe Mỹ Đình",
  "customer_name": "Nguyễn Thị Xuân",
  "customer_phone": "0988000018",
  "passenger_details": [
    {
      "name": "Nguyễn Thị Xuân",
      "type": "ADULT",
      "seat": "B02"
    }
  ],
  "payment_method": "QR",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_018",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Nguyễn Thị Xuân",
    "phone": "0988000018"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Nguyễn Thị Xuân",
        "type": "ADULT",
        "seat": "B02"
      }
    ]
  },
  "trip": {
    "trip_id": "HT-HN-20260722-1900-GN34",
    "origin": "Hà Tĩnh",
    "destination": "Hà Nội",
    "travel_date": "2026-07-22",
    "departure_time": "19:00",
    "arrival_time": "01:00"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "ghế tầng dưới phía trước",
    "assigned_seats": [
      "B02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Bến xe Hà Tĩnh",
    "dropoff_location": "Bến xe Mỹ Đình"
  },
  "payment": {
    "method": "QR",
    "status": "PENDING",
    "unit_fare_vnd": 390000,
    "total_fare_vnd": 390000
  },
  "booking": {
    "booking_id": "VA-CASE_018",
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
- Mã vé: VA-CASE_018
- Khách hàng: Nguyễn Thị Xuân
- Số điện thoại: 0988000018
- Tuyến: Hà Tĩnh → Hà Nội
- Khởi hành: 2026-07-22 19:00
- Loại xe: Giường nằm 34 chỗ
- Ghế: B02
- Điểm đón: Bến xe Hà Tĩnh
- Điểm trả: Bến xe Mỹ Đình
- Số hành khách: 1
- Thanh toán: QR | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Hiểu đúng chi, rứa, ni và vô trong câu của khách Hà Tĩnh mà không suy diễn thêm ý định.
- Từ chối tự ánh xạ “vòng xuyến gần chợ” và chỉ ghi Bến xe Hà Tĩnh sau lựa chọn rõ ràng.
- Đối chiếu đúng chuyến 19 giờ, ghế B02 và khoản QR còn chờ thanh toán với dữ liệu cố định.
- Recap, workflow và vé phải loại hoàn toàn địa điểm mơ hồ ban đầu.
