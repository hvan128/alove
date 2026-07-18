# VéĐi design system

## Ý đồ

Ngôn ngữ thị giác SaaS trung tính: nền neutral, card trắng nổi bằng elevation ngữ nghĩa, rõ hierarchy, type dễ đọc, hairline tinh và tương tác có phản hồi. Một màu **indigo** (`--action`) dẫn hướng cho hành động, mic và focus; semantic colors (xanh lá / cam / đỏ) chỉ xuất hiện khi cần truyền trạng thái. Icon dùng bộ **lucide** (outline). Token dạng `oklch` để light/dark cân bằng cảm nhận.

## Tokens

| Nhóm | Tokens | Dùng cho |
|---|---|---|
| Surface | `canvas`, `surface`, `surface-tint`, `pearl` | nền trang, workspace, phiếu vé |
| Content | `ink`, `muted`, `hairline`, `divider` | chữ và phân cấp |
| Primary | `action`, `action-hover`, `action-focus`, `action-soft` | CTA, mic, focus, customer turn (indigo) |
| Semantic | `success`, `warning`, `danger`, `violet` | hoàn tất, chờ, lỗi, demo |
| Elevation | `shadow-card`, `shadow-panel` | card nổi nhẹ, panel/hero nổi rõ |
| Type | `text-metric` 12, `text-ui` 14, `text-body` 17, `text-section` 21, `text-display` 34 px | metric, UI, body, section, display |
| Radius | 9/12/16/18/28/9999 px | logo, control, panel, hero, action |

Token màu và elevation dạng `oklch`, đổi qua `prefers-color-scheme`; component không hardcode surface trắng. IBM Plex nạp qua `next/font/google` với subset `vietnamese`.

Thang chữ khai báo trong `@theme` của `globals.css` nên gọi bằng tên (`text-ui`, `text-section`...). Đừng viết `text-[13px]` — cỡ nằm ngoài thang là dấu hiệu thiết kế đang trôi. Cũng không dùng chữ viết hoa toàn bộ kèm giãn chữ để làm nhãn: phân cấp bằng cỡ và màu `--muted`.

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
