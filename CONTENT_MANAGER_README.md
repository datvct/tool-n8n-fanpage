# Content Management & Social Media Automation Tool

> **Mục tiêu:** Xây dựng một hệ thống quản lý content nội bộ từ Google Form → AI → Review/Edit → Approve → Schedule → Auto Publish lên Facebook/LinkedIn.
>
> **Tài liệu này là SPECIFICATION để AI Coding Agent (Codex/Claude Code/Gemini Code...) trực tiếp đọc và triển khai project.**
>
> Không chỉ xem đây là README giới thiệu. Hãy coi toàn bộ tài liệu là yêu cầu kỹ thuật và acceptance criteria.

---

# 1. Mục tiêu sản phẩm

Hiện tại quy trình thủ công có dạng:

```text
Technician đi làm
    ↓
Điền Google Form
    ↓
Google Sheet
    ↓
AI generate content
    ↓
Copy content
    ↓
Tự chỉnh sửa
    ↓
Mở Facebook / LinkedIn
    ↓
Copy/paste
    ↓
Đăng bài bằng tay
```

Hệ thống mới cần biến thành:

```text
Technician
    ↓
Google Form
    ├── Tên nhân viên
    ├── Platform
    ├── Hình ảnh
    └── Ghi chú công việc
          ↓
Google Sheet
          ↓
n8n
          ↓
AI
    ├── Generate Facebook
    └── Generate LinkedIn
          ↓
PostgreSQL
          ↓
Content Manager
          ├── Review
          ├── Edit
          ├── Preview
          ├── Approve
          └── Schedule
                  ↓
                n8n
                  ↓
        ┌─────────┴─────────┐
        ↓                   ↓
    Facebook             LinkedIn
        ↓                   ↓
     Published           Published
```

---

# 2. Mục tiêu chính

Hệ thống phải giải quyết các vấn đề:

1. Không phải copy/paste content thủ công.
2. AI tự generate content.
3. Người dùng vẫn có quyền chỉnh sửa content trước khi đăng.
4. Facebook và LinkedIn có content riêng.
5. Có thể duyệt content trước khi đăng.
6. Có thể đặt lịch đăng.
7. Không tạo một n8n workflow cho từng bài.
8. Scheduler phải chạy tập trung.
9. Nếu Facebook thành công nhưng LinkedIn thất bại thì hai platform vẫn độc lập.
10. Có thể retry bài đăng lỗi.
11. Có lịch sử chỉnh sửa content.
12. PostgreSQL là source of truth.
13. Google Sheet chỉ là nguồn input từ Google Form.
14. OAuth/API credentials phải được bảo mật.

---

# 3. Phạm vi MVP

## Bắt buộc

### Input

- Google Form
- Google Sheet
- Google Drive images

### Automation

- n8n Google Sheet trigger
- AI generate content
- PostgreSQL insert
- n8n scheduler
- Facebook publish
- LinkedIn publish

### Web App

- Dashboard
- Content list
- Content detail
- Image gallery
- Facebook editor
- LinkedIn editor
- Preview
- Save
- Approve
- Schedule
- Calendar
- Published list
- Failed list
- Retry

### Database

- users
- content_items
- media_assets
- content_versions
- social_posts
- publish_logs

---

# 4. Không làm trong MVP

Không cần ưu tiên:

- Instagram
- TikTok
- X/Twitter
- Analytics nâng cao
- AI chatbot
- Mobile app
- Multi-tenant
- Advanced permission system
- Complex notification
- Advanced image processing
- AI image generation
- Drag/drop page builder


---

# 5. Tech Stack

## Frontend

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- Ant Design

## Backend

Có thể sử dụng Next.js Route Handlers/API hoặc service layer.

- TypeScript
- Prisma
- PostgreSQL

## Automation

- n8n

## Storage

MVP:

- Google Drive

Có thể mở rộng(sau này sẽ có phare sau):

- S3
- MinIO
- Cloudinary

## AI
AI tôi sử lý trên n8n và khi generate xong nó tự động lưu về dưới be
AI provider phải được abstraction.

Không hardcode logic AI trực tiếp vào UI.

Ví dụ:

```ts
interface AIService {
  generateFacebookPost(input: GeneratePostInput): Promise<string>;
  generateLinkedInPost(input: GeneratePostInput): Promise<string>;
}
```

---

# 6. Kiến trúc tổng thể

```text
                    GOOGLE FORM
                         │
                         ▼
                  GOOGLE SHEET
                         │
                    Row Added
                         │
                         ▼
                       n8n
                         │
             ┌───────────┼───────────┐
             │           │           │
             ▼           ▼           ▼
          Validate    Get Images    AI
                                      │
                           ┌──────────┴──────────┐
                           ▼                     ▼
                      Facebook              LinkedIn
                        Content                Content
                           │                     │
                           └──────────┬──────────┘
                                      ▼
                                PostgreSQL
                                      │
                                      ▼
                             Content Manager
                                      │
                     ┌────────────────┼────────────────┐
                     │                │                │
                     ▼                ▼                ▼
                   Review            Edit            Preview
                     │                │
                     └────────────────┤
                                      ▼
                                   Approve
                                      │
                                      ▼
                                  Schedule
                                      │
                                      ▼
                              PostgreSQL
                                      │
                                      ▼
                                     n8n
                               Schedule Trigger
                                      │
                           ┌──────────┴──────────┐
                           ▼                     ▼
                       Facebook              LinkedIn
                           │                     │
                           └──────────┬──────────┘
                                      ▼
                                  PostgreSQL
```

---

# 7. Nguyên tắc kiến trúc quan trọng

## 7.1 PostgreSQL là Source of Truth

Không dùng Google Sheet làm database chính.

Google Sheet chỉ:

```text
Google Form
    ↓
Google Sheet
    ↓
n8n
    ↓
PostgreSQL
```

Sau khi import:

```text
Frontend
    ↓
Backend
    ↓
PostgreSQL
```

Frontend không được liên tục polling Google Sheet.

---

# 8. Google Form

Google Form nên có các field:

## 8.1 Tên nhân viên

```text
Tên nhân viên
```

## 8.2 Platform

Cho phép:

```text
Facebook
LinkedIn
Facebook + LinkedIn
```

Backend phải convert về:

```text
facebook
linkedin
```

Nếu chọn cả hai thì tạo hai `social_posts`.

## 8.3 Hình ảnh

Cho phép upload nhiều ảnh.

Google Form sẽ lưu file vào Google Drive.

## 8.4 Ghi chú công việc

Chỉ dùng một textarea:

```text
Ghi chú công việc
```

Ví dụ:

```text
Hôm nay team đã hoàn thành việc lắp đặt hệ thống camera
tại văn phòng khách hàng. Đã kiểm tra kết nối, cấu hình
thiết bị và test toàn bộ camera trước khi bàn giao.
```

Không chia thành nhiều field nhỏ không cần thiết.

AI sẽ xử lý đoạn text này.

---

# 9. Google Sheet

Ví dụ:

| Timestamp | Employee | Platform | Images | Work Note | Status |
|---|---|---|---|---|---|
| ... | Nguyễn Văn A | Facebook + LinkedIn | Drive URLs | ... | pending |

Khi có submission mới:

```text
status = pending
```

---

# 10. Google Apps Script

Nếu dùng Apps Script để set status:

```js
function onFormSubmit(e) {
  const sheet = e.range.getSheet();
  const row = e.range.getRow();

  const statusColumn = 6;

  sheet
    .getRange(row, statusColumn)
    .setValue('pending');
}
```

Trigger bắt buộc:

```text
Deployment: Head
Event source: From spreadsheet
Event type: On form submit
Function: onFormSubmit
```

Không sử dụng:

```text
On open
```

Không bấm `Run` thủ công cho function `onFormSubmit(e)` vì khi chạy thủ công:

```text
e === undefined
```

và sẽ gây:

```text
Cannot read properties of undefined
```

---

# 11. n8n Workflow 01 — Receive Form

Tên đề xuất:

```text
Content - Receive Google Form
```

Trigger:

```text
Google Sheets Trigger
Event: Row Added
```

Không dùng:

```text
Row Updated
```

vì workflow có thể update status và gây loop.

---

# 12. n8n Workflow 01 flow

```text
Google Sheets Trigger
        ↓
Validate row
        ↓
Create source_row_id
        ↓
Check duplicate
        ↓
Get Google Drive images
        ↓
Analyze images / source
        ↓
Generate Facebook
        ↓
Generate LinkedIn
        ↓
Insert PostgreSQL
        ↓
status = draft
```

---

# 13. Deduplication

Mỗi submission phải có:

```text
source_row_id
```

Ví dụ:

```text
google_sheet_row_123
```

Trước khi insert:

```sql
SELECT id
FROM content_items
WHERE source_row_id = $1;
```

Nếu tồn tại:

```text
STOP
```

Không tạo duplicate.

Database nên có unique constraint:

```text
UNIQUE(source, source_row_id)
```

---

# 14. AI Generation

AI nhận:

```text
platform
original_note
images
```

AI phải generate riêng:

```text
Facebook
LinkedIn
```

Không lấy Facebook content rồi đổi vài câu thành LinkedIn.

---

# 15. Facebook Prompt Rules

Facebook content:

- dễ đọc
- tự nhiên
- gần gũi
- social-media friendly
- emoji vừa phải
- CTA nếu phù hợp
- hashtag phù hợp
- không bịa dữ liệu

Không được tự invent:

- customer name
- location
- project name
- technical specification
- numbers
- KPI
- dates
- product model

nếu source không cung cấp.

---

# 16. LinkedIn Prompt Rules

LinkedIn content:

- professional
- business-oriented
- technical nếu source có thông tin
- tập trung vào project/result
- ít emoji
- không quá casual
- hashtag phù hợp

Không được invent dữ liệu.

---

# 17. AI output

AI nên trả JSON có cấu trúc.

Ví dụ:

```json
{
  "facebook": {
    "content": "..."
  },
  "linkedin": {
    "content": "..."
  }
}
```

Không nên parse một đoạn text tự do nếu có thể tránh.

---

# 18. Database

## 18.1 users

```text
users
```

Fields:

```text
id UUID PK
name VARCHAR
email VARCHAR UNIQUE
role ENUM
created_at TIMESTAMP
updated_at TIMESTAMP
```

Roles:

```text
admin
editor
viewer
```

---

# 19. content_items

Đây là entity chính.

```text
content_items
```

Fields:

```text
id UUID PK
source VARCHAR
source_row_id VARCHAR
employee_name VARCHAR
original_note TEXT
status ENUM
created_at TIMESTAMP
updated_at TIMESTAMP
```

Status:

```text
pending
generating
draft
approved
rejected
archived
```

Index:

```text
source_row_id
status
created_at
```

Unique:

```text
(source, source_row_id)
```

---

# 20. content state machine

```text
pending
   ↓
generating
   ↓
draft
   ↓
approved
```

Có thể:

```text
draft
   ↓
rejected
   ↓
draft
```

Archive:

```text
draft / approved / published
        ↓
     archived
```

Không hard-delete mặc định.

---

# 21. media_assets

```text
media_assets
```

Fields:

```text
id UUID PK
content_id UUID FK
file_name VARCHAR
file_url TEXT
storage_type VARCHAR
mime_type VARCHAR
sort_order INT
created_at TIMESTAMP
```

Storage:

```text
google_drive
s3
minio
cloudinary
```

MVP dùng:

```text
google_drive
```

`sort_order` để giữ thứ tự ảnh.

---

# 22. content_versions

Dùng để lưu lịch sử chỉnh sửa.

```text
content_versions
```

Fields:

```text
id UUID PK
content_id UUID FK
platform ENUM
content TEXT
version INT
created_by UUID FK
created_at TIMESTAMP
```

Platform:

```text
facebook
linkedin
```

Khi user edit:

```text
version 1
→ version 2
→ version 3
```

Không overwrite history.

---

# 23. social_posts

Facebook và LinkedIn bắt buộc là hai record riêng.

```text
social_posts
```

Fields:

```text
id UUID PK
content_id UUID FK
platform ENUM
content TEXT
status ENUM
scheduled_at TIMESTAMP NULL
published_at TIMESTAMP NULL
external_post_id VARCHAR NULL
error_message TEXT NULL
retry_count INT DEFAULT 0
created_at TIMESTAMP
updated_at TIMESTAMP
```

Platform:

```text
facebook
linkedin
```

Status:

```text
draft
scheduled
publishing
published
failed
cancelled
```

---

# 24. Tại sao social_posts phải tách platform?

Ví dụ:

```text
content_items
      │
      ├── Facebook
      │      status = published
      │
      └── LinkedIn
             status = failed
```

Không được thiết kế:

```text
platform = "facebook,linkedin"
```

vì hai platform có thể:

- schedule khác nhau
- publish khác nhau
- fail khác nhau
- retry khác nhau
- external_post_id khác nhau

---

# 25. publish_logs

```text
publish_logs
```

Fields:

```text
id UUID PK
social_post_id UUID FK
platform ENUM
status VARCHAR
request_payload JSONB NULL
response_payload JSONB NULL
error_message TEXT NULL
created_at TIMESTAMP
```

Dùng để debug publishing.

Không log:

```text
access_token
refresh_token
client_secret
```

---

# 26. Prisma

Sử dụng:

```text
prisma/schema.prisma
```

Nên dùng:

```text
UUID
Enums
Foreign Keys
Indexes
Unique constraints
```

Relations:

```text
ContentItem
 ├── MediaAsset[]
 ├── ContentVersion[]
 └── SocialPost[]

SocialPost
 └── PublishLog[]
```

---

# 27. Project structure

```text
content-manager/
│
├── app/
│   ├── dashboard/
│   │   └── page.tsx
│   │
│   ├── contents/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   │
│   ├── calendar/
│   │   └── page.tsx
│   │
│   ├── published/
│   │   └── page.tsx
│   │
│   ├── failed/
│   │   └── page.tsx
│   │
│   ├── settings/
│   │   └── social-accounts/
│   │       └── page.tsx
│   │
│   └── api/
│       ├── contents/
│       ├── social-posts/
│       └── schedules/
│
├── components/
│   ├── content/
│   │   ├── ContentTable.tsx
│   │   ├── ContentEditor.tsx
│   │   ├── ContentPreview.tsx
│   │   ├── FacebookPreview.tsx
│   │   ├── LinkedInPreview.tsx
│   │   ├── ImageGallery.tsx
│   │   ├── PlatformTabs.tsx
│   │   ├── ContentStatus.tsx
│   │   └── VersionHistory.tsx
│   │
│   ├── schedule/
│   │   ├── ScheduleModal.tsx
│   │   ├── ScheduleCalendar.tsx
│   │   └── UpcomingPosts.tsx
│   │
│   ├── social/
│   │   ├── SocialAccountCard.tsx
│   │   └── ConnectionStatus.tsx
│   │
│   └── dashboard/
│       ├── StatsCard.tsx
│       ├── RecentContents.tsx
│       └── FailedPosts.tsx
│
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   └── services/
│       ├── content.service.ts
│       ├── content-version.service.ts
│       ├── social-post.service.ts
│       ├── schedule.service.ts
│       ├── publish.service.ts
│       └── ai.service.ts
│
├── prisma/
│   └── schema.prisma
│
├── types/
│   ├── content.ts
│   ├── social.ts
│   └── schedule.ts
│
├── public/
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

# 28. Dashboard

Route:

```text
/dashboard
```

Dashboard cards:

```text
Total Content
Draft
Waiting Approval
Scheduled
Published
Failed
```

Ví dụ:

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total        │ Draft        │ Scheduled    │ Published    │
│ 128          │ 12           │ 8            │ 103          │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

Bên dưới:

```text
Recent Content
Upcoming Posts
Failed Posts
```

---

# 29. Content List

Route:

```text
/contents
```

Columns:

```text
Image
Content Preview
Employee
Platform
Status
Created At
Scheduled At
Actions
```

Filters:

```text
Status
Platform
Date
Employee
```

Search:

```text
original_note
content
employee_name
```

Pagination bắt buộc.

Default:

```text
20 items/page
```

---

# 30. Content Detail

Route:

```text
/contents/[id]
```

UI:

```text
┌─────────────────────────────────────────────────────────┐
│ Content Detail                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Images                                                  │
│                                                         │
│ [IMG] [IMG] [IMG] [IMG]                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Original Work Note                                      │
│                                                         │
│ Hôm nay team đã...                                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [ Facebook ] [ LinkedIn ]                              │
│                                                         │
│ Content Editor                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │ AI generated content                                │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Preview                                                 │
│                                                         │
│ [Save] [Approve] [Schedule]                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 31. Content Editor

Editor phải cho phép:

- chỉnh sửa text
- giữ line breaks
- chỉnh hashtag
- chỉnh emoji
- save

Không cần copy/paste ra ngoài.

---

# 32. Facebook / LinkedIn tabs

```text
[ Facebook ] [ LinkedIn ]
```

Mỗi tab có:

```text
content
preview
status
save
approve
schedule
```

---

# 33. Preview

Tạo:

```text
FacebookPreview.tsx
LinkedInPreview.tsx
```

Preview cần hiển thị:

- text
- line breaks
- hashtags
- images
- layout cơ bản

Không cần clone 100% giao diện Facebook/LinkedIn.

---

# 34. Approval

Flow:

```text
draft
   ↓
approved
```

Trước khi approve:

```text
content != empty
```

Approve cả content item hoặc từng social post tùy thiết kế.

Khuyến nghị MVP:

- Content có thể được approve sau khi cả hai platform đã có content.
- Social post chỉ được schedule khi content đã approved.

---

# 35. Scheduling

Khi user click:

```text
Schedule
```

Hiển thị:

```text
Schedule Post

Date:
[ 10/09/2026 ]

Time:
[ 09:30 ]

Platform:
Facebook

[Cancel] [Schedule]
```

Sau khi schedule:

```text
status = scheduled
scheduled_at = selected datetime
```

---

# 36. Multi-platform schedule

Facebook và LinkedIn có thể có giờ khác nhau.

Ví dụ:

```text
Facebook
10/09/2026 09:00

LinkedIn
10/09/2026 14:00
```

Do đó:

```text
scheduled_at
```

phải nằm trong `social_posts`.

Không đặt `scheduled_at` chung ở `content_items`.

---

# 37. Calendar

Route:

```text
/calendar
```

Hiển thị:

```text
Month
Week
Day
```

Mỗi post hiển thị:

```text
time
platform
content preview
status
```

Ví dụ:

```text
10 Sep

09:00
Facebook
"Đã hoàn thành..."

14:30
LinkedIn
"Completed another..."
```

---

# 38. Calendar drag & drop

Có thể implement Phase 2.

Khi drag:

```text
Post
 ↓
New datetime
 ↓
PUT /api/social-posts/:id
 ↓
scheduled_at = new datetime
```

Không cần thay đổi n8n.

---

# 39. Scheduler Architecture

Cực kỳ quan trọng:

## KHÔNG

Tạo:

```text
1 post = 1 n8n workflow
```

Không làm vậy.

## ĐÚNG

Chỉ có một workflow:

```text
Content - Social Scheduler
```

Chạy mỗi 1 phút.

---

# 40. n8n Scheduler

Trigger:

```text
Schedule Trigger
Every 1 minute
```

Query:

```sql
SELECT *
FROM social_posts
WHERE status = 'scheduled'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC
LIMIT 50;
```

---

# 41. Scheduler Flow

```text
Schedule Trigger
        ↓
PostgreSQL
        ↓
Get due posts
        ↓
Loop Over Items
        ↓
Claim post
        ↓
Switch platform
   ┌────┴────┐
   ↓         ↓
Facebook  LinkedIn
   ↓         ↓
Publish   Publish
   ↓         ↓
Success? Success?
   ↓         ↓
Update DB Update DB
```

---

# 42. Prevent Double Publishing

Trước khi publish:

```text
scheduled
```

phải chuyển thành:

```text
publishing
```

bằng atomic update.

Ví dụ:

```sql
UPDATE social_posts
SET
    status = 'publishing',
    updated_at = NOW()
WHERE id = $1
  AND status = 'scheduled';
```

Nếu affected rows:

```text
1
```

→ được phép publish.

Nếu:

```text
0
```

→ post đã được worker khác claim, không publish.

Đây là yêu cầu bắt buộc.

---

# 43. Publish Success

Nếu API publish thành công:

```text
status = published
published_at = NOW()
external_post_id = API response
error_message = NULL
```

---

# 44. Publish Failed

Nếu lỗi:

```text
status = failed
error_message = error
retry_count += 1
```

Ví dụ:

```text
Status: Failed

Error:
OAuth token expired
```

UI phải hiển thị:

```text
[Retry]
```

---

# 45. Retry

Automatic retry tối đa:

```text
3 attempts
```

Sau 3 lần:

```text
failed
```

Manual retry:

```text
failed
 ↓
scheduled
 ↓
scheduler
 ↓
publishing
 ↓
published
```

---

# 46. OAuth

OAuth là bắt buộc nếu ứng dụng trực tiếp xin quyền đăng bài thay mặt tài khoản.

Flow:

```text
User
 ↓
Connect Facebook
 ↓
OAuth authorization
 ↓
Callback
 ↓
Store credential securely
```

LinkedIn tương tự.

Không cần OAuth lại mỗi lần post.

OAuth lại khi:

- token expired
- token revoked
- user disconnect
- scope thay đổi

---

# 47. Credential Architecture

MVP nên ưu tiên:

```text
n8n = credential owner
Web App = content/schedule manager
```

Tức là:

```text
Web App
    ↓
PostgreSQL
    ↓
scheduled post
    ↓
n8n
    ↓
Facebook / LinkedIn
```

Không nên lưu OAuth token ở frontend.

Không duplicate credential nếu không cần.

---

# 48. Social Account UI

Route:

```text
/settings/social-accounts
```

UI:

```text
Social Accounts

Facebook
🟢 Connected

[Reconnect] [Disconnect]


LinkedIn
🟢 Connected

[Reconnect] [Disconnect]
```

Nếu chưa kết nối:

```text
Facebook
🔴 Not connected

[Connect]
```

---

# 49. Social Publisher abstraction

Không viết business logic trực tiếp cho từng platform trong page/component.

Dùng interface:

```ts
interface SocialPublisher {
  publishPost(
    input: PublishPostInput
  ): Promise<PublishResult>;
}
```

Implement:

```text
FacebookPublisher
LinkedInPublisher
```

Sau này có thể thêm:

```text
InstagramPublisher
TikTokPublisher
TwitterPublisher
```

mà không ảnh hưởng core logic.

---

# 50. API

## Content

```http
GET /api/contents
GET /api/contents/:id
POST /api/contents
PUT /api/contents/:id
DELETE /api/contents/:id
```

---

# 51. Generate

```http
POST /api/contents/:id/generate
```

Body:

```json
{
  "platform": "facebook"
}
```

hoặc:

```json
{
  "platform": "linkedin"
}
```

Không overwrite version cũ.

---

# 52. Versions

```http
GET /api/contents/:id/versions
POST /api/contents/:id/versions
POST /api/contents/:id/restore
```

Restore body:

```json
{
  "versionId": "uuid"
}
```

---

# 53. Social Posts

```http
GET /api/social-posts
GET /api/social-posts/:id
PUT /api/social-posts/:id
POST /api/social-posts/:id/approve
POST /api/social-posts/:id/schedule
POST /api/social-posts/:id/cancel
POST /api/social-posts/:id/retry
```

Schedule body:

```json
{
  "scheduledAt": "2026-09-10T09:30:00+07:00"
}
```

---

# 54. API Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "CONTENT_NOT_FOUND",
    "message": "Content not found"
  }
}
```

---

# 55. Backend Validation

Không tin frontend validation.

Backend phải validate:

- UUID
- platform
- status
- content
- scheduledAt
- permissions
- state transition

Ví dụ:

Không cho:

```text
draft → published
```

Không cho schedule nếu:

```text
status != approved
```

Không cho publish nếu:

```text
status != scheduled
```

---

# 56. Status Rules

## Content

```text
pending
generating
draft
approved
rejected
archived
```

## Social Post

```text
draft
scheduled
publishing
published
failed
cancelled
```

---

# 57. State Transition

Content:

```text
pending
 ↓
generating
 ↓
draft
 ↓
approved
```

Rejection:

```text
draft
 ↓
rejected
 ↓
draft
```

Social:

```text
draft
 ↓
scheduled
 ↓
publishing
 ↓
published
```

Failure:

```text
publishing
 ↓
failed
 ↓
scheduled
```

Cancel:

```text
scheduled
 ↓
cancelled
```

---

# 58. Timezone

Business timezone:

```text
Asia/Ho_Chi_Minh
```

UI phải hiển thị giờ Việt Nam.

Ví dụ:

```text
10/09/2026 09:30
```

Database nên dùng timestamp có timezone hoặc quy ước UTC rõ ràng.

Không được double-convert timezone.

---

# 59. Security

Không expose:

```text
DATABASE_URL
OPENAI_API_KEY
FACEBOOK_APP_SECRET
LINKEDIN_CLIENT_SECRET
OAuth access tokens
OAuth refresh tokens
N8N_API_KEY
```

Frontend không được nhận secret.

`.env` không commit.

Có:

```text
.env.example
```

Ví dụ:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/content_manager"

N8N_BASE_URL=""

N8N_API_KEY=""

OPENAI_API_KEY=""

FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""

LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

# 60. Logging

Log:

```text
API error
AI generation error
Database error
Scheduler error
Publish error
OAuth error
```

Không log:

```text
access token
refresh token
client secret
API keys
```

---

# 61. Loading State

Các action phải có loading state:

```text
Saving...
Generating...
Approving...
Scheduling...
Publishing...
Retrying...
```

Button phải disable khi đang request.

Không cho user click 5 lần để tạo 5 request.

---

# 62. Toast

Dùng Ant Design message/notification.

Ví dụ:

```text
Content saved successfully
```

```text
Post scheduled successfully
```

```text
Failed to publish post
```

---

# 63. Status UI

Tạo reusable component:

```text
ContentStatus
SocialPostStatus
```

Không hardcode status UI ở nhiều nơi.

Suggested:

```text
Draft       → default
Pending     → warning
Approved    → processing
Scheduled   → processing
Published   → success
Failed      → error
Cancelled   → default
```

---

# 64. Pagination

Content list:

```http
GET /api/contents?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

Không load toàn bộ database.

---

# 65. Search

Search:

```text
employee_name
original_note
social_posts.content
```

Frontend debounce khoảng:

```text
300-500ms
```

---

# 66. Soft Delete

Không hard-delete mặc định.

Sử dụng:

```text
archived
```

hoặc field:

```text
deleted_at
```

nếu cần.

MVP có thể dùng `archived` status.

---

# 67. Service Layer

Business logic phải nằm trong service.

Ví dụ:

```ts
contentService.getContent(id)

contentService.updateContent(id, data)

contentService.approveContent(id)

socialPostService.schedulePost(id, scheduledAt)

socialPostService.cancelPost(id)

socialPostService.retryPost(id)
```

Không đặt toàn bộ logic trong React component.

---

# 68. Transaction

Các operation liên quan nhiều table phải dùng transaction.

Ví dụ approve:

```text
BEGIN
  update content
  update social posts
  create version if needed
COMMIT
```

Nếu lỗi:

```text
ROLLBACK
```

---

# 69. Content Editing

Khi user chỉnh sửa:

```text
Old version
    ↓
New version
```

Ví dụ:

```text
Version 1
AI generated

Version 2
User edited

Version 3
User edited again
```

Version history phải xem được.

---

# 70. Version History UI

Trong detail:

```text
Version History

v3
Today 09:30
Edited by Nguyễn Văn A
[View] [Restore]

v2
Today 09:15
Edited by Nguyễn Văn A
[View] [Restore]

v1
Today 09:00
AI Generated
[View] [Restore]
```

---

# 71. Failed Posts Page

Route:

```text
/failed
```

Hiển thị:

```text
Platform
Content
Scheduled Time
Error
Retry Count
Last Attempt
Action
```

Action:

```text
[Retry]
```

---

# 72. Published Page

Route:

```text
/published
```

Hiển thị:

```text
Platform
Content
Published At
External Post ID
Status
```

Có thể thêm external link nếu API trả về URL.

---

# 73. n8n Error Handling

n8n phải phân biệt:

```text
AI error
Google Drive error
Database error
Facebook error
LinkedIn error
```

Mỗi loại phải update đúng status.

Ví dụ AI fail:

```text
content_items.status = draft
```

và lưu error nếu có field/log phù hợp.

Publish fail:

```text
social_posts.status = failed
```

---

# 74. n8n Workflow 01 Detailed

```text
[Google Sheets Trigger]
          ↓
[Set / Normalize Data]
          ↓
[Validate Required Fields]
          ↓
[PostgreSQL: Check Duplicate]
          ↓
       [IF exists?]
       /          \
     YES           NO
      ↓             ↓
    STOP      [Create Content]
                    ↓
            [Get Drive Images]
                    ↓
              [AI Analyze]
                    ↓
           [Generate Facebook]
                    ↓
           [Generate LinkedIn]
                    ↓
           [Create Media Assets]
                    ↓
            [Create Social Posts]
                    ↓
             [Update Status]
                    ↓
                  DONE
```

---

# 75. n8n Workflow 02 Detailed

Tên:

```text
Content - Social Scheduler
```

```text
[Schedule Trigger]
Every 1 minute
        ↓
[PostgreSQL]
Find due posts
        ↓
[Loop]
        ↓
[Atomic Claim]
scheduled → publishing
        ↓
[Switch Platform]
      /        \
Facebook      LinkedIn
   ↓              ↓
Publish API    Publish API
   ↓              ↓
Success?        Success?
 /    \          /    \
YES    NO       YES    NO
 ↓      ↓        ↓      ↓
Update Update   Update Update
Published Failed Published Failed
```

---

# 76. Scheduler Query

```sql
SELECT
    id,
    content_id,
    platform,
    content,
    scheduled_at,
    retry_count
FROM social_posts
WHERE status = 'scheduled'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC
LIMIT 50;
```

Nếu cần lock mạnh hơn, có thể dùng transaction + `FOR UPDATE SKIP LOCKED`.

Ví dụ:

```sql
SELECT *
FROM social_posts
WHERE status = 'scheduled'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at
FOR UPDATE SKIP LOCKED
LIMIT 50;
```

Sau đó claim trong transaction.

---

# 77. Race Condition

Scheduler phải chịu được trường hợp:

```text
Worker A
Worker B
```

cùng thấy một post.

Không được:

```text
Worker A → publish
Worker B → publish
```

Kết quả duplicate.

Phải:

```text
Worker A → claim → publishing
Worker B → cannot claim
```

---

# 78. API Idempotency

Publish operation nên có cơ chế chống duplicate nếu platform API hỗ trợ.

Ngoài database status, có thể dùng:

```text
idempotency key
```

hoặc:

```text
social_post.id
```

làm internal identifier.

---

# 79. Authentication

MVP có thể dùng auth đơn giản nhưng phải có architecture đủ tốt để mở rộng.

Khuyến nghị:

```text
users
roles
session
```

Role:

```text
admin
editor
viewer
```

Permissions:

### admin

- tất cả

### editor

- view
- edit
- approve
- schedule
- retry

### viewer

- view

---

# 80. UI Permission

Không chỉ hide button ở frontend.

Backend phải kiểm tra permission.

Ví dụ viewer gọi:

```http
POST /api/social-posts/:id/schedule
```

→ phải trả:

```text
403 Forbidden
```

---

# 81. Dashboard Metrics

MVP:

```text
Total
Draft
Pending Approval
Scheduled
Published
Failed
```

Có thể query:

```sql
SELECT status, COUNT(*)
FROM social_posts
GROUP BY status;
```

---

# 82. Responsive

Web app ưu tiên desktop vì là internal admin tool.

Nhưng vẫn phải usable trên tablet.

Desktop layout:

```text
Sidebar
    +
Main content
```

Mobile không cần tối ưu sâu trong MVP.

---

# 83. UI Style

Phong cách:

```text
Clean
Modern
Professional
Internal SaaS dashboard
```

Không cần quá màu mè.

Ưu tiên:

- khoảng trắng
- typography rõ
- table dễ đọc
- status rõ
- action dễ tìm

Dùng Ant Design components nếu phù hợp:

```text
Layout
Menu
Table
Tabs
Card
Tag
Badge
Modal
Form
Input
DatePicker
TimePicker
Button
Drawer
Notification
```

---

# 84. Content Detail UX

Ưu tiên workflow:

```text
Open content
    ↓
See images
    ↓
See original note
    ↓
Select platform
    ↓
Edit
    ↓
Preview
    ↓
Save
    ↓
Approve
    ↓
Schedule
```

Không bắt user đi qua quá nhiều page.

---

# 85. Schedule UX

User phải nhìn thấy rõ:

```text
Platform
Scheduled Date
Scheduled Time
Timezone
```

Ví dụ:

```text
Facebook
10/09/2026
09:30
Asia/Ho_Chi_Minh
```

---

# 86. Reschedule

Nếu post:

```text
scheduled
```

user có thể đổi:

```text
scheduled_at
```

Ví dụ:

```text
09:30 → 14:00
```

Không tạo workflow n8n mới.

Scheduler tự nhận giờ mới.

---

# 87. Cancel Schedule

Nếu:

```text
scheduled
```

user click:

```text
Cancel
```

thì:

```text
status = cancelled
```

Scheduler query chỉ lấy:

```text
status = scheduled
```

nên không publish.

---

# 88. Manual Publish

MVP có thể chưa cần.

Nếu implement:

```text
approved
 ↓
Publish Now
 ↓
publishing
 ↓
published / failed
```

Không được bỏ qua `publishing`.

---

# 89. AI Regenerate

Phase 2.

UI:

```text
Regenerate
```

Options:

```text
Improve
Shorter
More professional
More engaging
More technical
```

Backend:

```http
POST /api/contents/:id/generate
```

Tạo version mới.

Không xóa version cũ.

---

# 90. AI Edit Assistant

Phase 3.

Ví dụ:

```text
Make it shorter
Add CTA
Remove emojis
Make it more professional
```

AI trả content mới.

User phải review trước khi save/approve.

AI không được tự publish.

---

# 91. Image handling

MVP:

```text
Google Drive
```

Database chỉ lưu metadata + URL/reference.

Không lưu binary image trong PostgreSQL.

Không base64 image vào DB.

---

# 92. Future Storage

Có thể migrate:

```text
Google Drive
     ↓
S3 / MinIO
```

Nên abstraction:

```ts
interface StorageService {
  getFileUrl(id: string): Promise<string>;
  downloadFile(id: string): Promise<Buffer>;
}
```

---

# 93. Environment Variables

`.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/content_manager"

NEXT_PUBLIC_APP_URL="http://localhost:3000"

N8N_BASE_URL=""
N8N_API_KEY=""

OPENAI_API_KEY=""

FACEBOOK_APP_ID=""
FACEBOOK_APP_SECRET=""

LINKEDIN_CLIENT_ID=""
LINKEDIN_CLIENT_SECRET=""
```

Không commit `.env`.

---

# 94. Docker

Có thể cung cấp:

```text
docker-compose.yml
```

cho local development:

```text
postgres
```

Có thể thêm:

```text
adminer
```

nếu cần debug DB.

MVP không bắt buộc chạy Next.js trong Docker.

---

# 95. Local Development

Commands:

```bash
npm install
```

```bash
npx prisma generate
```

```bash
npx prisma migrate dev
```

```bash
npm run dev
```

Check:

```text
http://localhost:3000
```

---

# 96. Required scripts

`package.json` nên có:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed"
  }
}
```

Nếu Next.js version không còn hỗ trợ `next lint`, dùng command lint phù hợp với version đang sử dụng.

---

# 97. Seed Data

Seed:

```text
1 admin
1 editor
1 viewer
```

Content:

```text
3 content items
```

Có đủ status:

```text
draft
approved
scheduled
published
failed
```

Social posts:

```text
Facebook
LinkedIn
```

Mục đích:

```text
UI có thể test ngay trước khi tích hợp n8n.
```

---

# 98. Testing

MVP cần test tối thiểu:

## Database

- migration
- relations
- unique constraint

## API

- get content
- update content
- approve
- schedule
- cancel
- retry

## State transition

Test:

```text
draft → approved
approved → scheduled
scheduled → publishing
publishing → published
publishing → failed
```

Test invalid:

```text
draft → published
```

phải fail.

---

# 99. Important Edge Cases

Phải xử lý:

### Duplicate Google Sheet row

→ không tạo duplicate.

### Empty work note

→ reject hoặc mark invalid.

### Không có image

→ vẫn có thể generate nếu workflow cho phép.

### AI fail

→ không tạo social post hoàn chỉnh.

### Facebook fail

→ LinkedIn vẫn có thể publish.

### LinkedIn fail

→ Facebook vẫn giữ published.

### Token expired

→ post failed + hiển thị reconnect.

### User schedule trong quá khứ

→ reject.

### User click Schedule nhiều lần

→ không tạo duplicate.

### Scheduler chạy đồng thời

→ không duplicate publish.

### User sửa bài đã scheduled

Phải quyết định:

```text
scheduled → edit → vẫn scheduled
```

Nhưng nếu đã `publishing` hoặc `published` thì không cho sửa nội dung publish.

---

# 100. Editing rules by status

## draft

Cho edit.

## approved

Cho edit nhưng nên yêu cầu approve lại sau khi thay đổi.

Khuyến nghị:

```text
approved
   ↓ edit
draft
```

## scheduled

Cho edit nếu:

```text
scheduled_at > NOW()
```

Nhưng sau khi edit:

```text
scheduled
```

có thể giữ nguyên nếu business muốn.

Khuyến nghị an toàn:

```text
scheduled
   ↓ edit
approved
```

sau đó user schedule lại.

## publishing

Không cho edit.

## published

Không cho edit content đã publish.

Nếu cần chỉnh sửa, tạo version mới hoặc manual edit trên platform.

---

# 101. Content vs Social Post

Phân biệt rõ:

## content_items

Thông tin gốc của công việc.

Ví dụ:

```text
Technician
Original note
Images
```

## social_posts

Nội dung dùng để đăng.

Ví dụ:

```text
Facebook post
LinkedIn post
```

Một content có thể có nhiều social posts.

---

# 102. Example

Input:

```text
Employee:
Nguyễn Văn A

Note:
Team hoàn thành lắp đặt camera tại văn phòng khách hàng.
Đã cấu hình và kiểm tra toàn bộ hệ thống.
```

Database:

```text
content_items
--------------------------------
id = 123
employee_name = Nguyễn Văn A
original_note = ...
status = draft
```

Media:

```text
media_assets
--------------------------------
image1
image2
image3
```

Social posts:

```text
social_posts
--------------------------------
id = fb01
content_id = 123
platform = facebook
status = draft

id = li01
content_id = 123
platform = linkedin
status = draft
```

---

# 103. Schedule Example

User approve.

```text
content.status = approved
```

Facebook:

```text
social_posts.status = scheduled
scheduled_at = 2026-09-10 09:00
```

LinkedIn:

```text
social_posts.status = scheduled
scheduled_at = 2026-09-10 14:00
```

Scheduler lúc 09:00:

```text
Facebook → publishing → published
```

Scheduler lúc 14:00:

```text
LinkedIn → publishing → published
```

---

# 104. Failure Example

Facebook:

```text
published
external_post_id = fb_123
```

LinkedIn:

```text
failed
error_message = token expired
retry_count = 1
```

UI:

```text
Facebook
🟢 Published

LinkedIn
🔴 Failed

Error:
Token expired

[Reconnect] [Retry]
```

---

# 105. Notification

MVP có thể dùng toast.

Phase 2:

- email
- Slack
- notification center

Không cần implement ngay.

---

# 106. Audit Log

Phase 2.

Có thể track:

```text
user edited content
user approved content
user scheduled content
user cancelled post
user retried post
```

---

# 107. Analytics

Phase 3.

Có thể track:

```text
likes
comments
shares
impressions
clicks
```

Nhưng không cần cho MVP.

---

# 108. Performance

Backend:

- pagination
- indexes
- select only needed columns
- avoid N+1 queries

Frontend:

- debounce search
- lazy load images nếu cần
- loading state
- avoid unnecessary re-render

---

# 109. Database Indexes

Ít nhất:

```text
content_items.status
content_items.created_at
content_items.source_row_id
social_posts.status
social_posts.platform
social_posts.scheduled_at
social_posts.content_id
media_assets.content_id
content_versions.content_id
publish_logs.social_post_id
```

---

# 110. API Security

Mọi API mutation:

```text
POST
PUT
PATCH
DELETE
```

phải check:

```text
authenticated user
role
permission
input validation
```

---

# 111. CORS

Nếu frontend/backend cùng Next.js:

```text
không cần CORS phức tạp
```

Nếu tách backend:

```text
configure CORS explicitly
```

Không dùng:

```text
Access-Control-Allow-Origin: *
```

trong production nếu không cần.

---

# 112. Production

Production architecture:

```text
Internet
   ↓
Reverse Proxy
   ↓
Next.js
   ↓
PostgreSQL

n8n
   ↓
PostgreSQL

n8n
   ↓
Facebook / LinkedIn
```

Environment variables nằm trên server.

---

# 113. Backup

PostgreSQL phải có backup.

Tối thiểu:

```text
daily backup
```

MVP local không cần automation backup nhưng production phải có.

---

# 114. Migration Strategy

Mọi thay đổi database:

```text
Prisma migration
```

Không sửa production DB thủ công nếu không cần.

---

# 115. Development phases

## Phase 1 — Foundation

Implement:

- Next.js
- TypeScript
- Tailwind
- Ant Design
- Prisma
- PostgreSQL
- schema
- migrations
- seed
- base layout
- auth skeleton

---

## Phase 2 — Content Management

Implement:

- Dashboard
- Content list
- Content detail
- Images
- Editor
- Platform tabs
- Preview
- Save
- Version history

---

## Phase 3 — Approval & Scheduling

Implement:

- Approve
- Schedule
- Cancel
- Calendar
- Reschedule

---

## Phase 4 — n8n

Implement:

- Google Sheet trigger
- duplicate checking
- Drive images
- AI generation
- PostgreSQL insertion

---

## Phase 5 — Publishing

Implement:

- scheduler
- Facebook publisher
- LinkedIn publisher
- publishing logs
- failure handling
- retry

---

## Phase 6 — OAuth / Social Accounts

Nếu credentials chuyển từ n8n sang application:

- OAuth
- callback
- credential storage
- reconnect
- disconnect
- token refresh

---

# 116. Definition of Done — MVP

## Project

- [ ] Project starts locally
- [ ] PostgreSQL connects
- [ ] Prisma works
- [ ] Migration works
- [ ] Seed works

## Content

- [ ] Content list works
- [ ] Content detail works
- [ ] Images display
- [ ] Original note displays
- [ ] Facebook editor works
- [ ] LinkedIn editor works
- [ ] Save works
- [ ] Version history works

## Approval

- [ ] Approve works
- [ ] Invalid state transitions rejected

## Scheduling

- [ ] Schedule modal works
- [ ] scheduled_at saved
- [ ] Cancel works
- [ ] Calendar works

## n8n

- [ ] Google Sheet Row Added works
- [ ] Duplicate protection works
- [ ] AI generation works
- [ ] PostgreSQL insert works
- [ ] Scheduler works

## Publishing

- [ ] Facebook publish works
- [ ] LinkedIn publish works
- [ ] Published status works
- [ ] external_post_id saved
- [ ] Failed status works
- [ ] Error message saved
- [ ] Retry works
- [ ] Duplicate publishing prevented

## Security

- [ ] Secrets are not exposed
- [ ] `.env` ignored
- [ ] `.env.example` exists
- [ ] API permissions exist
- [ ] OAuth tokens are protected

## Quality

- [ ] TypeScript passes
- [ ] Lint passes
- [ ] Build passes
- [ ] No obvious console errors
- [ ] No unnecessary `any`

---

# 117. Codex / AI Coding Agent Instructions

Đây là phần QUAN TRỌNG NHẤT.

AI Coding Agent phải tuân thủ:

## Rule 1

Trước khi code:

```text
Inspect repository.
```

Nếu project đã tồn tại:

- không overwrite bừa
- không xóa code đang hoạt động
- reuse dependencies
- reuse components nếu phù hợp

---

## Rule 2

Không code toàn bộ project một lần nếu repo chưa có gì.

Làm từng phase.

Thứ tự:

```text
Database
→ Seed
→ Layout
→ Dashboard
→ Content List
→ Content Detail
→ Editor
→ Approval
→ Schedule
→ Calendar
→ n8n
→ Publishing
→ Retry
→ OAuth
```

---

## Rule 3

Sau mỗi phase:

```bash
npm run typecheck
npm run lint
npm run build
```

Nếu command không tồn tại:

- bổ sung script phù hợp
- hoặc sử dụng command tương đương với version framework đang dùng.

Không để project ở trạng thái build fail.

---

## Rule 4

Không tạo duplicate architecture.

Nếu đã có:

```text
lib/db.ts
```

thì reuse.

Không tạo thêm:

```text
database.ts
postgres.ts
dbClient.ts
```

mà không có lý do.

---

## Rule 5

Không đặt business logic trong UI.

Sai:

```tsx
<Button onClick={async () => {
  // 100 lines business logic
}}>
```

Đúng:

```tsx
await socialPostService.schedulePost(...)
```

---

## Rule 6

Không hardcode:

```text
OAuth token
API key
database password
```

---

## Rule 7

Không hardcode platform logic vào nhiều component.

Dùng:

```text
SocialPublisher
```

và platform-specific services.

---

## Rule 8

Không tạo n8n workflow cho từng post.

Chỉ:

```text
Receive Form Workflow
```

và:

```text
Social Scheduler Workflow
```

---

## Rule 9

Không dùng Google Sheet làm DB.

Google Sheet chỉ input.

---

## Rule 10

Không để Facebook và LinkedIn dùng chung một social_post.

Mỗi platform một record.

---

## Rule 11

Không cho scheduler publish trực tiếp các record:

```text
draft
approved
failed
cancelled
```

Chỉ:

```text
scheduled
```

---

## Rule 12

Trước publish:

```text
scheduled → publishing
```

phải atomic.

---

## Rule 13

Nếu publish Facebook fail:

```text
Facebook = failed
```

không được:

```text
Content = failed
```

và làm LinkedIn không chạy.

Hai social posts độc lập.

---

## Rule 14

AI không được tự publish.

AI chỉ:

```text
generate
```

Human:

```text
review
edit
approve
schedule
```

Scheduler:

```text
publish
```

---

# 118. Expected User Journey

Cuối cùng, user experience phải đơn giản:

```text
Technician submits form
        ↓
AI automatically creates content
        ↓
User opens Content Manager
        ↓
Sees images + generated content
        ↓
Edits if necessary
        ↓
Clicks Approve
        ↓
Clicks Schedule
        ↓
Selects date/time
        ↓
Done
```

Sau đó:

```text
n8n
 ↓
detect due post
 ↓
publish
 ↓
update status
```

User không cần mở Facebook/LinkedIn để copy paste.

---

# 119. Core Product Principle

Toàn bộ hệ thống xoay quanh:

```text
INPUT
Google Form

        ↓

AUTOMATION
n8n + AI

        ↓

SOURCE OF TRUTH
PostgreSQL

        ↓

HUMAN REVIEW
Content Manager

        ↓

APPROVAL
Human

        ↓

SCHEDULING
Database

        ↓

AUTOMATION
n8n Scheduler

        ↓

PUBLISH
Facebook / LinkedIn
```

Ưu tiên:

```text
Simple
Reliable
Maintainable
Extensible
```

Không over-engineer MVP.

---

# 120. Final instruction to AI Coding Agent

Hãy triển khai project theo specification này.

Trước mỗi thay đổi lớn:

1. Inspect code hiện tại.
2. Xác định dependency/component/service có thể reuse.
3. Implement feature nhỏ nhất đáp ứng requirement.
4. Validate TypeScript.
5. Validate lint.
6. Validate build.
7. Không phá functionality đang có.
8. Không thêm dependency không cần thiết.
9. Không hardcode secrets.
10. Không bỏ qua error handling.

Nếu một requirement chưa đủ thông tin để quyết định implementation detail:

- chọn phương án đơn giản nhất
- phù hợp với kiến trúc hiện tại
- ghi rõ assumption trong code/documentation
- không tự ý thay đổi architecture cốt lõi.

Ưu tiên triển khai MVP hoàn chỉnh trước khi làm feature nâng cao.

---

# 121. Short Command for AI Agent

Nếu cần một instruction ngắn để chạy cùng README:

```text
Read README.md completely before coding.

Treat README.md as the technical specification.

First inspect the existing repository and determine the current architecture.

Implement the project incrementally in this order:

1. Database + Prisma
2. Seed data
3. Dashboard
4. Content CRUD
5. Content editor
6. Facebook/LinkedIn tabs
7. Preview
8. Version history
9. Approval
10. Scheduling
11. Calendar
12. n8n Google Sheet integration
13. AI generation
14. n8n scheduler
15. Facebook publishing
16. LinkedIn publishing
17. Failed posts + retry
18. OAuth/social account management

Do not over-engineer.

PostgreSQL is the source of truth.
Google Sheet is only the input source.
Facebook and LinkedIn must use separate social_post records.
Do not create one n8n workflow per scheduled post.
Use one database-driven scheduler.
Prevent duplicate publishing with atomic state transitions.
Never expose secrets or OAuth tokens to the frontend.

After each major phase run typecheck, lint and build and fix all errors.
```

---

# 122. Final Architecture

```text
                         ┌──────────────────┐
                         │   Google Form    │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Google Sheet   │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │       n8n        │
                         │  Receive Form    │
                         └────────┬─────────┘
                                  │
                         ┌────────┴────────┐
                         │                 │
                         ▼                 ▼
                  Google Drive            AI
                    Images          Facebook/LinkedIn
                         │                 │
                         └────────┬────────┘
                                  ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │ Source of Truth  │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │    Content Manager       │
                    │                          │
                    │ Dashboard                │
                    │ Content List             │
                    │ Editor                   │
                    │ Preview                  │
                    │ Approval                 │
                    │ Schedule                 │
                    │ Calendar                 │
                    │ History                  │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │ scheduled_posts  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │       n8n        │
                         │    Scheduler     │
                         │   Every 1 min    │
                         └────────┬─────────┘
                                  │
                         ┌────────┴────────┐
                         ▼                 ▼
                  ┌─────────────┐   ┌─────────────┐
                  │  Facebook   │   │  LinkedIn   │
                  └──────┬──────┘   └──────┬──────┘
                         │                 │
                         └────────┬────────┘
                                  ▼
                         ┌──────────────────┐
                         │   PostgreSQL     │
                         │ published/failed│
                         └──────────────────┘
```

**END OF SPECIFICATION**
