# CASE_003 — Trưởng nhóm miền Nam đặt năm vé cho đồng nghiệp

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Sài Gòn
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-18T14:20:00+07:00

## 2. Customer Persona

Age: 32
Location: Thủ Đức, Sài Gòn
Speaking style: Giọng miền Nam tự nhiên, nói gọn nhưng kiểm tra kỹ số chỗ.
Calling context: Đặt một chuyến đêm cho nhóm năm công nhân đi Đà Lạt.

## 3. Conversation

## Turn 1

### Customer

Alo em, anh cần năm vé từ Sài Gòn lên Đà Lạt tối mai cho nhóm công ty, còn chuyến không?

### Expected Agent Response

Em chào anh. Em ghi nhận 5 hành khách, Sài Gòn đi Đà Lạt ngày 19/07/2026. Anh muốn khởi hành khoảng mấy giờ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-19","passenger_count":5},"clear":[]}
```

## Turn 2

### Customer

Tầm mười giờ đêm. Em kiểm tra kỹ coi một chuyến còn đủ năm giường nha.

### Expected Agent Response

Ngày 19/07 có chuyến giường nằm 34 chỗ lúc 22:00 còn đúng 5 ghế, và chuyến Limousine 22 Phòng lúc 23:30 cũng còn đủ. Anh muốn chuyến nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-19","passenger_count":5},"expected_result":{"trip_ids":["SG-DL-20260719-2200-GN34","SG-DL-20260719-2330-LIMO"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Lấy chuyến 22:00 giường nằm cho đỡ tốn, tới Đà Lạt mấy giờ?

### Expected Agent Response

Chuyến 22:00 đến lúc 05:30 sáng hôm sau, giá 320.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"22:00","trip_id":"SG-DL-20260719-2200-GN34","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 4

### Customer

Năm ghế còn lại có ghế tầng dưới không, hay toàn tầng trên vậy em?

### Expected Agent Response

Còn B01 và D01 ở tầng dưới; A01, A03 và C01 ở tầng trên. Vì chỉ còn đúng năm ghế nên nhóm sẽ dùng cả năm vị trí này.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"PRESENT_TRIP_OPTIONS","missing_fields":["assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Cả năm ghế còn lại; ưu tiên hai ghế tầng dưới cho người dễ say"},"clear":[]}
```

## Turn 5

### Customer

Vậy giữ chỗ cả năm ghế đó luôn, B01 với D01 cho hai anh lớn tuổi hơn.

### Expected Agent Response

Em đã giữ A01, A03, B01, C01 và D01; tổng tiền 1.600.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260719-2200-GN34","passenger_count":5,"seat_preference":"Cả năm ghế còn lại; ưu tiên hai ghế tầng dưới cho người dễ say"},"expected_result":{"assigned_seats":["A01","A03","B01","C01","D01"],"unit_fare_vnd":320000,"total_fare_vnd":1600000}}
```

### Expected Internal State Update

```json
{"set":{"assigned_seats":["A01","A03","B01","C01","D01"]},"clear":[]}
```

## Turn 6

### Customer

Tên năm người là Trần Hoàng Phúc, Võ Minh Tài, Nguyễn Thanh Sơn, Lâm Quốc Bảo với Đặng Văn Hòa.

### Expected Agent Response

Em ghi lần lượt: Phúc A01, Tài A03, Sơn B01, Bảo C01 và Hòa D01; cả năm là hành khách người lớn.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Trần Hoàng Phúc","passenger_details":[{"name":"Trần Hoàng Phúc","type":"ADULT","seat":"A01"},{"name":"Võ Minh Tài","type":"ADULT","seat":"A03"},{"name":"Nguyễn Thanh Sơn","type":"ADULT","seat":"B01"},{"name":"Lâm Quốc Bảo","type":"ADULT","seat":"C01"},{"name":"Đặng Văn Hòa","type":"ADULT","seat":"D01"}]},"clear":[]}
```

## Turn 7

### Customer

Tụi anh lên ở Ngã tư Hàng Xanh được hông?

### Expected Agent Response

Được anh, Ngã tư Hàng Xanh là điểm đón của chuyến. Nhóm cần có mặt trước giờ xe chạy 30 phút.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Ngã tư Hàng Xanh"},"clear":[]}
```

## Turn 8

### Customer

Xuống ngay Bến xe liên tỉnh Đà Lạt nghen.

### Expected Agent Response

Dạ, em chọn điểm trả Bến xe liên tỉnh Đà Lạt.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe liên tỉnh Đà Lạt"},"clear":[]}
```

## Turn 9

### Customer

Mỗi người có một vali cỡ mười lăm ký, hành lý vậy ổn không em?

### Expected Agent Response

Ổn anh. Mỗi người được mang tối đa 20 kg hành lý ký gửi và một túi xách tay tối đa 7 kg.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 10

### Customer

Có một hộp dụng cụ hơi bự, nhà xe nhận luôn được chứ?

### Expected Agent Response

Đồ cồng kềnh cần nhân viên vận hành xác nhận riêng nên em chưa thể hứa chắc qua cuộc gọi này. Anh có thể bỏ yêu cầu đó hoặc nhờ nhân viên kiểm tra riêng.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 11

### Customer

Thôi hộp đó để lại công ty, chỉ mang năm vali thôi.

### Expected Agent Response

Dạ, em giữ thông tin đặt chỗ với năm vali trong hạn mức và không ghi nhận hộp dụng cụ cồng kềnh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 12

### Customer

Anh Phúc đứng tên, số 0934567803 nha.

### Expected Agent Response

Em đã ghi người đặt Trần Hoàng Phúc, số 0934567803.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0934567803"},"clear":[]}
```

## Turn 13

### Customer

Cho anh chuyển khoản ngân hàng, giờ mới ghi phương thức thôi chứ chưa báo đã trả nha.

### Expected Agent Response

Đúng anh. Em ghi thanh toán bằng chuyển khoản ngân hàng và hiện đang chờ giao dịch; chưa có kết quả thành công thì chưa coi là đã trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"BANK_TRANSFER","payment_status":"PENDING"},"clear":[]}
```

## Turn 14

### Customer

Anh cần một bản bàn giao rõ từng người với từng ghế, kèm chuyến và tổng tiền.

### Expected Agent Response

Người đặt Trần Hoàng Phúc, số 0934567803. Ghế được xếp: Trần Hoàng Phúc A01, Võ Minh Tài A03, Nguyễn Thanh Sơn B01, Lâm Quốc Bảo C01, Đặng Văn Hòa D01. Nhóm đi Sài Gòn–Đà Lạt ngày 19/07 lúc 22:00; đón Ngã tư Hàng Xanh, trả Bến xe liên tỉnh Đà Lạt; chuyển khoản đang chờ hoàn tất; tổng 1.600.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 15

### Customer

Anh đại diện cả nhóm đồng ý đúng danh sách và cách xếp ghế vừa đọc.

### Expected Agent Response

Dạ, em đã ghi nhận sự đồng ý của anh cho đủ năm hành khách.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 16

### Customer

Cho anh xin mã để gửi vào nhóm công ty.

### Expected Agent Response

Dạ, vé nhóm đã được xác nhận với mã VA-CASE_003.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260719-2200-GN34","customer_name":"Trần Hoàng Phúc","customer_phone":"0934567803"},"expected_result":{"booking_id":"VA-CASE_003","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_003","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Sài Gòn",
  "destination": "Đà Lạt",
  "travel_date": "2026-07-19",
  "departure_time": "22:00",
  "trip_id": "SG-DL-20260719-2200-GN34",
  "passenger_count": 5,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "Cả năm ghế còn lại; ưu tiên hai ghế tầng dưới cho người dễ say",
  "assigned_seats": [
    "A01",
    "A03",
    "B01",
    "C01",
    "D01"
  ],
  "pickup_location": "Ngã tư Hàng Xanh",
  "dropoff_location": "Bến xe liên tỉnh Đà Lạt",
  "customer_name": "Trần Hoàng Phúc",
  "customer_phone": "0934567803",
  "passenger_details": [
    {
      "name": "Trần Hoàng Phúc",
      "type": "ADULT",
      "seat": "A01"
    },
    {
      "name": "Võ Minh Tài",
      "type": "ADULT",
      "seat": "A03"
    },
    {
      "name": "Nguyễn Thanh Sơn",
      "type": "ADULT",
      "seat": "B01"
    },
    {
      "name": "Lâm Quốc Bảo",
      "type": "ADULT",
      "seat": "C01"
    },
    {
      "name": "Đặng Văn Hòa",
      "type": "ADULT",
      "seat": "D01"
    }
  ],
  "payment_method": "BANK_TRANSFER",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_003",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Trần Hoàng Phúc",
    "phone": "0934567803"
  },
  "passengers": {
    "count": 5,
    "details": [
      {
        "name": "Trần Hoàng Phúc",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Võ Minh Tài",
        "type": "ADULT",
        "seat": "A03"
      },
      {
        "name": "Nguyễn Thanh Sơn",
        "type": "ADULT",
        "seat": "B01"
      },
      {
        "name": "Lâm Quốc Bảo",
        "type": "ADULT",
        "seat": "C01"
      },
      {
        "name": "Đặng Văn Hòa",
        "type": "ADULT",
        "seat": "D01"
      }
    ]
  },
  "trip": {
    "trip_id": "SG-DL-20260719-2200-GN34",
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-19",
    "departure_time": "22:00",
    "arrival_time": "05:30"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "Cả năm ghế còn lại; ưu tiên hai ghế tầng dưới cho người dễ say",
    "assigned_seats": [
      "A01",
      "A03",
      "B01",
      "C01",
      "D01"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Ngã tư Hàng Xanh",
    "dropoff_location": "Bến xe liên tỉnh Đà Lạt"
  },
  "payment": {
    "method": "BANK_TRANSFER",
    "status": "PENDING",
    "unit_fare_vnd": 320000,
    "total_fare_vnd": 1600000
  },
  "booking": {
    "booking_id": "VA-CASE_003",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 15
  }
}
```

## 6. Final Ticket

VÉ XE KHÁCH
Mã vé: VA-CASE_003
Khách hàng: Trần Hoàng Phúc
Số điện thoại: 0934567803
Tuyến: Sài Gòn → Đà Lạt
Khởi hành: 2026-07-19 22:00
Loại xe: Giường nằm 34 chỗ
Ghế: A01, A03, B01, C01, D01
Điểm đón: Ngã tư Hàng Xanh
Điểm trả: Bến xe liên tỉnh Đà Lạt
Số hành khách: 5
Thanh toán: Chuyển khoản ngân hàng | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Xác minh chuyến 22:00 có đúng 5 ghế khả dụng trước khi giữ.
- Ghi đủ năm hành khách và ghép từng người với một seat ID catalog.
- Trả lời hành lý theo policy và không tự chấp nhận hộp dụng cụ cồng kềnh.
