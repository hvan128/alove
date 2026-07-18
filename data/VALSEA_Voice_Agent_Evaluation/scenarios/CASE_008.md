# CASE_008 — Phụ huynh đổi điểm đón trả và hỏi về xe đẩy

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Hà Nội
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-18T19:10:00+07:00

## 2. Customer Persona

Age: 36
Location: Tây Hồ, Hà Nội
Speaking style: Chu đáo, hỏi kỹ hành lý của trẻ nhỏ và đổi địa điểm khi người thân sắp xếp lại.
Calling context: Đặt ba vé cho một phụ huynh và hai con đi Hà Tĩnh ngày 20/07.

## 3. Conversation

## Turn 1

### Customer

Alo em, chị đặt ba vé Hà Nội vào Hà Tĩnh ngày 20 cho chị với hai con.

### Expected Agent Response

Em chào chị. Em ghi nhận Hà Nội đi Hà Tĩnh ngày 20/07/2026, 3 hành khách. Chị muốn chuyến nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","destination":"Hà Tĩnh","travel_date":"2026-07-20","passenger_count":3},"clear":[]}
```

## Turn 2

### Customer

Khoảng bảy giờ tối có chuyến giường nằm không?

### Expected Agent Response

Có chuyến giường nằm 34 chỗ lúc 19:00, đến Hà Tĩnh lúc 01:00, giá 390.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Hà Tĩnh","travel_date":"2026-07-20","passenger_count":3},"expected_result":{"trip_ids":["HN-HT-20260720-1900-GN34"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Chọn chuyến 19:00 đó nhé.

### Expected Agent Response

Dạ, em chọn chuyến 19:00 ngày 20/07, giường nằm 34 chỗ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"19:00","trip_id":"HN-HT-20260720-1900-GN34","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 4

### Customer

Ba mẹ con cần ba ghế gần nhau để chị trông hai bé.

### Expected Agent Response

Còn A01, A02, A03 cùng tầng trên phía trước và nối liền thành một dãy gần nhau.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"PRESENT_TRIP_OPTIONS","missing_fields":["assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Ba ghế gần nhau cùng khu vực"},"clear":[]}
```

## Turn 5

### Customer

Vậy giữ A01, A02, A03 cho ba mẹ con.

### Expected Agent Response

Em đã giữ A01, A02, A03; tổng 1.170.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"HN-HT-20260720-1900-GN34","passenger_count":3,"seat_preference":"Ba ghế gần nhau cùng khu vực"},"expected_result":{"assigned_seats":["A01","A02","A03"],"unit_fare_vnd":390000,"total_fare_vnd":1170000}}
```

### Expected Internal State Update

```json
{"set":{"assigned_seats":["A01","A02","A03"]},"clear":[]}
```

## Turn 6

### Customer

Tên là Vũ Mai Phương A01, bé Vũ Gia Bảo A02 và bé Vũ Hà My A03.

### Expected Agent Response

Em đã ghi chị Vũ Mai Phương là người lớn; hai bé Gia Bảo và Hà My là trẻ em, mỗi bé có ghế riêng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Vũ Mai Phương","passenger_details":[{"name":"Vũ Mai Phương","type":"ADULT","seat":"A01"},{"name":"Vũ Gia Bảo","type":"CHILD","seat":"A02"},{"name":"Vũ Hà My","type":"CHILD","seat":"A03"}]},"clear":[]}
```

## Turn 7

### Customer

Ban đầu chị định lên ở Bến xe Mỹ Đình.

### Expected Agent Response

Dạ, em tạm chọn Bến xe Mỹ Đình; gia đình cần có mặt trước 18:30.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Mỹ Đình"},"clear":[]}
```

## Turn 8

### Customer

Điểm trả trước mắt là Bến xe Hà Tĩnh nhé.

### Expected Agent Response

Em đã tạm chọn Bến xe Hà Tĩnh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe Hà Tĩnh"},"clear":[]}
```

## Turn 9

### Customer

Chị có xe đẩy trẻ em gấp gọn, hành lý đó mang theo được không?

### Expected Agent Response

Xe đẩy gấp gọn được tính trong hạn mức hành lý ký gửi. Mỗi người có tối đa 20 kg ký gửi và một túi xách tay tối đa 7 kg.

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

Người nhà vừa bảo ra Công viên Hòa Bình tiện hơn, đổi điểm đón sang đó giúp chị.

### Expected Agent Response

Dạ, em đổi điểm đón từ Bến xe Mỹ Đình sang Công viên Hòa Bình.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Công viên Hòa Bình"},"clear":[]}
```

## Turn 11

### Customer

Điểm trả cũng đổi luôn, cho ba mẹ con xuống Ngã ba Đồng Lộc.

### Expected Agent Response

Em đã đổi điểm trả sang Ngã ba Đồng Lộc, là điểm hợp lệ của chuyến.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Ngã ba Đồng Lộc"},"clear":[]}
```

## Turn 12

### Customer

Số chị Phương là 0989012348.

### Expected Agent Response

Dạ, em ghi người đặt Vũ Mai Phương, số 0989012348.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0989012348"},"clear":[]}
```

## Turn 13

### Customer

Chị trả QR, cứ để trạng thái chờ nhé.

### Expected Agent Response

Em ghi thanh toán bằng QR và hiện đang chờ giao dịch hoàn tất.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PENDING"},"clear":[]}
```

## Turn 14

### Customer

Chị vừa quét QR đủ 1.170.000 đồng, mã giao dịch SYN-QR-008-1170A; em kiểm tra giúp chị đã vào chưa.

### Expected Agent Response

Cổng thanh toán đã xác nhận giao dịch thành công, mã đối soát SYN-GW-008-OK-01. Khoản 1.170.000 đồng đã được thanh toán đủ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"VERIFY_PAYMENT","missing_fields":[],"arguments":{"payment_method":"QR","payment_reference":"SYN-QR-008-1170A"},"expected_result":{"payment_status":"PAID","provider_reference":"SYN-GW-008-OK-01"}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PAID"},"clear":[]}
```

## Turn 15

### Customer

Em nhắc lại điểm đón trả cuối, đừng lấy hai chỗ ban đầu nha.

### Expected Agent Response

Điểm cuối là đón Công viên Hòa Bình và trả Ngã ba Đồng Lộc; Bến xe Mỹ Đình và Bến xe Hà Tĩnh đã được thay thế.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 16

### Customer

Em xếp tên từng người với ghế rồi đọc cùng hành trình để chị đối chiếu nhé.

### Expected Agent Response

Chị Vũ Mai Phương ghế A01, bé Vũ Gia Bảo ghế A02 và bé Vũ Hà My ghế A03; số liên hệ 0989012348. Ba mẹ con đi Hà Nội–Hà Tĩnh ngày 20/07 lúc 19:00; đón Công viên Hòa Bình, trả Ngã ba Đồng Lộc; thanh toán QR đã hoàn tất; tổng 1.170.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 17

### Customer

Ba mẹ con đúng tên, đúng ghế và đúng hai điểm mới; chị đồng ý chốt.

### Expected Agent Response

Dạ, em đã ghi nhận chị đồng ý với hành trình cuối của ba mẹ con.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 18

### Customer

Gửi mã để chị lưu cùng giấy tờ của các bé nhé.

### Expected Agent Response

Dạ, vé của ba mẹ con đã được xác nhận với mã VA-CASE_008.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-HT-20260720-1900-GN34","customer_name":"Vũ Mai Phương","customer_phone":"0989012348"},"expected_result":{"booking_id":"VA-CASE_008","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_008","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Hà Nội",
  "destination": "Hà Tĩnh",
  "travel_date": "2026-07-20",
  "departure_time": "19:00",
  "trip_id": "HN-HT-20260720-1900-GN34",
  "passenger_count": 3,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "Ba ghế gần nhau cùng khu vực",
  "assigned_seats": [
    "A01",
    "A02",
    "A03"
  ],
  "pickup_location": "Công viên Hòa Bình",
  "dropoff_location": "Ngã ba Đồng Lộc",
  "customer_name": "Vũ Mai Phương",
  "customer_phone": "0989012348",
  "passenger_details": [
    {
      "name": "Vũ Mai Phương",
      "type": "ADULT",
      "seat": "A01"
    },
    {
      "name": "Vũ Gia Bảo",
      "type": "CHILD",
      "seat": "A02"
    },
    {
      "name": "Vũ Hà My",
      "type": "CHILD",
      "seat": "A03"
    }
  ],
  "payment_method": "QR",
  "payment_status": "PAID",
  "booking_id": "VA-CASE_008",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Vũ Mai Phương",
    "phone": "0989012348"
  },
  "passengers": {
    "count": 3,
    "details": [
      {
        "name": "Vũ Mai Phương",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Vũ Gia Bảo",
        "type": "CHILD",
        "seat": "A02"
      },
      {
        "name": "Vũ Hà My",
        "type": "CHILD",
        "seat": "A03"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-HT-20260720-1900-GN34",
    "origin": "Hà Nội",
    "destination": "Hà Tĩnh",
    "travel_date": "2026-07-20",
    "departure_time": "19:00",
    "arrival_time": "01:00"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "Ba ghế gần nhau cùng khu vực",
    "assigned_seats": [
      "A01",
      "A02",
      "A03"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Công viên Hòa Bình",
    "dropoff_location": "Ngã ba Đồng Lộc"
  },
  "payment": {
    "method": "QR",
    "status": "PAID",
    "unit_fare_vnd": 390000,
    "total_fare_vnd": 1170000
  },
  "booking": {
    "booking_id": "VA-CASE_008",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 17
  }
}
```

## 6. Final Ticket

VÉ XE KHÁCH
Mã vé: VA-CASE_008
Khách hàng: Vũ Mai Phương
Số điện thoại: 0989012348
Tuyến: Hà Nội → Hà Tĩnh
Khởi hành: 2026-07-20 19:00
Loại xe: Giường nằm 34 chỗ
Ghế: A01, A02, A03
Điểm đón: Công viên Hòa Bình
Điểm trả: Ngã ba Đồng Lộc
Số hành khách: 3
Thanh toán: QR | Đã thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Cập nhật cả pickup và drop-off cuối, không để địa điểm ban đầu lọt vào ticket.
- Trả lời xe đẩy gấp gọn theo policy hành lý, không thu thập dữ liệu không cần thiết.
- Gán đủ ba hành khách cho chuỗi ghế A01–A03 có thật.
- Chỉ ghi nhận khoản QR đã thanh toán sau khi cổng thanh toán trả kết quả thành công ở lượt 14.
