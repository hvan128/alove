# SpeechToInvoice design system

## Ý đồ

Apple-like ở đây nghĩa là calm, rõ hierarchy, type dễ đọc, khoảng trắng rộng, translucent surface có kiểm soát, hairline tinh và tương tác có phản hồi. Sản phẩm không sao chép giao diện Apple. Một màu xanh hành trình dẫn hướng; semantic colors chỉ xuất hiện khi cần truyền trạng thái.

## Tokens

| Nhóm | Tokens | Dùng cho |
|---|---|---|
| Surface | `canvas`, `surface`, `surface-tint`, `pearl` | nền trang, workspace, phiếu vé |
| Content | `ink`, `muted`, `hairline`, `divider` | chữ và phân cấp |
| Journey | `action`, `action-hover`, `action-focus`, `action-soft` | CTA, mic, focus, customer turn |
| Semantic | `success`, `warning`, `danger`, `violet` | hoàn tất, chờ, lỗi, demo |
| Type | Geist/system, 12/14/17/21/34/60 px | metric, UI, body, section, display |
| Radius | 9/12/16/18/28/9999 px | logo, control, panel, hero, action |

Light và dark token được đổi qua `prefers-color-scheme`; component không hardcode surface trắng.

## Component dùng chung

| Component | Trách nhiệm |
|---|---|
| `AppShell` | brand, navigation, responsive frame |
| `Button` / `IconButton` | action, disabled reason, focus/press state |
| `Panel` | vùng nội dung có title/eyebrow/action |
| `StatusDot` / `StatusPill` | trạng thái có text, không dựa riêng vào màu |
| `TextInput` / `SelectInput` | native label, hint/error, dark surface |
| `BookingSummary` | journey, trip, passengers, fare, seat và booking code |
| `MessageTimeline` | customer/staff/agent/system roles |
| `OperationsShell` / `MetricCard` | sidebar responsive, ca trực, KPI, freshness/runtime profile |
| `CatalogVersionBar` / `ValidationIssueList` | draft/published state, diff, blocking publish errors |
| `VehicleSeatMap` / `SeatPicker` | vehicle template và per-trip available/held/booked/blocked state |

## Quy tắc tương tác

- Target chính tối thiểu 44px.
- Press scale tối đa `0.98`; reduced-motion bỏ animation.
- Focus ring dùng `action-focus`, không bị ẩn.
- Speech chỉ phát sau user gesture; luôn có replay và stop.
- Mic unsupported phải có fallback text/preset nhìn thấy.
- Confirm disabled cho đến khi booking đủ dữ liệu.
- Seat state luôn có text/icon/accessible name ngoài màu; keyboard hỗ trợ di chuyển và chọn ghế.
- Hold countdown phải thông báo expiry, conflict và recovery mà không xóa field booking khác.
- Light/dark đều giữ contrast và semantic meaning.

## Responsive

- Desktop operations: sidebar + KPI grid + queue/departure panels; chọn call mở cockpit riêng.
- Desktop cockpit: transcript, booking và assistant/seat panel đứng cạnh nhau.
- Tablet/mobile: hai phía xếp dọc, call mode và start/end đứng trước timeline.
- Text và preset không yêu cầu hover; mọi hành động chạy bằng touch/keyboard.

Route `/design-system` là catalogue chạy thật và visual-regression target.

Mockup và behavior target được chốt tại [VéĐi Operations, Catalog and Seat Inventory Design](superpowers/specs/2026-07-18-vedi-operations-catalog-seat-inventory-design.md).
