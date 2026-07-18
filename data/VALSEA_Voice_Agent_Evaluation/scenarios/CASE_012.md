# CASE_012 — Làm rõ mai mốt, tối tối và điểm đón gần nhà

## 1. Scenario Metadata

- Scenario type: hotline_behavior
- Customer region: Miền Bắc
- Audio condition: quiet_landline
- Language: vi
- Difficulty: hard
- Call datetime: 2026-07-19T08:30:00+07:00
- Coverage tags: vague_request, date_clarification

## 2. Customer Persona

- Age: 66
- Location: Hà Nội
- Speaking style: Chậm rãi, dùng mốc thời gian và địa điểm mơ hồ
- Calling context: Muốn về Vinh nhưng chỉ nhớ ngày theo cách nói tương đối

## 3. Conversation

## Turn 1

### Customer

Alo nhà xe đấy à, tôi muốn đặt cái vé về quê mà chưa nhớ phải nói những gì.

### Expected Agent Response

Dạ, cháu hỗ trợ cô đặt vé. Cô đi từ đâu đến đâu ạ?

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

Tôi từ Hà Nội về Vinh, chắc đi mai mốt ấy cháu ạ.

### Expected Agent Response

Dạ, cháu ghi tuyến Hà Nội đi Nghệ An. 'Mai mốt' của cô là ngày mai hay ngày kia tính từ hôm nay 19 tháng 7 ạ?

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CLARIFY_AMBIGUITY",
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
    "origin": "Hà Nội",
    "destination": "Nghệ An"
  },
  "clear": []
}
```

## Turn 3

### Customer

Ngày kia cơ, tức thứ Ba ngày 21 tháng Bảy, không phải ngày mai.

### Expected Agent Response

Dạ, ngày đi là 21 tháng 7 năm 2026. Cô muốn đi khoảng giờ nào và có mấy người ạ?

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
    "travel_date": "2026-07-21"
  },
  "clear": []
}
```

## Turn 4

### Customer

Tối tối thôi, chứ tôi không biết nhà xe có những giờ nào.

### Expected Agent Response

Dạ, cháu cần số hành khách để kiểm tra các chuyến tối còn đủ chỗ rồi sẽ đọc giờ cụ thể cho cô.

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
  "set": {},
  "clear": []
}
```

## Turn 5

### Customer

Có một mình tôi, cô lớn tuổi nên muốn đi xe đêm cho đỡ nắng.

### Expected Agent Response

Dạ, ngày 21 tháng 7 có chuyến 20 giờ xe Limousine và chuyến 21 giờ 30 xe giường nằm còn chỗ cho một người.

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

## Turn 6

### Customer

Chuyến 21 giờ 30 nhé, giờ ấy con tôi đưa ra bến kịp.

### Expected Agent Response

Dạ, cháu chọn chuyến 21 giờ 30, xe giường nằm 34 chỗ, giá 350.000 đồng.

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

## Turn 7

### Customer

Xe giường nằm thì tốt. Nhà xe có trung chuyển từ Phạm Văn Đồng không, hoặc điểm đón nào gần nhà cô?

### Expected Agent Response

Dạ, cháu không có dữ liệu xác nhận trung chuyển từ Phạm Văn Đồng nên không thể hứa. Chuyến này có Bến xe Mỹ Đình, Văn phòng Hà Nội hoặc Công viên Hòa Bình; cô chọn điểm nào ạ?

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

À thế Công viên Hòa Bình là gần nhất, cho cô đón ở đấy.

### Expected Agent Response

Dạ, điểm đón là Công viên Hòa Bình. Cô cần có mặt trước giờ khởi hành 30 phút; điểm trả cô chọn ở đâu ạ?

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

## Turn 9

### Customer

Cho cô xuống Bến xe Vinh, người nhà sẽ ra đón ở bến xe.

### Expected Agent Response

Dạ, điểm trả Bến xe Vinh. Cô cho cháu xin họ tên và số điện thoại liên hệ ạ.

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
    "dropoff_location": "Bến xe Vinh"
  },
  "clear": []
}
```

## Turn 10

### Customer

Tôi là Lê Thị Hòa, số không chín một hai không không không không một hai.

### Expected Agent Response

Dạ, cháu ghi Lê Thị Hòa, số 0912000012. Cô muốn vị trí giường thế nào ạ?

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
    "customer_name": "Lê Thị Hòa",
    "customer_phone": "0912000012"
  },
  "clear": []
}
```

## Turn 11

### Customer

Cô lớn tuổi, cho ghế tầng dưới phía trước để lên xuống cho dễ.

### Expected Agent Response

Dạ, ghế B02 tầng dưới phía trước đang còn; cháu giữ B02, giá 350.000 đồng.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "HOLD_SEATS",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2130-GN34",
    "passenger_count": 1,
    "seat_preference": "ghế tầng dưới phía trước"
  },
  "expected_result": {
    "assigned_seats": [
      "B02"
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
    "seat_preference": "ghế tầng dưới phía trước",
    "assigned_seats": [
      "B02"
    ]
  },
  "clear": []
}
```

## Turn 12

### Customer

Đúng rồi, hành khách chính là cô Lê Thị Hòa, tính là người cao tuổi nhé.

### Expected Agent Response

Dạ, cháu ghi hành khách cao tuổi Lê Thị Hòa, ghế B02. Cô muốn thanh toán bằng tiền mặt, QR hay chuyển khoản ạ?

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
        "name": "Lê Thị Hòa",
        "type": "SENIOR",
        "seat": "B02"
      }
    ]
  },
  "clear": []
}
```

## Turn 13

### Customer

Tôi không thạo điện thoại, trả tiền mặt lúc lên xe có được không?

### Expected Agent Response

Dạ được, nhà xe hỗ trợ tiền mặt khi lên xe; trạng thái sẽ là chờ thanh toán.

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

Cháu đọc lại kỹ ngày với giờ giúp cô, cô sợ nhầm mai mốt.

### Expected Agent Response

Dạ: cô Lê Thị Hòa đi một người từ Hà Nội đến Nghệ An ngày 21 tháng 7 năm 2026, chuyến 21 giờ 30, ghế B02; đón Công viên Hòa Bình, trả Bến xe Vinh, tiền mặt khi lên xe. Cô xác nhận thông tin này đúng chứ ạ?

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

Đúng ngày 21, đúng 21 giờ 30 và đúng các chỗ ấy; cô xác nhận, cháu chốt vé giúp cô luôn.

### Expected Agent Response

Dạ, cháu đã ghi nhận cả xác nhận và yêu cầu chốt vé. Cô chờ cháu trả mã rồi cháu nhắc lại cách thanh toán.

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

Ừ, cô đang nghe, cháu đọc mã rồi nhắc lại cách thanh toán nhé.

### Expected Agent Response

Dạ, vé đã xác nhận với mã VA-CASE_012. Cô thanh toán tiền mặt khi lên xe.

### Expected Agent Action

```json
{
  "intent": "BOOK_TICKET",
  "action": "CONFIRM_BOOKING",
  "missing_fields": [],
  "arguments": {
    "trip_id": "HN-NA-20260721-2130-GN34",
    "customer_name": "Lê Thị Hòa",
    "customer_phone": "0912000012"
  },
  "expected_result": {
    "booking_id": "VA-CASE_012",
    "booking_status": "CONFIRMED"
  }
}
```

### Expected Internal State Update

```json
{
  "set": {
      "booking_id": "VA-CASE_012",
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
  "seat_preference": "ghế tầng dưới phía trước",
  "assigned_seats": [
    "B02"
  ],
  "pickup_location": "Công viên Hòa Bình",
  "dropoff_location": "Bến xe Vinh",
  "customer_name": "Lê Thị Hòa",
  "customer_phone": "0912000012",
  "passenger_details": [
    {
      "name": "Lê Thị Hòa",
      "type": "SENIOR",
      "seat": "B02"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_012",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Lê Thị Hòa",
    "phone": "0912000012"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Lê Thị Hòa",
        "type": "SENIOR",
        "seat": "B02"
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
    "seat_preference": "ghế tầng dưới phía trước",
    "assigned_seats": [
      "B02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Công viên Hòa Bình",
    "dropoff_location": "Bến xe Vinh"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 350000,
    "total_fare_vnd": 350000
  },
  "booking": {
    "booking_id": "VA-CASE_012",
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
- Mã vé: VA-CASE_012
- Khách hàng: Lê Thị Hòa
- Số điện thoại: 0912000012
- Tuyến: Hà Nội → Nghệ An
- Khởi hành: 2026-07-21 21:30
- Loại xe: Giường nằm 34 chỗ
- Ghế: B02
- Điểm đón: Công viên Hòa Bình
- Điểm trả: Bến xe Vinh
- Số hành khách: 1
- Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
- Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Giải đúng “mai mốt” theo thời điểm cuộc gọi và bắt buộc khách chọn rõ ngày 21 tháng 7.
- Chỉ tìm chuyến tối sau khi đã biết số hành khách, rồi đọc giờ và loại xe dễ hiểu cho khách lớn tuổi.
- Không hứa trung chuyển Phạm Văn Đồng; chỉ ghi Công viên Hòa Bình sau lựa chọn rõ ràng.
- Phần đọc lại phải nhấn đúng ngày, giờ, ghế B02 và phương thức tiền mặt trước khi phát hành vé.
