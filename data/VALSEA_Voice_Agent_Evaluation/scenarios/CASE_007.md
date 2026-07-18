# CASE_007 — Khách đổi ngày và giờ sau recap rồi xác nhận lại

## 1. Scenario Metadata

Scenario type: core_booking
Customer region: Nghệ An
Audio condition: clean_hotline
Language: vi
Difficulty: hard
Call datetime: 2026-07-18T18:00:00+07:00

## 2. Customer Persona

Age: 41
Location: Thành phố Vinh, Nghệ An
Speaking style: Rõ ràng nhưng lịch công tác thay đổi vào phút cuối.
Calling context: Ban đầu đặt hai phòng ngày 22/07 rồi đổi sang chuyến muộn ngày 21/07 sau khi đã xác nhận recap.

## 3. Conversation

## Turn 1

### Customer

Alo em, anh cần hai vé từ Nghệ An ra Hà Nội tối ngày 22.

### Expected Agent Response

Em chào anh. Em ghi nhận Nghệ An đi Hà Nội ngày 22/07/2026, 2 hành khách. Anh muốn khoảng mấy giờ?

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"GREET_AND_DISCOVER","missing_fields":["departure_time"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-22","passenger_count":2},"clear":[]}
```

## Turn 2

### Customer

Khoảng tám rưỡi tối, có chuyến phòng VIP không?

### Expected Agent Response

Có chuyến Limousine 21 Phòng VIP lúc 20:30 ngày 22/07, còn đủ hai chỗ, giá 530.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-22","passenger_count":2},"expected_result":{"trip_ids":["NA-HN-20260722-2030-VIP21"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 3

### Customer

Chọn chuyến 20:30 đó, tới Hà Nội mấy giờ?

### Expected Agent Response

Chuyến đến lúc 01:30. Em đã chọn chuyến VIP 20:30 ngày 22/07.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"20:30","trip_id":"NA-HN-20260722-2030-VIP21","vehicle_type":"Limousine 21 Phòng VIP"},"clear":[]}
```

## Turn 4

### Customer

Giữ hai phòng tầng dưới liền nhau cho anh.

### Expected Agent Response

Còn A01 và A02, cùng tầng dưới phía trước và liền nhau; tổng 1.060.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"NA-HN-20260722-2030-VIP21","passenger_count":2,"seat_preference":"Hai phòng tầng dưới liền nhau"},"expected_result":{"assigned_seats":["A01","A02"],"unit_fare_vnd":530000,"total_fare_vnd":1060000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai phòng tầng dưới liền nhau","assigned_seats":["A01","A02"]},"clear":[]}
```

## Turn 5

### Customer

Người đi là Nguyễn Công Thành ghế A01 và Lê Văn Khoa ghế A02.

### Expected Agent Response

Em đã ghi hai hành khách người lớn Nguyễn Công Thành A01 và Lê Văn Khoa A02.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["pickup_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_name":"Nguyễn Công Thành","passenger_details":[{"name":"Nguyễn Công Thành","type":"ADULT","seat":"A01"},{"name":"Lê Văn Khoa","type":"ADULT","seat":"A02"}]},"clear":[]}
```

## Turn 6

### Customer

Điểm đón ở Bến xe Vinh nhé.

### Expected Agent Response

Dạ, em chọn Bến xe Vinh; anh cần có mặt trước giờ khởi hành 30 phút.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["dropoff_location"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"pickup_location":"Bến xe Vinh"},"clear":[]}
```

## Turn 7

### Customer

Ra tới Hà Nội thì xuống Bến xe Mỹ Đình.

### Expected Agent Response

Em đã chọn Bến xe Mỹ Đình làm điểm trả.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["customer_phone","payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"dropoff_location":"Bến xe Mỹ Đình"},"clear":[]}
```

## Turn 8

### Customer

Số anh Thành là 0978901237.

### Expected Agent Response

Dạ, em ghi người đặt Nguyễn Công Thành, số 0978901237.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PASSENGER_DETAILS","missing_fields":["payment_method"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"customer_phone":"0978901237"},"clear":[]}
```

## Turn 9

### Customer

Hai anh em trả tiền mặt lúc lên xe.

### Expected Agent Response

Em ghi hai anh sẽ trả tiền mặt khi lên xe; khoản này đang chờ thanh toán.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CAPTURE_PAYMENT_PREFERENCE","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"payment_method":"CASH_ON_BOARDING","payment_status":"PENDING"},"clear":[]}
```

## Turn 10

### Customer

Nếu lịch công tác đổi thì anh có đổi ngày giờ trước lúc xe chạy được không?

### Expected Agent Response

Có thể đổi nếu chuyến mới còn chỗ và anh chấp nhận chênh lệch giá. Khi đổi, em phải tìm chuyến và giữ ghế lại, rồi lấy xác nhận mới.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 11

### Customer

Hiện tại tổng của phương án ngày 22 là bao nhiêu?

### Expected Agent Response

Phương án hiện tại là 2 người nhân 530.000 đồng, tổng 1.060.000 đồng.

### Expected Agent Action

```json
{"intent":"ASK_INFORMATION","action":"ANSWER_AND_REDIRECT","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 12

### Customer

Em recap toàn bộ phương án ngày 22 cho anh trước nhé.

### Expected Agent Response

Anh Nguyễn Công Thành A01 và anh Lê Văn Khoa A02, số liên hệ 0978901237; đi Nghệ An–Hà Nội ngày 22/07 lúc 20:30, xe VIP; đón Bến xe Vinh, trả Bến xe Mỹ Đình; trả tiền mặt khi lên xe; tổng 1.060.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 13

### Customer

Đúng là ngày 22 lúc 20:30 và hai phòng A01, A02 phải không?

### Expected Agent Response

Đúng anh, đó là phương án hiện tại trước khi cấp mã vé.

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

Anh xác nhận phương án vừa đọc.

### Expected Agent Response

Em đã ghi nhận xác nhận của anh cho phương án ngày 22.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 15

### Customer

Khoan, công ty vừa báo đổi lịch. Bỏ ngày 22, chuyển sang ngày 21 và phải sau mười giờ đêm nhé.

### Expected Agent Response

Dạ, em xóa xác nhận, chuyến và ghế cũ; giữ nguyên tuyến, hai hành khách, điểm đón/trả và thông tin liên hệ để tìm lại ngày 21 sau 22:00.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["departure_time","trip_id","vehicle_type","seat_preference","assigned_seats","passenger_details"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"travel_date":"2026-07-21"},"clear":["departure_time","trip_id","vehicle_type","seat_preference","assigned_seats","passenger_details","explicit_confirmation"]}
```

## Turn 16

### Customer

Em tìm chuyến ngày 21 muộn hơn 22 giờ còn đủ hai ghế đi.

### Expected Agent Response

Có chuyến giường nằm 38 chỗ lúc 22:15 ngày 21/07, còn đủ hai chỗ, giá 340.000 đồng mỗi người.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"SEARCH_TRIPS","missing_fields":[],"arguments":{"origin":"Nghệ An","destination":"Hà Nội","travel_date":"2026-07-21","passenger_count":2},"expected_result":{"trip_ids":["NA-HN-20260721-2215-GN38"]}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 17

### Customer

Chọn chuyến 22:15 đó, xe 38 chỗ.

### Expected Agent Response

Dạ, em chọn chuyến 22:15 ngày 21/07, giường nằm 38 chỗ, đến 03:15.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"UPDATE_REQUIREMENTS","missing_fields":["seat_preference","assigned_seats"],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"departure_time":"22:15","trip_id":"NA-HN-20260721-2215-GN38","vehicle_type":"Giường nằm 38 chỗ"},"clear":[]}
```

## Turn 18

### Customer

Giữ lại hai ghế tầng dưới liền nhau cho anh, tên hai người vẫn như cũ.

### Expected Agent Response

Em giữ B01 và B02, tầng dưới phía trước, liền nhau; gán lại anh Thành B01 và anh Khoa B02. Tổng mới 680.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"HOLD_SEATS","missing_fields":[],"arguments":{"trip_id":"NA-HN-20260721-2215-GN38","passenger_count":2,"seat_preference":"Hai ghế tầng dưới liền nhau"},"expected_result":{"assigned_seats":["B01","B02"],"unit_fare_vnd":340000,"total_fare_vnd":680000}}
```

### Expected Internal State Update

```json
{"set":{"seat_preference":"Hai ghế tầng dưới liền nhau","assigned_seats":["B01","B02"],"passenger_details":[{"name":"Nguyễn Công Thành","type":"ADULT","seat":"B01"},{"name":"Lê Văn Khoa","type":"ADULT","seat":"B02"}]},"clear":[]}
```

## Turn 19

### Customer

Đọc lại bản cuối sau khi đổi, nhất là ngày giờ và tổng tiền.

### Expected Agent Response

Bản cuối sau khi đổi: Nguyễn Công Thành B01 và Lê Văn Khoa B02, số 0978901237; đi Nghệ An–Hà Nội ngày 21/07 lúc 22:15, giường nằm 38 chỗ; đón Bến xe Vinh, trả Bến xe Mỹ Đình; trả tiền mặt khi lên xe; tổng 680.000 đồng.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{},"clear":[]}
```

## Turn 20

### Customer

Anh hủy hẳn bản ngày 22 và xác nhận lại bản ngày 21 lúc 22:15 vừa đọc.

### Expected Agent Response

Dạ, em đã ghi nhận lần xác nhận mới; phương án ngày 22 không còn hiệu lực.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_DETAILS","missing_fields":[],"arguments":{},"expected_result":{}}
```

### Expected Internal State Update

```json
{"set":{"explicit_confirmation":true},"clear":[]}
```

## Turn 21

### Customer

Bây giờ mới cấp mã theo bản đã đổi nhé em.

### Expected Agent Response

Dạ, vé theo lịch mới đã được xác nhận với mã VA-CASE_007.

### Expected Agent Action

```json
{"intent":"BOOK_TICKET","action":"CONFIRM_BOOKING","missing_fields":[],"arguments":{"trip_id":"NA-HN-20260721-2215-GN38","customer_name":"Nguyễn Công Thành","customer_phone":"0978901237"},"expected_result":{"booking_id":"VA-CASE_007","booking_status":"CONFIRMED"}}
```

### Expected Internal State Update

```json
{"set":{"booking_id":"VA-CASE_007","booking_status":"CONFIRMED"},"clear":[]}
```

## 4. Internal State Tracking

```json
{
  "origin": "Nghệ An",
  "destination": "Hà Nội",
  "travel_date": "2026-07-21",
  "departure_time": "22:15",
  "trip_id": "NA-HN-20260721-2215-GN38",
  "passenger_count": 2,
  "vehicle_type": "Giường nằm 38 chỗ",
  "seat_preference": "Hai ghế tầng dưới liền nhau",
  "assigned_seats": [
    "B01",
    "B02"
  ],
  "pickup_location": "Bến xe Vinh",
  "dropoff_location": "Bến xe Mỹ Đình",
  "customer_name": "Nguyễn Công Thành",
  "customer_phone": "0978901237",
  "passenger_details": [
    {
      "name": "Nguyễn Công Thành",
      "type": "ADULT",
      "seat": "B01"
    },
    {
      "name": "Lê Văn Khoa",
      "type": "ADULT",
      "seat": "B02"
    }
  ],
  "payment_method": "CASH_ON_BOARDING",
  "payment_status": "PENDING",
  "booking_id": "VA-CASE_007",
  "booking_status": "CONFIRMED",
  "explicit_confirmation": true
}
```

## 5. Final Workflow Output

```json
{
  "customer": {
    "name": "Nguyễn Công Thành",
    "phone": "0978901237"
  },
  "passengers": {
    "count": 2,
    "details": [
      {
        "name": "Nguyễn Công Thành",
        "type": "ADULT",
        "seat": "B01"
      },
      {
        "name": "Lê Văn Khoa",
        "type": "ADULT",
        "seat": "B02"
      }
    ]
  },
  "trip": {
    "trip_id": "NA-HN-20260721-2215-GN38",
    "origin": "Nghệ An",
    "destination": "Hà Nội",
    "travel_date": "2026-07-21",
    "departure_time": "22:15",
    "arrival_time": "03:15"
  },
  "vehicle": {
    "type": "Giường nằm 38 chỗ",
    "seat_preference": "Hai ghế tầng dưới liền nhau",
    "assigned_seats": [
      "B01",
      "B02"
    ]
  },
  "pickup_dropoff": {
    "pickup_location": "Bến xe Vinh",
    "dropoff_location": "Bến xe Mỹ Đình"
  },
  "payment": {
    "method": "CASH_ON_BOARDING",
    "status": "PENDING",
    "unit_fare_vnd": 340000,
    "total_fare_vnd": 680000
  },
  "booking": {
    "booking_id": "VA-CASE_007",
    "booking_status": "CONFIRMED"
  },
  "outcome": {
    "completed_goal": true,
    "confirmation_turn": 20
  }
}
```

## 6. Final Ticket

VÉ XE KHÁCH
Mã vé: VA-CASE_007
Khách hàng: Nguyễn Công Thành
Số điện thoại: 0978901237
Tuyến: Nghệ An → Hà Nội
Khởi hành: 2026-07-21 22:15
Loại xe: Giường nằm 38 chỗ
Ghế: B01, B02
Điểm đón: Bến xe Vinh
Điểm trả: Bến xe Mỹ Đình
Số hành khách: 2
Thanh toán: Tiền mặt khi lên xe | Chờ thanh toán
Trạng thái: Đã xác nhận

## 7. Evaluation Criteria

- Xóa xác nhận, trip và ghế cũ khi khách đổi cả ngày lẫn giờ sau recap.
- Tìm và giữ lại chuyến 22:15 ngày 21/07 với cặp B01–B02 có thật.
- Chỉ CONFIRM_BOOKING sau lần xác nhận mới ở lượt 20.
