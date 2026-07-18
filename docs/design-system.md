# VéĐi design system

## Ý đồ

Ngôn ngữ thị giác SaaS trung tính: nền neutral, card trắng nổi bằng elevation ngữ nghĩa, rõ hierarchy, type dễ đọc, hairline tinh và tương tác có phản hồi. Một màu **indigo** (`--action`) dẫn hướng cho hành động, mic và focus; semantic colors (xanh lá / cam / đỏ) chỉ xuất hiện khi cần truyền trạng thái. Icon dùng bộ **lucide** (outline). Token dạng `oklch` để light/dark cân bằng cảm nhận.

## Tokens

| Nhóm | Tokens | Dùng cho |
|---|---|---|
| Surface | `canvas`, `surface`, `surface-tint`, `pearl`, `surface-sunken` | nền trang, workspace, phiếu vé, hàng xen kẽ / giếng biểu đồ |
| Content | `ink`, `muted`, `hairline`, `divider` | chữ và phân cấp |
| Primary | `action`, `action-hover`, `action-focus`, `action-soft` | CTA, mic, focus, customer turn (indigo) |
| Semantic | `success`, `warning`, `danger`, `violet` | hoàn tất, chờ, lỗi, demo |
| Chart | `chart-1`…`chart-5`, `chart-grid`, `chart-track` | chuỗi dữ liệu, đường lưới, nền thanh chưa đầy |
| Elevation | `shadow-card`, `shadow-panel` | card nổi nhẹ, panel/hero nổi rõ |
| Type | `text-metric` 12, `text-ui` 14, `text-body` 17, `text-section` 21, `text-display` 34 px | metric, UI, body, section, display |
| Radius | 9/12/16/18/28/9999 px | logo, control, panel, hero, action |

Token màu và elevation dạng `oklch`, đổi qua `prefers-color-scheme`; component không hardcode surface trắng. IBM Plex nạp qua `next/font/google` với subset `vietnamese`.

Thang chữ khai báo trong `@theme` của `globals.css` nên gọi bằng tên (`text-ui`, `text-section`...). Đừng viết `text-[13px]` — cỡ nằm ngoài thang là dấu hiệu thiết kế đang trôi. Cũng không dùng chữ viết hoa toàn bộ kèm giãn chữ để làm nhãn: phân cấp bằng cỡ và màu `--muted`.

## Biểu đồ và dashboard

Mọi biểu đồ chỉ lấy màu từ bộ `--chart-1`…`--chart-5`; không mượn `--action`/`--success`/`--danger` làm màu chuỗi, vì các token đó đang mang nghĩa trạng thái và sẽ nói dối khi nằm trong một chart. `--chart-1` bám theo primary indigo nên chuỗi quan trọng nhất luôn ăn khớp với phần còn lại của giao diện. Bốn chuỗi sau chạy trên trục xanh–vàng (lam ngọc → hồng tím → hổ phách → xám) nên không có cặp đỏ/xanh lá đứng cạnh nhau — an toàn cho mù màu đỏ-lục. Mỗi chuỗi lệch độ sáng so với chuỗi kề, đủ để phân biệt kể cả khi in đen trắng, và giữ tương phản ≥3:1 với `--surface` ở cả light lẫn dark.

Đường lưới dùng `--chart-grid` (mờ hơn cả `hairline` — nó là thước đo chứ không phải viền), phần chưa đầy của thanh/vòng dùng `--chart-track`.

Dashboard đi theo cấu trúc **mật độ cao**: surface ladder (`canvas` → `surface` → `surface-sunken`) cộng hairline để tạo phân cấp, thay vì đổi hệ màu hay chồng bóng. Số liệu lớn dùng `tabular-nums` và tracking âm; delta luôn kèm mũi tên và dấu, không chỉ dựa vào màu. Không gradient, không shadow lòe.

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

## Quy tắc tương tác

- Target chính tối thiểu 44px.
- Press scale tối đa `0.98`; reduced-motion bỏ animation.
- Focus ring dùng `action-focus`, không bị ẩn.
- Speech chỉ phát sau user gesture; luôn có replay và stop.
- Mic unsupported phải có fallback text/preset nhìn thấy.
- Confirm disabled cho đến khi booking đủ dữ liệu.
- Light/dark đều giữ contrast và semantic meaning.

## Responsive

- Desktop: customer và care desk đứng cạnh nhau; header call trải ngang.
- Tablet/mobile: hai phía xếp dọc, call mode và start/end đứng trước timeline.
- Text và preset không yêu cầu hover; mọi hành động chạy bằng touch/keyboard.

Route `/design-system` là catalogue chạy thật và visual regression target.
