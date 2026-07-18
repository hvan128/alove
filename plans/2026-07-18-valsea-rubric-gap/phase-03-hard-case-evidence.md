# Phase 03 — Bằng chứng hard-case ở `/engine`

**Mục tiêu:** Biến `/engine` từ "hai cột text để người xem tự đọc" thành bằng chứng
đo được. Ăn vào Outcome 2 của brief và chống anti-pattern *"only works with clean data"*.

**Không chặn bởi phase nào** — làm song song được với nhánh VALSEA.

## Tình trạng hiện tại

`/engine` đã có khung so sánh side-by-side (`engine-workspace.tsx:139-148`) — đây là
tài sản tốt. Thiếu phần ruột:

- `find` toàn repo cho `*.wav|*.mp3|*.m4a|*.ogg` → **rỗng**. Không có clip nào.
- Không WER, không chỉ số nào (grep `WER` → 0 hit).
- Không diff highlight — hai đoạn text đặt cạnh nhau, mắt thường tự dò.
- Kịch bản mẫu duy nhất (`engine-workspace.tsx:16-17`) là thuần Việt, giọng chuẩn,
  không có tiếng Anh xen — tức đúng cái "clean demo clip" brief bảo đừng dùng.

## 3.1 — Bộ clip hard-case

Tạo `fixtures/audio/` với **3 clip + transcript chuẩn (ground truth)** viết tay:

| Clip | Nội dung cần có |
|---|---|
| `mien-trung-accent.wav` | Giọng Trung hoặc Nam rõ rệt, thuần Việt, có tên riêng + địa danh |
| `code-switch-vn-en.wav` | Xen tiếng Anh dày: "book cho anh 2 vé", "thanh toán qua transfer", "check giùm em cái schedule" |
| `phone-8khz-noisy.wav` | Thu qua điện thoại, 8kHz, có nhiễu nền |

Mỗi clip kèm `.json` ground truth: transcript đúng + danh sách token tiếng Anh
+ các dấu thanh dễ sai. Đây là thứ làm WER tính được.

Nếu bộ mẫu VALSEA ở kickoff phủ được ca nào thì dùng luôn — nhớ kiểm điều khoản
dữ liệu (brief ghi *hackathon period only*, nên **không commit** clip của VALSEA
vào repo public; chỉ commit clip tự thu, clip VALSEA để `.gitignore` + ghi cách lấy).

## 3.2 — WER + diff

`packages/core/src/wer.ts`:

- Levenshtein trên token, chuẩn hoá Unicode NFC trước khi so (dấu thanh tiếng Việt
  có nhiều cách mã hoá — không chuẩn hoá thì WER sai một cách vô nghĩa).
- Trả cả số WER lẫn danh sách thao tác (giữ/thêm/xoá/thay) để render diff.
- Thêm chỉ số riêng: **tỉ lệ giữ đúng token tiếng Anh** và **tỉ lệ dấu thanh đúng**.
  Hai chỉ số này map thẳng vào yêu cầu H1 của brief (*"preserve tonal diacritics
  correctly; must not silently drop or garble code-switched English terms"*) và
  không engine generic nào ăn được.

UI: hiển thị WER dưới mỗi panel, tô màu chỗ lệch so với ground truth. Đỏ = sai,
vàng = thiếu. Người xem hiểu trong hai giây thay vì tự dò.

## 3.3 — Nhãn ca khó

Mỗi clip có badge trên UI: `Giọng Trung` / `Code-switch VN-EN` / `Điện thoại 8kHz`.
Nút chọn nhanh 3 clip ngay trên `AudioSourcePanel` — giám khảo bấm một cái là chạy,
không phải chờ mình lục file.

## 3.4 — Bảng tổng kết

Một bảng nhỏ cuối trang: 3 clip × 2 engine × (WER, token EN giữ đúng, dấu thanh đúng).
Đây là artifact chụp màn hình được, đưa thẳng vào slide và README.

## Files

- Tạo: `fixtures/audio/*.wav` + `*.ground-truth.json`
- Tạo: `packages/core/src/wer.ts` + `packages/core/test/wer.test.ts`
- Tạo: `apps/web/src/components/engine/comparison-table.tsx`
- Tạo: `apps/web/src/components/engine/transcript-diff.tsx`
- Sửa: `apps/web/src/components/engine/engine-workspace.tsx`
- Sửa: `apps/web/src/components/engine/audio-source-panel.tsx` (nút chọn clip)
- Sửa: `apps/web/src/components/engine/baseline-panel.tsx` (chỗ hiện WER)

## Validation

- `packages/core/test/wer.test.ts` — ca có dấu, ca NFC/NFD khác nhau nhưng cùng chữ,
  ca chuỗi rỗng, ca hoàn toàn khác nhau.
- Chạy đủ 3 clip trên `/engine`, chụp lại bảng tổng kết vào `reports/`.

## Rủi ro

- **WER của Alove có thể không thắng baseline trên cả 3 clip.** Nếu vậy: giữ nguyên
  số thật, không chọn clip để làm đẹp số. Chọn cách trình bày trung thực — chỉ ra ca
  nào thắng và vì sao, ca nào chưa. Một đội biết engine mình yếu ở đâu đáng tin hơn
  một đội có ba con số đẹp. Rubric "Outstanding" cho AI accuracy còn đòi hẳn
  *"includes error detection mechanism"* — thừa nhận giới hạn đúng là thứ đó.
- Ground truth viết tay có thể lệch — để hai người soát, ghi ai soát vào file JSON.
