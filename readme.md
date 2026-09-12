# Content Management & Social Media Automation Tool

## MVP implementation

The working MVP is in the Next.js app at the project root. It includes the dashboard, content library, Facebook/LinkedIn editing and preview, approval, scheduling, calendar, published/failed views, and retry flow with platform-specific state. The browser reads PostgreSQL through the app API; n8n imports generated content through `/api/contents/import`.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 1.1 Cấu hình n8n và database thật

Đảm bảo app và n8n cùng trỏ tới PostgreSQL có cùng dữ liệu. Trong n8n đặt:

- `CONTENT_MANAGER_API_URL`: URL public hoặc tunnel tới app, kết thúc bằng `/api/contents/import`.
- `N8N_IMPORT_API_KEY`: giống giá trị trong `.env` của app.

Sau khi import một row, mở lại UI hoặc refresh trang. UI sẽ gọi `GET /api/contents` và hiển thị các bản ghi cùng ảnh, bài viết, trạng thái từ PostgreSQL.

## 1. Tổng quan

Xây dựng một hệ thống quản lý content nội bộ cho phép:

1. Nhân viên/technician nhập thông tin công việc thông qua Google Form.
2. Google Form lưu dữ liệu vào Google Sheet và hình ảnh vào Google Drive.
3. n8n phát hiện submission mới từ Google Sheet.
4. n8n lấy hình ảnh + nội dung công việc.
5. AI tự động phân tích và generate content cho:
   - Facebook
   - LinkedIn
6. Content được lưu vào PostgreSQL.
7. Người dùng truy cập Web Admin để:
   - xem content
   - xem hình ảnh
   - chỉnh sửa content
   - preview Facebook
   - preview LinkedIn
   - approve
   - đặt lịch đăng
8. n8n Scheduler tự động lấy các bài đến thời gian đăng.
9. n8n publish bài lên Facebook / LinkedIn.
10. Hệ thống cập nhật trạng thái và lưu lịch sử publish.

Mục tiêu chính:

> Biến quy trình "Form → AI → copy content → chỉnh sửa thủ công → đăng bằng tay" thành một hệ thống quản lý content hoàn chỉnh.

---

# 2. Kiến trúc hệ thống

```text
                    ┌─────────────────┐
                    │   Google Form   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Google Sheet   │
                    │   + Form Data   │
                    └────────┬────────┘
                             │
                             │ Row Added
                             ▼
                    ┌─────────────────┐
                    │      n8n        │
                    │                 │
                    │ - Get images    │
                    │ - AI generate   │
                    │ - Process data  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │                 │
                    │ Source of Truth │
                    └────────┬────────┘
                             │
                             ▼
              ┌─────────────────────────────┐
              │      Content Manager        │
              │                             │
              │ Dashboard                   │
              │ Content List                │
              │ Content Editor              │
              │ Preview                     │
              │ Schedule                    │
              │ Calendar                    │
              │ Social Accounts              │
              └──────────────┬──────────────┘
                             │
                             │ scheduled_at
                             ▼
                    ┌─────────────────┐
                    │      n8n        │
                    │    Scheduler    │
                    └────────┬────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
           ┌─────────────┐       ┌─────────────┐
           │  Facebook   │       │  LinkedIn   │
           └─────────────┘       └─────────────┘
