# Thiết kế route tài liệu dự án cho portfolio

**Ngày:** 2026-07-18  
**Phạm vi:** `portfolio/`  
**Đối tượng:** giám khảo hackathon và khách hàng tiềm năng

## Mục tiêu

Thêm route `/docs` vào ứng dụng portfolio để trình bày dự án VéĐi dưới dạng trung tâm tài liệu dễ đọc. Route mới học mô hình tương tác của `/baocao`—sidebar, chọn tài liệu, Markdown viewer, điều hướng di động—nhưng dùng component, cấu hình và nội dung mới. Không sao chép file hoặc câu chữ từ bộ tài liệu báo cáo hiện có.

## Nguyên tắc nội dung

- Viết tiếng Việt rõ, ngắn, ưu tiên giá trị sản phẩm trước chi tiết kỹ thuật.
- Dùng thông tin đúng với trạng thái hiện tại của repo; phân biệt demo công khai, pilot có credentials và hướng phát triển.
- Không tuyên bố đã có thanh toán, giữ ghế, PSTN/SIP, dữ liệu chuyến thật hoặc tích hợp production nếu chưa được kiểm chứng.
- Thuật ngữ kỹ thuật quan trọng phải đi kèm ý nghĩa đối với khách hàng.
- Mỗi tài liệu tự đứng độc lập nhưng cùng dẫn người đọc qua một câu chuyện sản phẩm.

## Cấu trúc tài liệu

Sidebar chia thành ba nhóm, tổng cộng tám tài liệu Markdown mới:

### Khám phá sản phẩm

1. **Tổng quan VéĐi** — sản phẩm, người dùng, lời hứa giá trị và trạng thái demo.
2. **Bài toán thị trường** — khó khăn của hành khách, nhân viên tổng đài và nhà xe.
3. **Cách VéĐi hoạt động** — hành trình từ cuộc gọi tới phiếu đặt vé có cấu trúc.

### Giá trị và trải nghiệm

4. **Tính năng nổi bật** — transcript realtime, tự điền, evidence, Human/Auto, takeover và confirmation gate.
5. **Kịch bản demo** — hướng dẫn giám khảo trải nghiệm hai phía cùng tiêu chí quan sát.
6. **An toàn và quyền riêng tư** — quyền kiểm soát của nhân viên, dữ liệu tối thiểu, consent và fallback trung thực.

### Sẵn sàng triển khai

7. **Kiến trúc dễ hiểu** — Web Call, bàn nhân viên, LiveKit, VALSEA, Agent và database ở mức khái niệm.
8. **Lộ trình pilot** — ranh giới demo hiện tại, điều kiện pilot và hướng thương mại hóa.

Tài liệu mặc định là **Tổng quan VéĐi**.

## Kiến trúc giao diện

Route `/docs` dùng React Router và một page component riêng. Page gồm:

- header cố định với liên kết về portfolio, tên tài liệu đang mở và nhóm;
- sidebar desktop cố định, nhóm tài liệu theo chủ đề;
- drawer mobile chứa cùng danh sách;
- vùng đọc Markdown giới hạn chiều rộng để giữ nhịp đọc;
- trạng thái loading, lỗi tải file và nút về đầu trang;
- ảnh trong Markdown mở bằng lightbox.

Component docs mới tái sử dụng primitive chung `Sheet`, `ImageLightbox` và utility `cn`, nhưng không import dữ liệu hoặc component mang tên/logic riêng của báo cáo. CSS typography dùng selector riêng để tránh phụ thuộc `.baocao-markdown`.

**Design Read:** trung tâm tài liệu sản phẩm cho giám khảo và khách hàng, ngôn ngữ sáng, tin cậy, gọn như product handbook; ưu tiên khả năng scan hơn hiệu ứng trang trí.

Các thông số giao diện:

- `DESIGN_VARIANCE: 4`
- `MOTION_INTENSITY: 2`
- `VISUAL_DENSITY: 5`

Route giữ hệ màu trung tính hiện có, một màu nhấn xanh lá liên hệ nhận diện VéĐi, tương phản WCAG AA, desktop và mobile đều dùng được.

## Mô hình dữ liệu và luồng tải

Một module manifest mới khai báo `id`, `label`, `path` và `group` cho từng tài liệu. Query parameter `?doc=<id>` giữ deep link và chọn tài liệu. ID không hợp lệ rơi về tài liệu mặc định.

Khi lựa chọn thay đổi:

1. page cập nhật query parameter;
2. cuộn lên đầu và đóng drawer mobile;
3. fetch Markdown tĩnh từ `portfolio/public/project-docs/`;
4. render bằng `react-markdown` và `remark-gfm`; raw HTML không được bật;
5. lỗi HTTP hoặc lỗi mạng hiển thị thông báo trong vùng nội dung, không làm hỏng shell.

Không tạo backend, CMS hoặc đồng bộ tự động với Markdown gốc. Nội dung docs là bộ biên tập riêng dành cho đối tượng bên ngoài.

## Thay đổi dự kiến

- thêm page `/docs`;
- thêm sidebar và manifest dành riêng cho project docs;
- thêm tám file Markdown mới trong thư mục public riêng;
- thêm typography CSS riêng;
- đăng ký route trong `App.tsx`;
- thêm liên kết `/docs` vào navigation desktop và mobile của portfolio.

Không sửa hoặc xóa tài liệu, route hay nội dung của `/baocao`.

## Trạng thái lỗi và khả năng truy cập

- Loading có thông báo văn bản, không làm layout nhảy mạnh.
- Lỗi fetch có `role="alert"` và ghi rõ tài liệu chưa tải được.
- Nút sidebar có active state, focus state và target đủ lớn trên mobile.
- Drawer có nhãn rõ; nút về đầu trang có `aria-label`.
- Link trong Markdown dễ nhận biết; bảng cuộn ngang trên màn hình nhỏ.
- Heading giữ thứ bậc đúng trong từng file Markdown.

## Kiểm thử và tiêu chí hoàn thành

### Tự động

- Unit test manifest: ID mặc định, fallback ID sai và thứ tự nhóm.
- Component test: tài liệu mặc định, chuyển tài liệu, loading/error và query parameter.
- Chạy test, lint và build của `portfolio`.

### Kiểm tra trình duyệt

- `/docs` mở đúng tài liệu mặc định.
- Deep link `/docs?doc=kien-truc-de-hieu` hoạt động sau reload.
- Sidebar desktop và drawer mobile chọn đúng tài liệu.
- Tám file đều tải thành công, không có link nội bộ gãy.
- Nội dung không tràn ngang ngoài bảng/code; focus và tương phản rõ.
- `/baocao` giữ nguyên hành vi.

### Tiêu chí nội dung

- Nội dung viết mới hoàn toàn, không copy file/câu chữ từ `portfolio/public/docs`, `portfolio/public/baocao.md` hoặc tài liệu gốc của repo.
- Mọi claim phù hợp trạng thái thực tế của project.
- Giám khảo hiểu vấn đề, giải pháp và luồng demo trong tối đa năm phút.
- Khách hàng nhận ra giá trị vận hành, cơ chế kiểm soát và bước cần thiết để chạy pilot.

## Ngoài phạm vi

- CMS, tìm kiếm toàn văn, versioning hoặc đăng nhập.
- Tài liệu API dành cho developer.
- Sao chép Markdown root vào portfolio lúc build.
- Thay đổi thiết kế landing page chính hoặc route `/baocao`.
