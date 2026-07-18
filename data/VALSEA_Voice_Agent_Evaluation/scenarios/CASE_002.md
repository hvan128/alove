# CASE_002 — Gia đình bốn người đổi một phòng để ngồi gần nhau

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Hà Nội
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-18T10:15:00+07:00

## 2. Customer Persona

Age: 38
Location: Nam Từ Liêm, Hà Nội
Speaking style: Nói nhanh, quan tâm sát sao chỗ của hai con và thường kiểm tra lại.
Calling context: Đặt vé cho hai người lớn và hai trẻ em đi Nghệ An ngày 20/07.

## 3. Conversation

## Turn 1

### Customer

Alo, chị cần đặt bốn vé từ Hà Nội về Nghệ An ngày 20, nhà chị đi cả gia đình.

### Expected Agent Response

Em chào chị. Em ghi nhận tuyến Hà Nội đi Nghệ An ngày 20/07/2026 cho 4 hành khách. Chị cho em biết nhóm có bao nhiêu người lớn và trẻ em nhé.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-20","passenger_count":4},"clear":[]}
```

## Turn 2

### Customer

Hai vợ chồng với hai bé, một bé mười tuổi và một bé sáu tuổi. Trẻ em có tính ghế không?

### Expected Agent Response

Dạ có chị. Hai bé cần đi cùng người lớn, có thông tin và ghế riêng; giá mỗi ghế bằng đơn giá niêm yết của chuyến.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Nhà chị muốn đi khoảng tám giờ tối, em tìm chuyến còn bốn phòng nhé.

### Expected Agent Response

Có chuyến 20:00 ngày 20/07, Limousine 21 Phòng VIP, còn đủ 4 chỗ và giá 530.000 đồng mỗi hành khách.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-20","passenger_count":4},"expected_result":{"trip_ids":["HN-NA-20260720-2000-VIP21"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 4

### Customer

Chọn chuyến VIP tám giờ đó. Xe đến Vinh lúc mấy giờ?

### Expected Agent Response

Chuyến đến lúc 01:00 ngày hôm sau. Em đã chọn Limousine 21 Phòng VIP lúc 20:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"20:00","trip_id":"HN-NA-20260720-2000-VIP21","vehicle_type":"Limousine 21 Phòng VIP"},"clear":[]}
```

## Turn 5

### Customer

Chị muốn hai vợ chồng ở tầng dưới, hai bé gần bố mẹ; bé lớn lại thích thử tầng trên.

### Expected Agent Response

Em có thể bố trí ba phòng tầng dưới A01, A02, B01 và một phòng tầng trên C01. A01–A02 là một cặp liền nhau; chị có muốn giữ phương án đó trước không?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"PRESENT_TRIP_OPTIONS","missing_fields":["assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Ba phòng tầng dưới và một phòng tầng trên; trẻ ở gần bố mẹ"},"clear":[]}
```

## Turn 6

### Customer

Ừ, giữ A01, A02, B01 với C01 trước cho chị.

### Expected Agent Response

Em đã giữ bốn phòng A01, A02, B01 và C01; tổng tạm tính 2.120.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2000-VIP21","passenger_count":4,"seat_preference":"Ba phòng tầng dưới và một phòng tầng trên; trẻ ở gần bố mẹ"},"expected_result":{"assigned_seats":["A01","A02","B01","C01"],"unit_fare_vnd":530000,"total_fare_vnd":2120000}}
```

### Expected Internal State Update

```json
{"set":{"assigned_seats":["A01","A02","B01","C01"]},"clear":[]}
```

## Turn 7

### Customer

Khoan, chồng chị bảo bé không nên ở tầng trên. Đổi đúng C01 sang B02 được không, còn các phòng kia giữ nguyên?

### Expected Agent Response

Được chị. B02 còn trống và liền B01; em đổi một phòng C01 sang B02. Phương án cuối là hai cặp tầng dưới A01–A02 và B01–B02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2000-VIP21","passenger_count":4,"seat_preference":"Hai cặp phòng liền nhau tầng dưới"},"expected_result":{"assigned_seats":["A01","A02","B01","B02"],"unit_fare_vnd":530000,"total_fare_vnd":2120000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai cặp phòng liền nhau tầng dưới","assigned_seats":["A01","A02","B01","B02"]},"clear":[]}
```

## Turn 8

### Customer

Tên lần lượt là Lê Thu Hà, Phạm Quốc Dũng, bé Phạm Gia An và bé Phạm Minh Anh.

### Expected Agent Response

Em đã xếp chị Hà ghế A01, anh Dũng A02, bé Gia An B01 và bé Minh Anh B02; hai bé được ghi là hành khách trẻ em.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Lê Thu Hà","passenger_details":[{"name":"Lê Thu Hà","type":"ADULT","seat":"A01"},{"name":"Phạm Quốc Dũng","type":"ADULT","seat":"A02"},{"name":"Phạm Gia An","type":"CHILD","seat":"B01"},{"name":"Phạm Minh Anh","type":"CHILD","seat":"B02"}]},"clear":[]}
```

## Turn 9

### Customer

Điểm đón cho cả nhà ở Công viên Hòa Bình nhé.

### Expected Agent Response

Dạ, em chọn Công viên Hòa Bình. Gia đình cần có mặt trước 19:30.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Công viên Hòa Bình"},"clear":[]}
```

## Turn 10

### Customer

Xuống Văn phòng Vinh cho tiện người nhà đón.

### Expected Agent Response

Em đã chọn điểm trả Văn phòng Vinh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["payment_method","customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Văn phòng Vinh"},"clear":[]}
```

## Turn 11

### Customer

Số chị 0923456702. Chị đứng tên đặt vé luôn.

### Expected Agent Response

Dạ, người đặt Lê Thu Hà, số liên hệ 0923456702.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0923456702"},"clear":[]}
```

## Turn 12

### Customer

Chị quét QR sau khi có mã thì được chứ?

### Expected Agent Response

Được chị. Em ghi thanh toán bằng QR và hiện đang chờ giao dịch; chỉ khi thanh toán thành công mới ghi là đã trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PENDING"},"clear":[]}
```

## Turn 13

### Customer

Hai bé cũng 530 nghìn một người thật à em?

### Expected Agent Response

Đúng chị. Mỗi bé có một ghế riêng với giá 530.000 đồng như các ghế khác, nên tổng của 4 người là 2.120.000 đồng.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 14

### Customer

Em nhắc lại xem bé nào ghế nào, chị sợ nhầm hai đứa.

### Expected Agent Response

Bé Phạm Gia An ở B01 và bé Phạm Minh Anh ở B02; bố mẹ ở A01 và A02. Cả bốn đều là phòng tầng dưới, chia thành hai cặp liền nhau.

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

Chị muốn kiểm tra lần cuối theo từng cặp ghế, rồi em đọc luôn chuyến và tiền nhé.

### Expected Agent Response

Chị Lê Thu Hà A01, anh Phạm Quốc Dũng A02, bé Phạm Gia An B01, bé Phạm Minh Anh B02; đi Hà Nội–Nghệ An ngày 20/07 lúc 20:00, Limousine 21 Phòng VIP; đón Công viên Hòa Bình, trả Văn phòng Vinh; thanh toán QR đang chờ hoàn tất; tổng 2.120.000 đồng. Số liên hệ là 0923456702.

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

Bốn tên, bốn ghế và các điểm đều đúng; chị đồng ý chốt cho cả nhà.

### Expected Agent Response

Dạ, em đã ghi nhận chị đồng ý với phương án hai cặp phòng tầng dưới.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 17

### Customer

Em cấp mã để chị lưu cho cả nhà nhé.

### Expected Agent Response

Dạ, vé của gia đình đã được xác nhận với mã VA-CASE_002.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2000-VIP21","customer_name":"Lê Thu Hà","customer_phone":"0923456702"},"expected_result":{"booking_id":"VA-CASE_002","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_002","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Hà Nội",
  "destination": "Nghệ An",
  "travel_date": "2026-07-20",
  "departure_time": "20:00",
  "trip_id": "HN-NA-20260720-2000-VIP21",
  "passenger_count": 4,
  "vehicle_type": "Limousine 21 Phòng VIP",
  "seat_preference": "Hai cặp phòng liền nhau tầng dưới",
  "assigned_seats": [
    "A01",
    "A02",
    "B01",
    "B02"
  ],
  "pickup_location": "Công viên Hòa Bình",
  "dropoff_location": "Văn phòng Vinh",
  "customer_name": "Lê Thu Hà",
  "customer_phone": "0923456702",
  "passenger_details": [
    {
      "name": "Lê Thu Hà",
      "type": "ADULT",
      "seat": "A01"
    },
    {
      "name": "Phạm Quốc Dũng",
      "type": "ADULT",
      "seat": "A02"
    },
    {
      "name": "Phạm Gia An",
      "type": "CHILD",
      "seat": "B01"
    },
    {
      "name": "Phạm Minh Anh",
      "type": "CHILD",
      "seat": "B02"
    }
  ],
  "payment_method": "QR",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_002",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Lê Thu Hà",
    "phone": "0923456702"
  },
  "passengers": {
    "count": 4,
    "details": [
      {
        "name": "Lê Thu Hà",
        "type": "ADULT",
        "seat": "A01"
      },
      {
        "name": "Phạm Quốc Dũng",
        "type": "ADULT",
        "seat": "A02"
      },
      {
        "name": "Phạm Gia An",
        "type": "CHILD",
        "seat": "B01"
      },
      {
        "name": "Phạm Minh Anh",
        "type": "CHILD",
        "seat": "B02"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-NA-20260720-2000-VIP21",
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-20",
    "departure_time": "20:00",
    "arrival_time": "01:00"
  },
  "vehicle": {
    "type": "Limousine 21 Phòng VIP",
    "seat_preference": "Hai cặp phòng liền nhau tầng dưới",
    "assigned_seats": [
      "A01",
      "A02",
      "B01",
      "B02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Công viên Hòa Bình",
    "dropoff_location": "Văn phòng Vinh"
  },
  "payment": {
    "method": "QR",
    "status": "PENDING",
    "unit_fare_vnd": 530000,
    "total_fare_vnd": 2120000
  },
  "booking": {
    "booking_id": "VA-CASE_002",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 16
  }
}
```

## 6. Final Ticket

VÉ XE KHÁCH
Mã vé: VA-CASE_002
Khách hàng: Lê Thu Hà
Số điện thoại: 0923456702
Tuyến: Hà Nội → Nghệ An
Khởi hành: 2026-07-20 20:00
Loại xe: Limousine 21 Phòng VIP
Ghế: A01, A02, B01, B02
Điểm đón: Công viên Hòa Bình
Điểm trả: Văn phòng Vinh
Số hành khách: 4
Thanh toán: QR | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Áp dụng đúng chính sách trẻ em: có ghế riêng và cùng đơn giá catalog.
- Xử lý lần giữ ghế đầu rồi đổi đúng một ghế C01 sang B02, không bịa inventory.
- Booking cuối có hai cặp phòng tầng dưới liền nhau A01–A02 và B01–B02.
