# CASE_010 — Khách sửa tên dễ nhầm và một số điện thoại trước recap

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Sài Gòn
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-18T20:05:00+07:00

## 2. Customer Persona

Age: 26
Location: Quận Bình Thạnh, Sài Gòn
Speaking style: Nói nhanh; tên Hy dễ bị nghe thành Huy và tự kiểm tra số liên hệ.
Calling context: Đặt một vé đi Đà Lạt ngày 20/07 rồi sửa tên cùng chữ số cuối điện thoại trước recap.

## 3. Conversation

## Turn 1

### Customer

Alo em, anh cần một vé từ Sài Gòn lên Đà Lạt tối ngày 20.

### Expected Agent Response

Em chào anh. Em ghi nhận 1 hành khách đi Sài Gòn–Đà Lạt ngày 20/07/2026. Anh muốn khởi hành lúc nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-20","passenger_count":1},"clear":[]}
```

## Turn 2

### Customer

Khoảng mười giờ đêm, em tìm chuyến giường nằm giúp.

### Expected Agent Response

Có chuyến giường nằm 34 chỗ lúc 22:00, đến 05:30, giá 320.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Sài Gòn","destination":"Đà Lạt","travel_date":"2026-07-20","passenger_count":1},"expected_result":{"trip_ids":["SG-DL-20260720-2200-GN34"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Chọn chuyến 22:00 đó.

### Expected Agent Response

Dạ, em chọn chuyến 22:00 ngày 20/07, giường nằm 34 chỗ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"22:00","trip_id":"SG-DL-20260720-2200-GN34","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 4

### Customer

Còn ghế tầng dưới phía trước thì giữ cho anh.

### Expected Agent Response

Còn B01 ở tầng dưới phía trước. Em giữ B01, tổng 320.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260720-2200-GN34","passenger_count":1,"seat_preference":"Tầng dưới, phía trước"},"expected_result":{"assigned_seats":["B01"],"unit_fare_vnd":320000,"total_fare_vnd":320000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước","assigned_seats":["B01"]},"clear":[]}
```

## Turn 5

### Customer

Tên người đi anh nói nhanh là Trần Gia Huy, ghế B01 nha.

### Expected Agent Response

Em đang ghi Trần Gia Huy, hành khách người lớn, ghế B01. Anh kiểm tra cách viết giúp em trước khi chốt.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["customer_phone"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Trần Gia Huy","passenger_details":[{"name":"Trần Gia Huy","type":"ADULT","seat":"B01"}]},"clear":[]}
```

## Turn 6

### Customer

Số điện thoại anh là 0934567812.

### Expected Agent Response

Em đã ghi số 0934567812.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location","dropoff_location","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0934567812"},"clear":[]}
```

## Turn 7

### Customer

Khoan, tên anh là Hy, H-y thôi, không có chữ u. Sửa thành Trần Gia Hy nhé.

### Expected Agent Response

Dạ, em sửa cả người đặt và hành khách thành Trần Gia Hy; tên Trần Gia Huy ban đầu được thay thế.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["pickup_location","dropoff_location","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Trần Gia Hy","passenger_details":[{"name":"Trần Gia Hy","type":"ADULT","seat":"B01"}]},"clear":[]}
```

## Turn 8

### Customer

Với số điện thoại lúc nãy anh đọc nhầm số cuối, phải là 0934567813.

### Expected Agent Response

Em đã sửa số liên hệ thành 0934567813; số kết thúc bằng 12 không còn dùng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["pickup_location","dropoff_location","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0934567813"},"clear":[]}
```

## Turn 9

### Customer

Điểm đón ở Ngã tư Hàng Xanh.

### Expected Agent Response

Dạ, em chọn Ngã tư Hàng Xanh; anh cần có mặt trước 21:30.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Ngã tư Hàng Xanh"},"clear":[]}
```

## Turn 10

### Customer

Cho anh xuống Chợ Đà Lạt.

### Expected Agent Response

Em đã chọn Chợ Đà Lạt làm điểm trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Chợ Đà Lạt"},"clear":[]}
```

## Turn 11

### Customer

Anh thanh toán QR, hiện giờ để chờ thanh toán.

### Expected Agent Response

Em ghi thanh toán bằng QR và hiện đang chờ giao dịch; chưa có kết quả thành công thì chưa coi là đã trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"QR","payment_status":"PENDING"},"clear":[]}
```

## Turn 12

### Customer

Giá một vé ba trăm hai chục nghìn đúng không em?

### Expected Agent Response

Đúng anh, đơn giá và tổng cho 1 hành khách đều là 320.000 đồng.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 13

### Customer

Em đánh vần lại tên đang lưu cho chắc.

### Expected Agent Response

Tên đang lưu là Trần Gia Hy, phần tên là H-y; không phải Huy.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 14

### Customer

Đọc lại số điện thoại, nhất là hai số cuối.

### Expected Agent Response

Số liên hệ cuối là 0934567813, kết thúc bằng 13.

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

Chuyến này tới Đà Lạt lúc nào và điểm trả ở đâu?

### Expected Agent Response

Chuyến đến lúc 05:30 và điểm trả đã chọn là Chợ Đà Lạt.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 16

### Customer

Em đọc chậm bản cuối, nhấn rõ tên Hy và số điện thoại đã sửa giúp anh.

### Expected Agent Response

Anh Trần Gia Hy, viết H-y, số 0934567813; đi Sài Gòn–Đà Lạt ngày 20/07 lúc 22:00, giường nằm 34 chỗ, ghế B01; đón Ngã tư Hàng Xanh, trả Chợ Đà Lạt; thanh toán QR đang chờ hoàn tất; tổng 320.000 đồng.

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

Anh xác nhận tên Hy không có chữ u, số đuôi 13 và toàn bộ hành trình vừa đọc.

### Expected Agent Response

Em đã ghi nhận xác nhận cuối theo đúng tên và số điện thoại đã sửa.

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

Chốt bằng thông tin mới và cho anh xin mã vé.

### Expected Agent Response

Dạ, vé đã được xác nhận với mã VA-CASE_010.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"SG-DL-20260720-2200-GN34","customer_name":"Trần Gia Hy","customer_phone":"0934567813"},"expected_result":{"booking_id":"VA-CASE_010","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_010","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Sài Gòn",
  "destination": "Đà Lạt",
  "travel_date": "2026-07-20",
  "departure_time": "22:00",
  "trip_id": "SG-DL-20260720-2200-GN34",
  "passenger_count": 1,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "Tầng dưới, phía trước",
  "assigned_seats": [
    "B01"
  ],
  "pickup_location": "Ngã tư Hàng Xanh",
  "dropoff_location": "Chợ Đà Lạt",
  "customer_name": "Trần Gia Hy",
  "customer_phone": "0934567813",
  "passenger_details": [
    {
      "name": "Trần Gia Hy",
      "type": "ADULT",
      "seat": "B01"
    }
  ],
  "payment_method": "QR",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_010",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Trần Gia Hy",
    "phone": "0934567813"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Trần Gia Hy",
        "type": "ADULT",
        "seat": "B01"
      }
    ]
  },
  "trip": {
    "trip_id": "SG-DL-20260720-2200-GN34",
    "origin": "Sài Gòn",
    "destination": "Đà Lạt",
    "travel_date": "2026-07-20",
    "departure_time": "22:00",
    "arrival_time": "05:30"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "Tầng dưới, phía trước",
    "assigned_seats": [
      "B01"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Ngã tư Hàng Xanh",
    "dropoff_location": "Chợ Đà Lạt"
  },
  "payment": {
    "method": "QR",
    "status": "PENDING",
    "unit_fare_vnd": 320000,
    "total_fare_vnd": 320000
  },
  "booking": {
    "booking_id": "VA-CASE_010",
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
Mã vé: VA-CASE_010
Khách hàng: Trần Gia Hy
Số điện thoại: 0934567813
Tuyến: Sài Gòn → Đà Lạt
Khởi hành: 2026-07-20 22:00
Loại xe: Giường nằm 34 chỗ
Ghế: B01
Điểm đón: Ngã tư Hàng Xanh
Điểm trả: Chợ Đà Lạt
Số hành khách: 1
Thanh toán: QR | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- State cuối chỉ chứa tên Trần Gia Hy và số 0934567813 đã sửa.
- Cập nhật passenger details đồng bộ với customer name sau correction.
- Recap và CONFIRM_BOOKING dùng đúng identity cuối, không dùng dữ liệu ban đầu.
