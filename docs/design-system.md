# VéĐi design system

## Ý đồ

Apple-like ở đây nghĩa là calm, rõ hierarchy, type dễ đọc, hairline tinh và tương tác có phản hồi. Sản phẩm không sao chép giao diện Apple. Một màu xanh hành trình dẫn hướng; semantic colors chỉ xuất hiện khi cần truyền trạng thái.

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
