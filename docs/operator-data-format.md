# Dữ liệu vận hành nhà xe

## Tổng quan

Agent chỉ tư vấn và bán những tuyến, lịch, giá và ghế đã được seed vào Neon.
Nguồn seed chuẩn hiện tại là `data/mai-anh-seed` gồm năm file CSV UTF-8.

## `operators.csv`

```csv
id,name,hotline
mai-anh,Nhà xe Mai Anh,(024) 0000 6868
```

`id` là slug ổn định dùng làm khóa. Không đổi `id` chỉ để sửa tên hiển thị.

## `routes.csv`

```csv
id,operator_id,origin_city,destination_city,duration_minutes,pickup_point,dropoff_point
MA-R01,mai-anh,Hà Nội,Vinh,330,Bến xe Nước Ngầm,Bến xe Vinh
```

Mỗi chiều là một route riêng. `duration_minutes` được dùng để tính giờ đến;
pickup/dropoff là fact agent phải đọc đúng cho khách.

## `vehicle_types.csv`

```csv
id,name,price_vnd,stated_capacity
VT-CABIN-22,Limousine Cabin VIP 22 phòng,520000,22
```

`price_vnd` là giá tham chiếu bắt buộc của loại xe. Giá phải là số nguyên VND
dương, không có dấu phân cách hàng nghìn. `stated_capacity` dùng để đối chiếu
với số dòng seat map.

## `seat_maps.csv`

```csv
vehicle_type_id,code,deck
VT-CABIN-22,A01,lower
VT-CABIN-22,A02,lower
```

Mỗi dòng là một ghế/giường/phòng vật lý. `deck` nhận `lower`, `upper` hoặc để
trống. Code phải duy nhất trong cùng `vehicle_type_id`.

## `schedules.csv`

```csv
route_id,vehicle_type_id,departure_time,price_vnd
MA-R01,VT-SLEEPER-34,06:00,350000
```

`departure_time` dùng giờ Việt Nam `HH:MM`. Seed script sinh các trip cụ thể cho
số ngày được yêu cầu. `price_vnd` là **giá bán cuối cùng bắt buộc** của đúng
route/loại xe/giờ chạy đó; giá phải là số nguyên VND dương và không được để
trống.

## Nạp dữ liệu

```bash
pnpm --dir apps/web exec drizzle-kit migrate
pnpm --dir apps/web seed:operator ../../data/mai-anh-seed 14
```

Tham số cuối là số ngày muốn mở bán kể từ hôm nay ở timezone
`Asia/Ho_Chi_Minh`. Với các operator có trong `operators.csv`, năm file này là
nguồn canonical:

- operator/route/trip còn trong CSV được upsert và kích hoạt lại;
- route bị gỡ được chuyển sang inactive;
- mọi trip tương lai không nằm trong lịch và horizon mới được chuyển sang
  inactive (giảm `14` xuống `7` cũng đóng ngày 8 trở đi);
- ghế `available` hoặc hold đã hết hạn bị gỡ khỏi seat map/thuộc trip đã đóng sẽ
  bị xóa;
- active hold và ghế `booked` được giữ nguyên, không sửa trạng thái hay metadata.

Việc bỏ một trip có active hold sẽ đóng trip ngay để không tiếp tục bán; hold và
vé đã tạo vẫn còn dữ liệu, nhưng hold đó không thể confirm sau khi trip bị đóng.
Vì vậy thay đổi lịch/seat map production nên chạy trong cửa sổ vận hành ít lưu
lượng, rồi chạy seed lại sau khi các hold liên quan hết hạn để dọn nốt ghế đã gỡ.

Một lần seed lớn được chia thành nhiều Neon transaction để tránh vượt giới hạn
batch. Nếu tiến trình lỗi giữa chừng, không mở traffic hay deploy dựa trên trạng
thái đó; sửa nguyên nhân rồi chạy lại đúng cùng input. Các thao tác đều idempotent
và bước reconcile cuối sẽ hoàn tất catalog canonical.

## Kiểm tra trước khi seed production

- File có đúng năm tên trên và header chứa đúng các tên cột như ví dụ.
- Mọi `operator_id`, `route_id`, `vehicle_type_id` đều tham chiếu tới dòng tồn tại.
- Capacity khớp số seat code; không trùng code.
- Cả hai cột `price_vnd` đều bắt buộc và là số nguyên VND dương; thời gian là
  `HH:MM`, duration là số phút dương.
- CSV có giá trị chứa dấu phẩy phải đặt trong dấu nháy kép.
- Seed vào database staging trước, kiểm tra landing/search/hold rồi mới chạy production.

## Vé đã xác nhận và thay đổi catalog

Mỗi booking confirmed giữ một `verification_snapshot` bất biến gồm đúng dữ liệu
được phát hành trên vé. Seed hoặc chỉnh route/trip/vehicle/price sau đó không được
viết lại snapshot này. Trang verify và JSON tải xuống đọc contract của vé đã phát
hành, không dựng lại lịch sử từ catalog hiện tại.

Migration expand có thể tạm để cột nullable trong rolling release. Trước khi
promote và trước contract migration `NOT NULL`, operator phải chạy null check theo
`docs/deployment.md`; chỉ phục hồi từ confirmed booking snapshot đã lưu, không suy
diễn từ giá hoặc lịch hiện tại.
