# Phase 06 — Dọn dẹp, docs, checklist rubric

**Mục tiêu:** Repo public là một deliverable được chấm. Giám khảo mở nó ra và phải
hiểu ngay kiến trúc + tìm được bằng chứng cho từng tiêu chí.

**Chặn bởi:** Phase 01–05 (cần kết quả thật để điền vào checklist)

## 6.1 — Dọn code chết

`apps/web/src/components/console/` (~390 dòng, 6 file) **không nằm trên route nào**:
`app/console/page.tsx:6` render `BusCallWorkspace` từ `bus-call/`, không phải
`ConsoleWorkspace`. Cả thư mục chỉ còn được tham chiếu bởi chính test của nó
(`console-workspace.test.tsx:5`).

Đây là di sản domain cũ "OrderVoice / đơn hàng cà phê". Giám khảo mở repo, thấy
thư mục `console/` mà route `/console` lại render thứ khác → mất điểm Technical
Execution vì tưởng kiến trúc rối.

Xoá cả thư mục + test. Nếu muốn giữ lịch sử, nó nằm trong git rồi.

Lưu ý: `order-panel.tsx` có nút "Xuất ERP nháp" nhưng chỉ gán chuỗi cứng
`'ERP-DRAFT-0001'` vào state (`console-workspace.tsx:56-58`) — giả lập hoàn toàn.
Đừng nhầm nó với Phase 04; xoá luôn, đừng cứu.

## 6.2 — Cập nhật `docs/pilot-roadmap.md`

Brief yêu cầu *"Pilot / deployment roadmap (1–2 pages)"* là deliverable bắt buộc.
File hiện tại viết tốt nhưng có hai vấn đề:

- **Viết bằng tiếng Anh trộn tiếng Việt** không nhất quán (P0-P2 tiếng Anh, exit
  criteria tiếng Việt). Chốt một ngôn ngữ — tiếng Việt, vì đây là giải Việt Nam.
- Chưa phản ánh kết quả các phase mới. Thêm mốc: VALSEA hai endpoint, số WER thật
  trên ba clip, webhook ra hệ ngoài.

Giữ nguyên "Exit criteria" — đoạn đó là điểm mạnh, nó cho thấy đội không thổi phồng.

## 6.3 — Sơ đồ kiến trúc explainable

Deliverable bắt buộc: *"Explainable AI architecture"*. Hiện `docs/architecture.md`
có nhưng chưa thể hiện đường đi speech→meaning→action sau các phase mới.

Vẽ một sơ đồ (mermaid, render được ngay trên GitHub):

```
mic/PSTN → VALSEA ASR → VALSEA understand → advanceBookingAgent → phiếu + QR + webhook
                ↓              ↓                    ↓
           WER vs baseline  entity panel      DB audit + dashboard
```

Nhấn vào chỗ mà kiến trúc này khác một chatbot bọc ASR: lõi xác định không cho
mô hình bịa giá/ghế/mã vé. Đó chính là anti-pattern brief liệt kê
(*"thin wrapper around a generic chatbot"*) và mình tránh được **bằng thiết kế**,
không phải tình cờ.

## 6.4 — `docs/rubric-checklist.md`

Bảng map từng tiêu chí ↔ trạng thái ↔ bằng chứng ↔ `file:line`.

Dùng làm hai việc: đội tự soát trước khi nộp, và dán vào README để giám khảo không
phải đi tìm. Bản HTML preview đi kèm plan này là phiên bản trình bày của cùng dữ liệu.

Quy tắc: chỉ đánh ✅ khi có bằng chứng chạy thật kèm timestamp. Không đánh dấu theo
dự định. Đây là cùng tinh thần với "Exit criteria" đã có trong pilot roadmap.

## 6.5 — README

- Thêm mục "Bằng chứng theo tiêu chí" trỏ tới checklist.
- Cập nhật mô tả `/engine` cho khớp Phase 03 (WER, 3 clip).
- Ghi rõ endpoint VALSEA nào đang dùng, chế độ nào.

## Files

- Xoá: `apps/web/src/components/console/` (toàn bộ)
- Sửa: `docs/pilot-roadmap.md`
- Sửa: `docs/architecture.md`
- Tạo: `docs/rubric-checklist.md`
- Sửa: `README.md`
- Tạo: `adrs/0010-valsea-two-endpoint-pipeline.md` (nếu Phase 02 thành)

## Validation

- `pnpm test` + `pnpm typecheck` sau khi xoá thư mục chết — không còn import treo.
- `pnpm test:e2e` — route `/console` vẫn chạy.
- Mở README trên GitHub, mermaid render đúng.
