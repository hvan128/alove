# CASE_013 — Lọc yêu cầu đặt vé từ câu chuyện thăm người nhà

## 1. Scenario Metadata

- Scenario type: hotline_behavior
- Customer region: Miền Bắc
- Audio condition: quiet_mobile
- Language: vi
- Difficulty: hard
- Call datetime: 2026-07-19T14:10:00+07:00
- Coverage tags: storytelling, context_memory

## 2. Customer Persona

- Age: 44
- Location: Hà Nội
- Speaking style: Kể chuyện dài, xen thông tin chuyến đi trong bối cảnh gia đình
- Calling context: Cùng mẹ vào Vinh thăm người thân đang điều trị

## 3. Conversation

## Turn 1

### Customer

Alo em ơi, chị có người em đang nằm viện trong Vinh, mẹ chị cứ sốt ruột nên hai mẹ con tính từ Hà Nội vào Nghệ An thứ Ba ngày 21; chị muốn hỏi vé xe đêm để sáng tới nơi.

### Expected Agent Response

Dạ, em hiểu chị cần hai vé Hà Nội đi Nghệ An ngày 21 tháng 7 năm 2026 để chị đi cùng mẹ. Chị ưu tiên giờ khởi hành nào ạ?

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
    "passenger_count": 2
  },
  "clear": []
}
```

## Turn 2

### Customer

Đúng hai người đó em, chị muốn đi khoảng tám giờ tối, đừng muộn quá vì mẹ chị khó ngủ.

### Expected Agent Response

Dạ, em kiểm tra được chuyến 20 giờ Limousine 21 Phòng VIP và chuyến 21 giờ 30 giường nằm 34 chỗ, đều còn đủ hai chỗ.

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
    "passenger_count": 2
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

Mẹ chị bảo phòng VIP đỡ bị làm phiền, vậy lấy chuyến 20 giờ đi.

### Expected Agent Response

Dạ, em chọn chuyến 20 giờ, Limousine 21 Phòng VIP, đơn giá 530.000 đồng mỗi người.

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
    "trip_id": "HN-NA-20260721-2000-VIP21",
    "departure_time": "20:00",
    "vehicle_type": "Limousine 21 Phòng VIP"
  },
  "clear": []
}
```

## Turn 4

### Customer

À mẹ chị mang một vali chừng mười lăm ký với túi xách nhỏ năm ký, hành lý vậy có được không?

### Expected Agent Response

Dạ, mỗi hành khách được tối đa 20 kg hành lý ký gửi và một túi xách tay tối đa 7 kg; số chị nêu nằm trong hạn mức. Mình tiếp tục chọn điểm đón nhé.

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

Hai mẹ con ra Bến xe Mỹ Đình cho chắc, chứ đón dọc đường chị sợ lỡ chuyến.

### Expected Agent Response

Dạ, em ghi điểm đón Bến xe Mỹ Đình. Điểm trả tại Nghệ An chị muốn chọn ở đâu ạ?

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

Cho xuống Văn phòng Vinh nhé, từ đó nhà người quen đến đón gần hơn.

### Expected Agent Response

Dạ, điểm trả là Văn phòng Vinh. Chị cho em xin họ tên người đặt vé ạ?

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
    "dropoff_location": "Văn phòng Vinh"
  },
  "clear": []
}
```

## Turn 7

### Customer

Chị là Phạm Thu Hà, còn mẹ chị tên Phạm Ngọc Lan.

### Expected Agent Response

Dạ, em ghi người đặt Phạm Thu Hà và hành khách thứ hai Phạm Ngọc Lan. Chị đọc giúp số điện thoại liên hệ ạ?

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
    "customer_name": "Phạm Thu Hà"
  },
  "clear": []
}
```

## Turn 8

### Customer

Số chị là không chín hai ba, không không không, không một ba.

### Expected Agent Response

Dạ, số liên hệ là 0923000013. Chị muốn hai phòng ở vị trí nào ạ?

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
    "customer_phone": "0923000013"
  },
  "clear": []
}
```

## Turn 9

### Customer

Nếu còn thì cho hai phòng tầng dưới liền nhau, để chị tiện để ý mẹ.

### Expected Agent Response

Dạ, hai phòng A01 và A02 tầng dưới phía trước, liền nhau đang còn. Em giữ hai phòng, tổng tiền 1.060.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2000-VIP21",
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

## Turn 10

### Customer

A01 ghi Phạm Thu Hà người lớn, A02 ghi Phạm Ngọc Lan là người cao tuổi nhé em.

### Expected Agent Response

Dạ, em đã gắn đúng tên và loại hành khách cho hai phòng A01, A02. Chị muốn thanh toán cách nào?

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
        "name": "Phạm Thu Hà",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Phạm Ngọc Lan",
        "type": "SENIOR",
        "seat": "A02"
      }
    ]
  },
  "clear": []
}
```

## Turn 11

### Customer

Chị thanh toán tiền mặt lúc lên xe, để còn lo cho mẹ trước.

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

Em kiểm tra giúp chị xem có đúng là xe đến Vinh khoảng một giờ sáng không?

### Expected Agent Response

Dạ đúng, chuyến khởi hành 20 giờ và dự kiến đến lúc 01 giờ. Em sẽ đọc lại toàn bộ thông tin đặt vé để chị kiểm tra.

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

Ừ em đọc chậm phần ngày, ghế với điểm đón cho chị nghe.

### Expected Agent Response

Dạ: hai hành khách Phạm Thu Hà và Phạm Ngọc Lan đi Hà Nội đến Nghệ An ngày 21 tháng 7, 20 giờ, Limousine VIP, phòng A01 và A02; đón Bến xe Mỹ Đình, trả Văn phòng Vinh, tiền mặt khi lên xe. Chị xác nhận đúng không ạ?

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

Đúng hết rồi em, chị xác nhận đúng ngày, đúng chuyến, đúng hai phòng và chốt hai vé luôn.

### Expected Agent Response

Dạ, em đã ghi nhận xác nhận cùng yêu cầu chốt hai vé. Chị chờ em trả mã và tổng tiền ngay sau đây.

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

Ừ, em đọc mã vé với tổng tiền chậm một chút cho chị ghi lại nhé.

### Expected Agent Response

Dạ, hai vé đã xác nhận với mã VA-CASE_013, tổng tiền 1.060.000 đồng và thanh toán khi lên xe.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2000-VIP21",
    "customer_name": "Phạm Thu Hà",
    "customer_phone": "0923000013"
  },
  "expected_result": {
    "booking_id": "VA-CASE_013",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
    "booking_id": "VA-CASE_013",
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
  "departure_time": "20:00",
  "trip_id": "HN-NA-20260721-2000-VIP21",
  "passenger_count": 2,
  "vehicle_type": "Limousine 21 Phòng VIP",
  "seat_preference": "hai phòng tầng dưới liền nhau",
  "assigned_seats": [
    "A01",
    "A02"
  ],
  "pickup_location": "Bến xe Mỹ Đình",
  "dropoff_location": "Văn phòng Vinh",
  "customer_name": "Phạm Thu Hà",
  "customer_phone": "0923000013",
  "passenger_details": [
    {
      "name": "Phạm Thu Hà",
      "type": "ADULT",
      "seat": "A01"
    },
    {
      "name": "Phạm Ngọc Lan",
      "type": "SENIOR",
      "seat": "A02"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_013",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Phạm Thu Hà",
    "phone": "0923000013"
  },
  "passengers": {
    "count": 2,
    "details": [
      {
        "name": "Phạm Thu Hà",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Phạm Ngọc Lan",
        "type": "SENIOR",
        "seat": "A02"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-NA-20260721-2000-VIP21",
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-21",
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
    "pickup_location": "Bến xe Mỹ Đình",
    "dropoff_location": "Văn phòng Vinh"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 530000,
    "total_fare_vnd": 1060000
  },
  "booking": {
    "booking_id": "VA-CASE_013",
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
- Mã vé: VA-CASE_013
- Khách hàng: Phạm Thu Hà
- Số điện thoại: 0923000013
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-21 20:00
- Loại xe: Limousine 21 Phòng VIP
- Ghế: A01, A02
- Điểm đón: Bến xe Mỹ Đình
- Điểm trả: Văn phòng Vinh
- Số hành khách: 2
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Tách đúng tuyến, ngày và hai hành khách khỏi câu chuyện dài về việc thăm người nhà.
- Trả lời hạn mức vali và túi xách đúng chính sách, không thêm điều kiện ngoài dữ liệu.
- Giữ đúng tên mẹ con, hai phòng A01–A02 liền nhau và tổng tiền 1.060.000 đồng qua toàn bộ cuộc gọi.
- Chỉ phát hành sau khi khách nghe recap và xác nhận rõ cả ngày, chuyến lẫn hai phòng.
