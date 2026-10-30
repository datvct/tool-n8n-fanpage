"use client";

import { Search } from "lucide-react";
import DeleteContentButton from "@/app/content/DeleteContentButton";
import type { ContentItem, ContentStatus, Platform } from "@/lib/content-types";
import { getContentTitle, getOverallStatus, getPostChannelLabel, statusLabels, truncateText } from "@/app/content/ui/content-presentation";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";
import { StatusBadge } from "@/app/content/components/StatusBadge";
import { ContentThumbnail } from "@/app/content/components/ContentThumbnail";

export function ContentListView({
  contents,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  retryPost,
  retryingPostId,
  onDeleted,
  onOpen,
}: {
  contents: ContentItem[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: ContentStatus | "all";
  setStatusFilter: (value: ContentStatus | "all") => void;
  retryPost: (contentId: string, postId: string) => void;
  retryingPostId: string | null;
  onDeleted: (id: string) => void;
  onOpen: (contentId: string, platform?: Platform) => void;
}) {
  const visibleContents = contents.filter((item) => statusFilter === "all" || item.posts.some((post) => post.status === statusFilter));

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Tất cả nội dung</h2>
          <p className="subtle">{visibleContents.length} nội dung</p>
        </div>
      </div>
      <div className="filters">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tiêu đề, người gửi hoặc nội dung..."
            aria-label="Tìm trong thư viện nội dung"
          />
        </label>
        <label className="filter-select-label">
          <span className="sr-only">Lọc theo trạng thái</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContentStatus | "all")}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ghi chú công việc</th>
              <th>Người gửi</th>
              <th>Nền tảng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {visibleContents.map((item) => {
              const overallStatus = getOverallStatus(item);
              return (
                <tr
                  key={item.id}
                  className="clickable"
                  tabIndex={0}
                  onClick={() => onOpen(item.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpen(item.id);
                    }
                  }}
                >
                  <td>
                    <button
                      className="content-link"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item.id);
                      }}
                    >
                      <span className="library-content-cell">
                        <ContentThumbnail content={item} />
                        <strong>{truncateText(getContentTitle(item), 48)}</strong>
                      </span>
                    </button>
                  </td>
                  <td>{item.employee}</td>
                  <td>
                    <div className="platform-statuses">
                      {item.posts.length ? (
                        item.posts.map((post) => (
                          <span className="platform-status" key={post.id}>
                            <span className="platform-status-label">
                              <PlatformIcon platform={post.platform} size={14} />
                              {getPostChannelLabel(post)}
                            </span>
                            <StatusBadge status={post.status} />
                          </span>
                        ))
                      ) : (
                        <span className="subtle">Chưa có nền tảng</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <StatusBadge
                      status={overallStatus}
                      label={item.posts.length ? undefined : "Chưa có nội dung"}
                    />
                  </td>
                  <td>
                    <div className="content-row-actions">
                      {item.posts.find((post) => post.status === "failed") ? (
                        item.posts.find((post) => post.status === "failed")?.platform === "tiktok" ? (
                          <button
                            className="secondary"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpen(item.id, "tiktok");
                            }}
                          >
                            Xem và duyệt lại
                          </button>
                        ) : (
                          <button
                            className="secondary"
                            disabled={Boolean(retryingPostId)}
                            onClick={(event) => {
                              event.stopPropagation();
                              const failedPost = item.posts.find((post) => post.status === "failed");
                              if (failedPost) retryPost(item.id, failedPost.id);
                            }}
                          >
                            {retryingPostId === item.posts.find((post) => post.status === "failed")?.id ? "Đang xử lý..." : "Thử lại"}
                          </button>
                        )
                      ) : (
                        <button
                          className="secondary"
                          onClick={(event) => { event.stopPropagation(); onOpen(item.id); }}
                        >
                          Mở bài
                        </button>
                      )}
                      <DeleteContentButton content={item} title={getContentTitle(item)} onDeleted={onDeleted} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {!contents.length && (
              <tr>
                <td colSpan={5} className="subtle">
                  {query || statusFilter !== "all"
                    ? "Không tìm thấy nội dung phù hợp. Thử đổi từ khóa hoặc trạng thái lọc."
                    : "Chưa có nội dung nào. Bấm “Nội dung mới” để thêm nội dung đầu tiên."}
                </td>
              </tr>
            )}
            {contents.length > 0 && !visibleContents.length && (
              <tr><td colSpan={5}><div className="empty-state"><strong>Không tìm thấy nội dung phù hợp</strong><span>Thử đổi từ khóa hoặc trạng thái lọc.</span></div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
