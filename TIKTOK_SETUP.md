# Luồng đăng video TikTok

Google Form/Sheet → AI tạo caption → Content Manager duyệt → lên lịch → n8n gửi video và caption tới Buffer → Buffer đăng lên TikTok → callback.

## Token TikTok (chỉ dùng nếu đăng trực tiếp qua TikTok API)

Workflow hiện dùng node Buffer, nên app không cần `TIKTOK_ACCESS_TOKEN` để mở cài đặt hoặc duyệt/lên lịch bài. Phần này chỉ cần nếu bạn chuyển lại sang nhánh TikTok Direct Post.

Có sẵn script `scripts/get_tiktok_token.py`, chỉ cần Python 3, không cài thư viện ngoài. Script thực hiện bước tạo link cấp quyền và đổi code thành token theo [OAuth TikTok](https://developers.tiktok.com/docs/en/oauth-user-access-token-management).

Trước khi chạy, chuẩn bị Client key, Client secret, quyền `video.publish` và Redirect URI HTTPS đã đăng ký trong Login Kit. Nếu dùng callback n8n: tạo workflow Webhook GET, path `tiktok-oauth-callback`, Authentication None, Respond Immediately; Publish/Activate workflow và đăng ký **Production URL** đó với TikTok.

Từ thư mục dự án, chạy:

```bash
python3 scripts/get_tiktok_token.py
```

1. Nhập Client key, Client secret và Redirect URI khi script hỏi. Client secret nhập ẩn: dán rồi Enter, Terminal không hiển thị ký tự.
2. Trình duyệt mở link cấp quyền; đăng nhập đúng tài khoản TikTok và đồng ý. Nếu không tự mở, copy link được in trong Terminal.
3. Khi TikTok chuyển về callback n8n, copy toàn bộ URL trên thanh địa chỉ (có `code` và `state`) rồi dán vào Terminal. Dùng URL của chính lần chạy này, không dùng code/link của lần chạy trước.
4. Script kiểm tra state, đổi code và lưu vào `.secrets/tiktok-token.json`. Thư mục `.secrets/` được Git bỏ qua; file token chỉ chủ tài khoản hệ điều hành được đọc/ghi. Client secret không được lưu.

Gia hạn thủ công bằng refresh token đã lưu:

```bash
python3 scripts/get_tiktok_token.py --refresh
```

Script hỏi lại Client secret, lưu access/refresh token mới. Script không tự sửa `.env`, credential n8n hoặc đăng video.

Kiểm thử script bằng dữ liệu giả, không gọi TikTok:

```bash
python3 -m unittest discover -s tests -p 'test_tiktok_oauth.py'
```

## 1. Cập nhật database và ứng dụng

Repo dùng `prisma db push` để đồng bộ schema:

```bash
npm run db:generate
npm run db:push
npm run build
```

Với database hiện hữu cần bản vá SQL riêng, dùng `prisma/patches/add-tiktok.sql` thay cho bước `db:push`. Bản vá thêm enum `tiktok`, `tiktok_video` và các cột TikTok, bao gồm `tiktok_channel`. Docker production đã có bước `db push` trong entrypoint.

Không cần đặt `TIKTOK_ACCESS_TOKEN` khi dùng workflow Buffer.

## 2. Cấu hình Buffer và n8n

Kết nối tài khoản TikTok muốn đăng trong Buffer. Đặt tài khoản TikTok ở chế độ công khai. Trong Buffer, mở cài đặt kênh TikTok và tắt **Enable Notifications by default** để bài đăng tự chạy thay vì yêu cầu bấm xác nhận trên điện thoại.

Import/cập nhật ba workflow:

- `workflow-receive-google-sheet.json`
- `workflow-publish-trigger.json`
- `workflow-webhook-receiver.json`

Chọn lại credentials và URL theo môi trường triển khai, sau đó activate workflow. Không kích hoạt thêm bản sao có cùng webhook path. Giữ các credential Facebook, LinkedIn, YouTube đang dùng.

Trong chi tiết bài TikTok trên website, chọn **EPCB IoT Lab** hoặc **EPCB IoT Sensor**. Webhook gửi giá trị `tiktokChannel` lần lượt là `epcb_iot_lab` hoặc `epcb_iot_sensor`; workflow chuẩn hóa và giữ nguyên giá trị này để bạn dùng làm điều kiện ở switch n8n. Trường `channelId` trong node **Buffer Publish TikTok Video** được để trống để bạn nối nhánh switch tới kênh tương ứng. Không cần cấu hình Buffer ID trong website. Node dùng `Share Now`, `Automatic` và `Video`; do đó khi webhook đến giờ lịch, Buffer sẽ bắt đầu đăng ngay. Buffer mặc định đăng video TikTok công khai. Node cần URL video có thể truy cập công khai.

Nhánh callback cần credential loại **Header Auth**:

| Tên credential | Header | Giá trị |
| --- | --- | --- |
| `Content Manager Publish Callback` | `x-publish-key` | Cùng giá trị `N8N_PUBLISH_CALLBACK_KEY` của app |

Gán credential callback cho hai node `Callback Backend … TikTok`. Không cần credential TikTok Direct Post trong nhánh Buffer.

Đặt biến môi trường **n8n** `CONTENT_MANAGER_URL`, ví dụ `https://content.example.com`, không có dấu `/` cuối. Nếu instance chặn `$env`, thay URL ở hai node callback bằng URL ứng dụng cụ thể. App tiếp tục dùng `N8N_PUBLISH_WEBHOOK_URL` trỏ tới `/webhook/content-manager/publish-scheduled`; node cuối workflow trigger trỏ tới `/webhook/content-manager/publish-event` của cùng instance. Kiểm tra Header Auth webhook khớp `N8N_PUBLISH_WEBHOOK_KEY`.

Workflow SQL cũ `workflow-publish-scheduler.json` bỏ qua TikTok để không chiếm bài rồi bỏ sót nhánh video. TikTok chạy qua webhook trigger ở trên.

## 3. Thêm trường Google Form/Sheet

Thêm lựa chọn **TikTok Video** vào `Loại nội dung`, và các cột:

| Cột | Giá trị |
| --- | --- |
| `Nền tảng` | `TikTok` |
| `Video TikTok` | Link **một file** Google Drive |
| `Caption TikTok` hoặc `Mô tả TikTok` | Caption gợi ý, không bắt buộc nếu có ghi chú |
| `Ghi chú công việc` | Dữ liệu để AI viết caption |
| `Status` | `pending`, theo filter hiện tại |

Workflow nhận cả tên `TikTok`, `TikTok Video`, `Video TikTok`, `tiktok_video`. Nếu chỉ chọn nền tảng TikTok mà chưa chọn loại, workflow tự dùng `tiktok_video`. File Drive cần cho phép n8n tải; bước cấp quyền public media hiện có tiếp tục áp dụng.

API import cũng hỗ trợ gửi trực tiếp:

```json
{
  "sourceRowId": "tiktok-demo-001",
  "employeeName": "Nhân viên EPCB",
  "originalNote": "Giới thiệu sản phẩm trong video",
  "postType": "tiktok_video",
  "videoFileId": "GOOGLE_DRIVE_FILE_ID",
  "tiktokContent": "Khám phá sản phẩm cùng EPCB #EPCB"
}
```

Gửi tới `POST /api/contents/import`, header `x-n8n-key` theo `N8N_IMPORT_API_KEY`. Có thể dùng `videoUrl` thay `videoFileId` khi gọi API trực tiếp. TikTok-only không tạo bài Facebook/LinkedIn/YouTube ngoài ý muốn.

## 4. Duyệt và lên lịch

Mở bài → tab **TikTok** → chọn kênh đăng → kiểm tra video và caption → **Duyệt bài** → **Lên lịch đăng**. Website gửi account key trong webhook; không cần thêm hoặc sửa cột trong Google Form/Sheet.

Content Manager không hỏi các quyền riêng tư hay tương tác vì node Buffer không nhận các trường đó. Caption tối đa 2.200 ký tự. Chỉ nhận một video/bài.

Bài TikTok đã lên lịch không sửa/gửi lịch lại từ UI để tránh phát sinh nhiều lượt đăng. Import lại dữ liệu đã duyệt/lên lịch/đăng bị chặn để giữ đúng video đã duyệt. Với bài lỗi, mở **Xem và duyệt lại**, kiểm tra lỗi và duyệt lại trước khi chọn lịch mới.

## 5. Cách upload và theo dõi

Buffer nhận video bằng URL và chịu trách nhiệm gửi bài lên kênh TikTok. Nếu Buffer yêu cầu xác nhận thay vì tự đăng, kiểm tra kênh đang bật **Automatic** và đã tắt đăng dạng thông báo mặc định. Nếu callback lỗi, chạy lại riêng node callback; không chạy lại node Buffer để tránh đăng trùng.

## 6. Kiểm thử

```bash
npm run test:tiktok
npm run typecheck
npm run build
```

Các test mô phỏng API/Prisma và chạy code của workflow với dữ liệu mẫu: import TikTok, xác thực, duyệt/lên lịch, callback, lỗi HTTP 200 từ TikTok, HTML giả video, chia phần upload, chờ xử lý, timeout và regression Facebook/YouTube. Chúng không gửi bài thật hoặc ghi database thật.

Sau khi cấu hình môi trường, thử một video ngắn với quyền **Chỉ mình tôi**, kiểm tra execution n8n, trạng thái trong Content Manager và video trên tài khoản TikTok. Chưa có kiểm thử đăng thật nếu chưa cấp token/credentials và triển khai workflow lên n8n.
