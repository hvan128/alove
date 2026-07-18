# VéĐi — AI Voice Agent đặt vé xe

VéĐi (tên kỹ thuật: SpeechToInvoice) là trợ lý giọng nói tiếng Việt giúp nhân viên nhà xe biến hội thoại đặt vé thành booking có cấu trúc, có bằng chứng và chỉ xác nhận khi con người cho phép.

## Sản phẩm trong 60 giây

1. Hành khách mô tả hành trình bằng giọng nói hoặc văn bản trên `/call`.
2. Nhân viên nhận phiên tại `/staff`, xem transcript và từng trường được điền kèm câu nói nguồn.
3. Hệ thống xác định trường còn thiếu, gợi ý câu hỏi tiếp theo và luôn mặc định **Human**.
4. Nhân viên có thể trao quyền **Auto**, takeover tức thì hoặc khóa giá trị đã kiểm tra.
5. Booking chỉ sinh mã sau summary và thao tác xác nhận rõ ràng; retry cùng dữ liệu không sinh mã thứ hai.

**Demo public:** [https://ordervoice-vn.vercel.app](https://ordervoice-vn.vercel.app)  
**Lưu ý:** deployment public hiện chạy fallback cục bộ; LiveKit, VALSEA và Neon chưa được credential-smoke trên release này.

## Vấn đề

Cuộc gọi đặt vé chứa nhiều dữ kiện rời rạc: tuyến, ngày giờ, số khách, liên hệ và điểm đón/trả. Nhân viên vừa nghe, hỏi lại, nhập liệu và kiểm tra nên dễ bỏ sót hoặc xác nhận nhầm. Voice bot tự vận hành lại tạo rủi ro lớn nếu transcript sai, inventory chưa đồng bộ hoặc Agent được phép xác nhận thay người.

## Giải pháp

VéĐi dùng mô hình **staff-first**:

- chỉ final message của người gọi mới cập nhật booking facts;
- mỗi giá trị giữ exact quote, message ID, confidence, source và revision;
- Human mode không cho Agent tự nói;
- Auto mode có scope theo phiên, có thể thu hồi và không có quyền xác nhận;
- lỗi provider hạ cấp về Human/text path, không tạo success giả;
- catalog, inventory và telephony thật chỉ được claim khi có integration evidence tương ứng.

## Demo hiện tại

### Route chính

- `/staff?session=DEMO42`: bàn nhân viên, transcript realtime, suggestion, booking form, evidence, Human/Auto và confirmation gate.
- `/call?session=DEMO42`: giao diện người gọi tối giản, hỗ trợ text, câu mẫu, microphone fallback và LiveKit khi đã cấu hình.
- `/console`: redirect tương thích sang `/staff`.

### Profile không cần credential

Mở `/staff` và `/call` với cùng session code trong **hai tab cùng browser**. Text/câu mẫu là đường demo chắc chắn. Browser speech, nếu dùng được, chỉ là fallback có nhãn; không phải bằng chứng VALSEA.

### Profile có credential

Hai thiết bị chỉ được dùng sau khi LiveKit project, Agent worker, VALSEA và feature flags đã qua smoke test. Neon persistence cần `DATABASE_URL` và migration được xác minh. Xem [trạng thái tích hợp](docs/integration-test-status.md).

Không nhập dữ liệu hành khách thật trên deployment public. Session code chưa thay thế staff authentication hoặc signed caller invite.

## Chạy local

Yêu cầu Node.js `>=20.9` và pnpm `10.33.0`.

```bash
pnpm install
pnpm dev:web
```

Mở:

1. `http://localhost:3000/staff?session=DEMO42`
2. `http://localhost:3000/call?session=DEMO42`

Ở `/call`, bấm **Bắt đầu cuộc gọi**, rồi dùng câu mẫu trong [Demo Playbook](docs/demo-playbook.md). Nếu không cấu hình LiveKit, hai tab phải cùng browser.

## Kiến trúc tóm tắt

```text
apps/web             Next.js: /staff, /call, token/session APIs
packages/contracts   Zod protocol cho realtime events
packages/core        Deterministic extraction, evidence, confirmation gate
packages/providers   VALSEA/Twilio/OpenAI boundaries
agent                LiveKit worker: VALSEA RTT → guarded LLM → VALSEA TTS
db                   Neon/Drizzle schema, migration và audit
```

Worker production yêu cầu VALSEA-first STT; browser STT không thay thế đường này. Voice worker chạy trên LiveKit Cloud Agents hoặc container process/WebSocket dài hạn, không chạy trong Vercel Function.

## Bộ tài liệu

| Độc giả | Tài liệu | Mục đích |
|---|---|---|
| Ban giám khảo, lãnh đạo | [Product Brief](docs/product-brief.md) | Giá trị, pitch, KPI và phạm vi |
| Người trình bày | [Demo Playbook](docs/demo-playbook.md) | Kịch bản chính xác 5 phút và fallback |
| Kỹ thuật, thẩm định | [Capabilities and Evidence](docs/capabilities-and-evidence.md) | Feature status, source, test và giới hạn |
| Khách hàng triển khai | [Adoption Guide](docs/adoption-guide.md) | Onboarding, vai trò, vận hành và go-live |
| Lãnh đạo, tài chính | [Business Case and Roadmap](docs/business-case-and-roadmap.md) | Chi phí, ROI, team và P0–P3 |
| Kiến trúc sư | [Kiến trúc kỹ thuật sâu](docs/architecture.md) | Thành phần, luồng dữ liệu và quyết định |
| Security, operations | [Trust and Operations](docs/trust-and-operations.md) | Trust boundary, controls, incident và trách nhiệm |

Tài liệu chi tiết bổ sung: [current vs target](docs/current-vs-target-architecture.md), [deployment](docs/deployment.md), [security](docs/security-and-privacy.md), [operations runbook](docs/operations-runbook.md).

## Trạng thái và giới hạn

| Nhãn | Ý nghĩa |
|---|---|
| **Verified** | Đã có evidence từ test hoặc deployment đúng profile được nêu |
| **Code-ready** | Source/test có sẵn nhưng thiếu credentialed deployment evidence |
| **Roadmap** | Thiết kế hoặc backlog; chưa phải khả năng hiện hành |
| **Out of scope** | Không cam kết trong phạm vi hiện tại |

Hiện tại:

- **Verified:** local two-tab, transcript/field filling từ final message, evidence, Human/Auto boundary, fallback và confirmation demo.
- **Code-ready:** LiveKit token/worker, VALSEA RTT/TTS boundary và Neon persistence; chưa được claim live trên public release.
- **Roadmap:** production staff authentication, signed caller invite, transaction confirmation, operator queue/catalog/inventory và observability đầy đủ.
- **Out of scope:** payment, external seat guarantee, PSTN/SIP, Zalo raw-call audio, SMS delivery và autonomous confirmation.

## Verification

```bash
pnpm lint
pnpm -r --if-present typecheck
pnpm test
pnpm test:e2e
pnpm build

cd agent
uv sync --all-extras
uv run pytest
uv run ruff check .
uv run python -m compileall .
```

Kết quả release và điều kiện credential nằm trong [release manifest](docs/vedi-release-manifest.md) và [integration status](docs/integration-test-status.md). Không suy rộng kết quả fixture/unit test thành provider live evidence.
