# Luồng đăng video TikTok

Google Form/Sheet → AI tạo caption → Content Manager duyệt và chọn quyền riêng tư → lên lịch → n8n tải video Drive → TikTok Direct Post → kiểm tra kết quả → callback.

## Lấy token bằng file Python

Có sẵn script `scripts/get_tiktok_token.py`, chỉ cần Python 3, không cài thư viện ngoài. Script thực hiện bước tạo link cấp quyền và đổi code thành token theo [OAuth TikTok](https://developers.tiktok.com/docs/en/oauth-user-access-token-management).

Trước khi chạy, chuẩn bị Client key, Client secret, quyền `video.publish` và Redirect URI HTTPS đã đăng ký trong Login Kit. Nếu dùng callback n8n: tạo workflow Webhook GET, path `tiktok-oauth-callback`, Authentication None, Respond Immediately; Publish/Activate workflow và đăng ký **Production URL** đó với TikTok.

Từ thư mục dự án, chạy:

```bash
python3 scripts/get_tiktok_token.py
```

1. Nhập Client key, Client secret và Redirect URI khi script hỏi. Client secret nhập ẩn: dán rồi Enter, Terminal không hiển thị ký tự.
2. Trình duyệt mở link cấp quyền; đăng nhập đúng tài khoản TikTok và đồng ý. Nếu không tự mở, copy link được in trong Terminal.
3. Khi TikTok chuyển về callback n8n, copy toàn bộ URL trên thanh địa chỉ (có `code` và `state`) rồi dán vào Terminal. Dùng URL của chính lần chạy này, không dùng code/link của lần chạy trước.
4. Script kiểm tra state, đổi code và lưu vào `.secrets/tiktok-token.json`. Mở file, copy giá trị `access_token` vào credential n8n và `TIKTOK_ACCESS_TOKEN` trong `.env` như hướng dẫn bên dưới. Thư mục `.secrets/` được Git bỏ qua; file token chỉ chủ tài khoản hệ điều hành được đọc/ghi. Client secret không được lưu.

Gia hạn thủ công bằng refresh token đã lưu:

```bash
python3 scripts/get_tiktok_token.py --refresh
```

Script hỏi lại Client secret, lưu access/refresh token mới. Sau đó cập nhật token trong n8n và app. Script không tự sửa `.env`, credential n8n hoặc đăng video.

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

Với database hiện hữu cần bản vá SQL riêng, dùng `prisma/patches/add-tiktok.sql` thay cho bước `db:push`. Bản vá chỉ thêm enum `tiktok`, `tiktok_video` và cột JSON `tiktok_options`. Docker production đã có bước `db push` trong entrypoint.

Đặt `TIKTOK_ACCESS_TOKEN` trong môi trường của **app**, là user access token có scope `video.publish`. App dùng token phía server để lấy tài khoản và quyền riêng tư hiện có; token không được gửi về trình duyệt. Khởi động lại app sau khi đổi token.

## 2. Cấu hình TikTok và n8n

Bật Content Posting API / Direct Post cho app TikTok và cấp quyền từ tài khoản sẽ đăng. App chưa qua audit chỉ đăng ở chế độ riêng tư; thử với **Chỉ mình tôi**. Xem [hướng dẫn Direct Post của TikTok](https://developers.tiktok.com/docs/en/content-posting-api-get-started) và [tham chiếu API](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post).

Import/cập nhật ba workflow:

- `workflow-receive-google-sheet.json`
- `workflow-publish-trigger.json`
- `workflow-webhook-receiver.json`

Chọn lại credentials và URL theo môi trường triển khai, sau đó activate workflow. Không kích hoạt thêm bản sao có cùng webhook path. Giữ các credential Facebook, LinkedIn, YouTube đang dùng.

Nhánh TikTok mới cần hai credential loại **Header Auth**:

| Tên credential | Header | Giá trị |
| --- | --- | --- |
| `TikTok Content Posting Bearer` | `Authorization` | `Bearer <user access token>` |
| `Content Manager Publish Callback` | `x-publish-key` | Cùng giá trị `N8N_PUBLISH_CALLBACK_KEY` của app |

Gán credential TikTok cho `Query TikTok Creator`, `Initialize TikTok Publish`, `Fetch TikTok Publish Status`. Gán credential callback cho hai node `Callback Backend … TikTok`. **Token ở n8n phải thuộc cùng tài khoản với token ở app.** Khi token hết hạn, làm mới/cập nhật cả hai nơi; luồng này chưa tự thực hiện OAuth hoặc refresh token.

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

Mở bài → tab **TikTok** → kiểm tra video và caption → chọn quyền riêng tư → chọn các quyền tương tác và khai báo thương mại/AI nếu áp dụng → **Duyệt bài** → **Lên lịch đăng**.

Quyền riêng tư không được chọn mặc định. App hiển thị tài khoản và thời lượng tối đa từ TikTok; n8n kiểm tra lại quyền riêng tư lúc thực sự đăng. Caption tối đa 2.200 ký tự. Chỉ nhận một video/bài; bản xem trước dùng khung dọc. TikTok kiểm tra codec, thời lượng và kích thước hình khi xử lý file, lỗi trả về được lưu vào bài.

Bài TikTok đã lên lịch không sửa/gửi lịch lại từ UI để tránh phát sinh nhiều lượt đăng. Import lại dữ liệu đã duyệt/lên lịch/đăng bị chặn để giữ đúng video đã duyệt. Với bài lỗi, mở **Xem và duyệt lại**, kiểm tra lỗi và duyệt lại trước khi chọn lịch mới.

## 5. Cách upload và theo dõi

n8n dùng `FILE_UPLOAD`, hỗ trợ MP4/MOV/WebM, chia file thành phần 32 MiB và gửi tuần tự; phần dư gộp vào phần cuối. Không gửi link Drive trực tiếp cho TikTok nên không cần xác minh quyền sở hữu domain Drive. Video được đọc thành buffer khi chia phần; cần đủ RAM/binary storage trên n8n cho dung lượng file thực tế. Xem [Media Transfer Guide](https://developers.tiktok.com/docs/en/content-posting-api-media-transfer-guide).

Sau upload, workflow hỏi trạng thái mỗi 30 giây, tối đa 120 lần. Chỉ `PUBLISH_COMPLETE` mới callback `published`. Lỗi API, lỗi tải/upload và trạng thái `FAILED` gửi callback lỗi. Với video riêng tư, `externalPostId` lưu `publish_id` nếu TikTok không trả public post ID. Xem [Get Post Status](https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status).

Nếu hết 60 phút hoặc lỗi truy vấn sau upload, thông báo lỗi yêu cầu kiểm tra `publish_id` trước khi đăng lại: TikTok vẫn có thể đang xử lý. Không tự khởi tạo lại phiên upload. Nếu webhook lên lịch bị timeout, kiểm tra execution n8n trước khi xử lý thủ công vì n8n có thể đã nhận lịch. Nếu callback lỗi, chạy lại riêng node callback; không chạy lại toàn bộ nhánh publish. Callback có ba lần thử khi lỗi kết nối.

## 6. Kiểm thử

```bash
npm run test:tiktok
npm run typecheck
npm run build
```

Các test mô phỏng API/Prisma và chạy code của workflow với dữ liệu mẫu: import TikTok, xác thực, duyệt/lên lịch, callback, lỗi HTTP 200 từ TikTok, HTML giả video, chia phần upload, chờ xử lý, timeout và regression Facebook/YouTube. Chúng không gửi bài thật hoặc ghi database thật.

Sau khi cấu hình môi trường, thử một video ngắn với quyền **Chỉ mình tôi**, kiểm tra execution n8n, trạng thái trong Content Manager và video trên tài khoản TikTok. Chưa có kiểm thử đăng thật nếu chưa cấp token/credentials và triển khai workflow lên n8n.
