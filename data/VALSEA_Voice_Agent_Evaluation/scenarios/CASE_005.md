# CASE_005 — Khách say xe chọn ghế thay thế khi B01 không còn

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Hà Nội
Audio condition: clean_hotline
Language: vi
Difficulty: medium
Call datetime: 2026-07-18T16:10:00+07:00

## 2. Customer Persona

Age: 45
Location: Bắc Từ Liêm, Hà Nội
Speaking style: Chậm rãi, nhấn mạnh nhu cầu tầng dưới phía trước vì dễ say.
Calling context: Đặt một vé đi Nghệ An ngày 20/07 và cần hỗ trợ lên xuống xe.

## 3. Conversation

## Turn 1

### Customer

Alo em, cô cần một vé Hà Nội đi Nghệ An tối ngày 20, cô hay say xe lắm.

### Expected Agent Response

Em chào cô. Em ghi nhận 1 hành khách đi Hà Nội–Nghệ An ngày 20/07/2026. Cô muốn giờ khởi hành khoảng nào?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-20","passenger_count":1},"clear":[]}
```

## Turn 2

### Customer

Khoảng chín rưỡi tối có chuyến giường nằm không?

### Expected Agent Response

Có chuyến giường nằm 34 chỗ lúc 21:30, đến 02:30, giá 350.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Hà Nội","destination":"Nghệ An","travel_date":"2026-07-20","passenger_count":1},"expected_result":{"trip_ids":["HN-NA-20260720-2130-GN34"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Chọn chuyến đó cho cô.

### Expected Agent Response

Dạ, em chọn chuyến 21:30 ngày 20/07, giường nằm 34 chỗ.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"21:30","trip_id":"HN-NA-20260720-2130-GN34","vehicle_type":"Giường nằm 34 chỗ"},"clear":[]}
```

## Turn 4

### Customer

Cô muốn đúng B01, ghế tầng dưới phía trước, còn không em?

### Expected Agent Response

B01 không nằm trong danh sách ghế còn của chuyến này. Chuyến vẫn còn chỗ; các ghế tầng dưới phía trước khả dụng là B02 và B03.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"PRESENT_TRIP_OPTIONS","missing_fields":["assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước; thay B01 bằng ghế khả dụng gần nhất"},"clear":[]}
```

## Turn 5

### Customer

Vậy giữ B02 cho cô, đừng chuyển lên tầng trên nhé.

### Expected Agent Response

Dạ, em giữ B02, đúng tầng dưới phía trước; tổng 350.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2130-GN34","passenger_count":1,"seat_preference":"Tầng dưới, phía trước; thay B01 bằng ghế khả dụng gần nhất"},"expected_result":{"assigned_seats":["B02"],"unit_fare_vnd":350000,"total_fare_vnd":350000}}
```

### Expected Internal State Update

```json
{"set":{"assigned_seats":["B02"]},"clear":[]}
```

## Turn 6

### Customer

Chân cô yếu, lúc lên xuống xe có ai hỗ trợ được không?

### Expected Agent Response

Nhà xe có thể hỗ trợ cô lên xuống khi được báo trước; em đã bổ sung nhu cầu này vào lựa chọn chỗ. Em không thể hứa dịch vụ y tế hay thiết bị chưa được xác nhận.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":["passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Tầng dưới, phía trước; chấp nhận B02 thay B01; cần hỗ trợ lên xuống xe"},"clear":[]}
```

## Turn 7

### Customer

Người đi là cô Hoàng Thị Hạnh, người lớn, ghế B02.

### Expected Agent Response

Em đã ghi hành khách Hoàng Thị Hạnh, người lớn, ghế B02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Hoàng Thị Hạnh","passenger_details":[{"name":"Hoàng Thị Hạnh","type":"ADULT","seat":"B02"}]},"clear":[]}
```

## Turn 8

### Customer

Điểm đón ở Bến xe Mỹ Đình cho dễ tìm.

### Expected Agent Response

Dạ, em chọn Bến xe Mỹ Đình. Cô cần có mặt trước 21:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Mỹ Đình"},"clear":[]}
```

## Turn 9

### Customer

Cho cô xuống Văn phòng Vinh nhé.

### Expected Agent Response

Em đã chọn điểm trả Văn phòng Vinh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Văn phòng Vinh"},"clear":[]}
```

## Turn 10

### Customer

Số điện thoại của cô là 0956789015.

### Expected Agent Response

Dạ, em ghi số 0956789015 cho người đặt Hoàng Thị Hạnh.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0956789015"},"clear":[]}
```

## Turn 11

### Customer

Cô trả tiền mặt khi lên xe cho đơn giản.

### Expected Agent Response

Em ghi cô sẽ trả tiền mặt khi lên xe; khoản này đang chờ thanh toán.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING"},"clear":[]}
```

## Turn 12

### Customer

Giá vé vẫn ba trăm năm mươi nghìn dù đổi từ B01 sang B02 chứ?

### Expected Agent Response

Đúng cô, đơn giá chuyến là 350.000 đồng; đổi sang B02 không làm thay đổi giá.

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

Em kiểm tra lần nữa, mã ghế là B02 chứ không phải B01 nhé.

### Expected Agent Response

Đúng cô, ghế được giữ là B02. B01 không còn chỗ và không xuất hiện trong phương án cuối.

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

Cô cần nghe bản cuối có cả ghế thay thế và yêu cầu hỗ trợ lên xe.

### Expected Agent Response

Cô Hoàng Thị Hạnh, 0956789015; đi Hà Nội–Nghệ An ngày 20/07 lúc 21:30, giường nằm 34 chỗ, ghế B02 tầng dưới phía trước; có yêu cầu hỗ trợ lên xuống xe; đón Bến xe Mỹ Đình, trả Văn phòng Vinh; trả tiền mặt khi lên xe; tổng 350.000 đồng.

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

Cô đồng ý ghế B02 cùng phần hỗ trợ và toàn bộ hành trình vừa đọc.

### Expected Agent Response

Dạ, em đã ghi nhận cô đồng ý với phương án cuối.

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

Phát hành mã để cô ghi lại nhé.

### Expected Agent Response

Dạ, vé đã được xác nhận với mã VA-CASE_005.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"HN-NA-20260720-2130-GN34","customer_name":"Hoàng Thị Hạnh","customer_phone":"0956789015"},"expected_result":{"booking_id":"VA-CASE_005","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_005","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Hà Nội",
  "destination": "Nghệ An",
  "travel_date": "2026-07-20",
  "departure_time": "21:30",
  "trip_id": "HN-NA-20260720-2130-GN34",
  "passenger_count": 1,
  "vehicle_type": "Giường nằm 34 chỗ",
  "seat_preference": "Tầng dưới, phía trước; chấp nhận B02 thay B01; cần hỗ trợ lên xuống xe",
  "assigned_seats": [
    "B02"
  ],
  "pickup_location": "Bến xe Mỹ Đình",
  "dropoff_location": "Văn phòng Vinh",
  "customer_name": "Hoàng Thị Hạnh",
  "customer_phone": "0956789015",
  "passenger_details": [
    {
      "name": "Hoàng Thị Hạnh",
      "type": "ADULT",
      "seat": "B02"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_005",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Hoàng Thị Hạnh",
    "phone": "0956789015"
  },
  "passengers": {
    "count": 1,
    "details": [
      {
        "name": "Hoàng Thị Hạnh",
        "type": "ADULT",
        "seat": "B02"
      }
    ]
  },
  "trip": {
    "trip_id": "HN-NA-20260720-2130-GN34",
    "origin": "Hà Nội",
    "destination": "Nghệ An",
    "travel_date": "2026-07-20",
    "departure_time": "21:30",
    "arrival_time": "02:30"
  },
  "vehicle": {
    "type": "Giường nằm 34 chỗ",
    "seat_preference": "Tầng dưới, phía trước; chấp nhận B02 thay B01; cần hỗ trợ lên xuống xe",
    "assigned_seats": [
      "B02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Bến xe Mỹ Đình",
    "dropoff_location": "Văn phòng Vinh"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 350000,
    "total_fare_vnd": 350000
  },
  "booking": {
    "booking_id": "VA-CASE_005",
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
Mã vé: VA-CASE_005
Khách hàng: Hoàng Thị Hạnh
Số điện thoại: 0956789015
Tuyến: Hà Nội → Nghệ An
Khởi hành: 2026-07-20 21:30
Loại xe: Giường nằm 34 chỗ
Ghế: B02
Điểm đón: Bến xe Mỹ Đình
Điểm trả: Văn phòng Vinh
Số hành khách: 1
Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Nói rõ B01 không khả dụng nhưng chuyến vẫn còn ghế.
- Chỉ đề xuất B02/B03 là ghế tầng dưới phía trước có thật và giữ B02 sau khi khách chọn.
- Ghi nhận hỗ trợ lên xuống theo policy, không hứa dịch vụ y tế.
