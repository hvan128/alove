# Định dạng dữ liệu nhà xe

Hệ thống đặt vé đọc **toàn bộ** tuyến, chuyến, giá và ghế từ database. Không có
giá hay lịch chạy nào được sinh ra trong code — agent chỉ đọc lại những gì có ở đây.

Gửi 4 file CSV dưới đây (UTF-8, dòng đầu là tiêu đề). Thiếu file nào thì phần đó
chưa đặt được vé.

## 1. `operators.csv` — nhà xe

```csv
id,name,hotline
phuong-trang,Phương Trang,19006067
```

| Cột | Bắt buộc | Ghi chú |
|---|---|---|
| `id` | có | slug không dấu, không khoảng trắng |
| `name` | có | tên hiển thị, có dấu |
| `hotline` | không | |

## 2. `routes.csv` — tuyến

```csv
id,operator_id,origin_city,destination_city,duration_minutes
sgn-dlt,phuong-trang,Sài Gòn,Đà Lạt,450
```

`origin_city` / `destination_city` viết **có dấu, đúng tên gọi khách hay dùng**.
Hệ thống tự khớp cách khách nói (không dấu, "TP HCM", "Sài Gòn", "HCM"…) về tên này.

## 3. `trips.csv` — chuyến chạy

Mỗi dòng là **một chuyến cụ thể vào một ngày giờ cụ thể**, không phải lịch lặp.

```csv
id,route_id,departure_at,arrival_at,vehicle_type,price_vnd,pickup_point,dropoff_point
sgn-dlt-2200-2026-07-25,sgn-dlt,2026-07-25T22:00:00+07:00,2026-07-26T05:30:00+07:00,Giường nằm 34 chỗ,320000,Bến xe Miền Đông mới,Bến xe liên tỉnh Đà Lạt
```

| Cột | Ghi chú |
|---|---|
| `departure_at` / `arrival_at` | ISO 8601 **kèm offset `+07:00`** |
| `price_vnd` | số nguyên, không dấu chấm phẩy |

Nếu bạn chỉ có lịch lặp hằng ngày, gửi lịch đó + khoảng ngày cần mở bán, tôi sinh ra
các dòng chuyến tương ứng.

## 4. `seats.csv` — sơ đồ ghế

Mỗi dòng là **một ghế của một chuyến**. Đây là tồn kho thật: đặt hết là hết.

```csv
trip_id,code,deck
sgn-dlt-2200-2026-07-25,A05,lower
sgn-dlt-2200-2026-07-25,B05,upper
```

`deck` để trống nếu xe một tầng.

Nếu mọi chuyến cùng loại xe dùng chung một sơ đồ ghế, gửi **một** sơ đồ mẫu kèm
loại xe, tôi nhân bản cho từng chuyến.

## Nạp dữ liệu

```bash
cd apps/web
pnpm exec drizzle-kit migrate      # tạo bảng
pnpm seed:operator ./duong-dan/toi/thu-muc-csv
```

Nạp lại nhiều lần được: tuyến và chuyến ghi đè theo `id`, ghế **đã đặt hoặc đang
giữ thì không bị ghi đè** để không phá vé đã bán.

## Điều tuyệt đối không làm

Không tự bịa giá, giờ chạy hay số ghế để "cho có". Nếu dữ liệu chưa có, agent
phải nói chưa có tuyến — không được đoán.
