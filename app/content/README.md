# Cấu trúc giao diện Content Management

## Luồng sử dụng

`Tổng quan → Thư viện/Lịch → Mở bài trong khung hiện tại → Chọn nền tảng → Chỉnh sửa → Duyệt → Lên lịch → Đã đăng hoặc Thất bại`.

Trong editor có thể thêm một nền tảng còn thiếu cho nội dung hiện có. Bài mới dùng lại media của nội dung gốc, sao chép caption tab hiện tại thành bản nháp riêng, rồi đi qua quy trình duyệt và lên lịch như bài khác. API kiểm tra định dạng, media video và tránh tạo hai bài cho cùng một nền tảng.

Trạng thái bài viết vẫn lấy từ API. Giao diện chỉ bật hành động hợp lệ theo trạng thái hiện tại; retry tiếp tục áp dụng riêng cho từng bài trên từng nền tảng.

## Vị trí code

- `app/page.tsx`: tải dữ liệu, quản lý màn đang mở và truyền callback cho các component.
- `app/content/components/`: từng phần giao diện độc lập như dashboard, thư viện, lịch, editor, preview, trạng thái, hộp xác nhận và hộp thêm nền tảng.
- `app/api/contents/[id]/posts/route.ts`: tạo bản nháp cho nền tảng mới trên một nội dung hiện có; không cần thay đổi schema.
- `app/content/ui/content-presentation.ts`: nhãn, format ngày giờ và hàm trình bày dùng chung; không gọi API.
- `app/content/content-workspace.css`: style cho workspace và các màn nội dung; token và style nền tảng nằm trong `app/globals.css`.
- `app/content/ContentEditorRoute.tsx`: adapter cho URL chi tiết trực tiếp; các thao tác trong workspace chính mở editor bằng state, không điều hướng sang layout khác.

Các view nhận dữ liệu và callback qua props. Khi sửa API hoặc quy tắc trạng thái, cập nhật phần điều phối phù hợp trong `app/page.tsx` và giữ contract hiện có.
