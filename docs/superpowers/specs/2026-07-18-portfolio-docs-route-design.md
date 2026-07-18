# Portfolio Docs Route Design

## Mục tiêu

Thêm route `/docs` vào ứng dụng `portfolio`. Route cung cấp khung giao diện đọc tài liệu Markdown nhưng chưa chứa tài liệu, danh sách tài liệu, dữ liệu mẫu, hoặc nội dung Markdown.

## Phạm vi

- Thêm route `/docs` vào React Router hiện có.
- Tạo trang Docs theo ngôn ngữ giao diện của route `/baocao`.
- Giữ nguyên route `/baocao` và dữ liệu hiện có.
- Không tạo thư mục `docs/judges`, file Markdown, manifest tài liệu, hoặc nội dung placeholder dạng tài liệu.

## Giao diện

Trang dùng bố cục hai vùng giống `/baocao`:

- Header cố định chứa liên kết quay lại Portfolio và tiêu đề `Tài liệu sản phẩm`.
- Sidebar desktop cố định, không chứa mục tài liệu; hiển thị empty state `Chưa có tài liệu`.
- Mobile dùng Sheet hiện có để mở sidebar rỗng.
- Vùng đọc chính dùng bề mặt và khoảng cách của template Markdown hiện có; hiển thị empty state `Tài liệu đang được cập nhật`.

Không thêm ảnh, hiệu ứng, bộ lọc, tìm kiếm, điều hướng tài liệu, hoặc query parameter.

## Thành phần

- `portfolio/src/pages/Docs.tsx`: sở hữu bố cục route và hai empty state.
- `portfolio/src/App.tsx`: đăng ký `/docs` trước catch-all route.
- Component UI hiện có được tái sử dụng khi phù hợp, gồm `Sheet` và icon Lucide.

Không trừu tượng hóa `BaoCao` thành component dùng chung trong phạm vi này.

## Trạng thái và luồng dữ liệu

Trang tĩnh, không fetch dữ liệu, không đọc file Markdown, không có state tài liệu đang chọn. State duy nhất được phép là trạng thái đóng/mở Sheet trên mobile.

## Khả năng truy cập và responsive

- Nút mở sidebar có accessible label.
- Empty state đọc được bằng nội dung văn bản thông thường.
- Desktop hiển thị sidebar; mobile thay sidebar bằng Sheet.
- Header và vùng nội dung không che nhau ở các breakpoint hiện có.

## Xử lý lỗi

Không có lỗi tải tài liệu vì route không fetch dữ liệu. Catch-all route hiện có tiếp tục xử lý URL không hợp lệ.

## Kiểm thử

- Render `/docs` thành công.
- Hiển thị đúng hai empty state.
- Sidebar không chứa mục tài liệu.
- Build `portfolio` thành công.

## Ngoài phạm vi

- Viết hoặc tạo bất kỳ tài liệu nào.
- Thêm danh sách 13 tài liệu dự kiến.
- Markdown rendering thực tế.
- Search, table of contents, deep links, hoặc quản trị nội dung.
