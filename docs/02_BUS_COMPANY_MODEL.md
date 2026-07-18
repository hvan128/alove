# Bus Company Model
## Reference: Vietnamese Intercity Bus Operator

## 1. Tổng quan

Mô hình nhà xe được xây dựng dựa trên các nhà xe khách liên tỉnh thực tế như Văn Minh.

Mục tiêu:
- Có dữ liệu giống thực tế
- Có thể dựng mock UI
- Có thể demo workflow đặt vé


---

# 2. Cấu trúc nhà xe


Bus Company

├── Route
├── Stop Point
├── Vehicle Type
├── Vehicle
├── Seat Layout
├── Trip Schedule
├── Ticket Price
└── Booking


---

# 3. Route Example


## Hà Nội → Nghệ An


Thông tin:

- Distance: 300 km
- Duration: 5 giờ


Điểm đón:

- Bến xe Mỹ Đình
- Văn phòng Hà Nội


Điểm trả:

- Bến xe Vinh
- Trung tâm Nghệ An


---

# 4. Vehicle Types


## Limousine 21 Phòng VIP


Capacity:

21 hành khách


Price:

530.000 VNĐ


Seat layout:


```
Cabin Layout

A1   A2

B1   B2

C1   C2

D1   D2

E1   E2
```


---

## Giường nằm 34 chỗ


Capacity:

34 hành khách


Price:

350.000 VNĐ


Seat layout:


```
Tầng trên:

A1 A2 A3
C1 C2 C3
E1 E2 E3


Tầng dưới:

B1 B2 B3
D1 D2 D3
F1 F2 F3
```


---

## Giường nằm 38 chỗ


Capacity:

38 hành khách


Price:

340.000 VNĐ


Seat layout:


```
Tầng trên:

A1 A2 A3
C1 C2 C3
E1 E2 E3


Tầng dưới:

B1 B2 B3
D1 D2 D3
F1 F2 F3
V1 V2 V3
```


---

# 5. Vehicle Data


Ví dụ:

Vehicle:

29B-12345


Type:

Giường nằm 38 chỗ


Capacity:

38


Status:

Active


---

# 6. Trip Schedule


Ví dụ:


Trip ID:

HN-NA-001


Route:

Hà Nội → Nghệ An


Departure:

20:00


Vehicle:

Limousine 21 VIP


Available Seats:

8


---

# 7. Ticket Price


|Loại xe|Giá|
|-|-|
|Limousine 21 VIP|530.000 VNĐ|
|Giường nằm 34 chỗ|350.000 VNĐ|
|Giường nằm 38 chỗ|340.000 VNĐ|


---

# 8. Booking


Một booking gồm:


Customer

+

Trip

+

Seat


Ví dụ:


Booking ID:

BK001


Customer:

Nguyễn Văn Nam


Trip:

HN-NA-001


Seat:

A1 A2


Status:

CONFIRMED


---

# 9. Data cần thu thập từ nhà xe thật


Có thể crawl:

## Route
- Điểm đi
- Điểm đến
- Khoảng cách
- Thời gian


## Vehicle
- Hình ảnh xe
- Loại xe
- Số ghế
- Sơ đồ ghế


## Trip
- Giờ chạy
- Tuyến


## Price
- Giá vé


## Stop
- Điểm đón
- Điểm trả
