"use client";

import type { SocialPost } from "@/lib/content-types";
import { formatVietnamDateTime, getPostDisplayTitle, platformLabels, postTypeLabels, truncateText } from "@/app/content/ui/content-presentation";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";
import { StatusBadge } from "@/app/content/components/StatusBadge";

export function PostListView({
  title,
  posts,
  retryPost,
  retryingPostId,
  onOpen,
}: {
  title: string;
  posts: (SocialPost & { employee: string; contentId: string })[];
  retryPost?: (contentId: string, postId: string) => void;
  retryingPostId?: string | null;
  onOpen: (contentId: string, platform?: SocialPost["platform"]) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{title}</h2>
          <p className="subtle">
            Trạng thái và lịch sử đăng theo từng nền tảng
          </p>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nền tảng</th>
              <th>Nội dung</th>
              <th>Người gửi</th>
              <th>Trạng thái</th>
              <th>Lỗi / thời gian</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td><span className="table-platform"><PlatformIcon platform={post.platform} />{platformLabels[post.platform]}</span></td>
                <td><button className="content-link" onClick={() => onOpen(post.contentId, post.platform)}>{truncateText(getPostDisplayTitle(post), 55)}</button></td>
                <td>{post.employee}</td>
                <td>
                  <StatusBadge status={post.status} />
                </td>
                <td className="subtle">
                  {post.error ? <details className="error-detail"><summary>Có lỗi · xem chi tiết</summary><p>{post.error}</p></details> : post.status === "published" ?
                    (post.publishedAt
                      ? formatVietnamDateTime(post.publishedAt)
                      : post.scheduledAt
                        ? formatVietnamDateTime(post.scheduledAt)
                        : "Đăng thành công") :
                    (post.scheduledAt ? formatVietnamDateTime(post.scheduledAt) : "—")}
                </td>
                <td>
                  {retryPost && post.platform === "tiktok" && (
                    <button className="secondary" onClick={() => onOpen(post.contentId, post.platform)}>Xem và duyệt lại</button>
                  )}
                  {retryPost && post.platform !== "tiktok" && (
                    <button
                      className="secondary"
                      disabled={Boolean(retryingPostId)}
                      onClick={() => retryPost(post.contentId, post.id)}
                    >
                      {retryingPostId === post.id ? "Đang xử lý..." : "Thử lại"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!posts.length && <tr><td colSpan={6}><div className="empty-state"><strong>{retryPost ? "Không có bài đăng lỗi" : "Chưa có bài nào được đăng"}</strong><span>Dữ liệu sẽ hiển thị tại đây khi có bài viết.</span></div></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
