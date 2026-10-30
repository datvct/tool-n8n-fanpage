"use client";

import {
  ArrowRight,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  FileCheck2,
  FileText,
  Layers3,
} from "lucide-react";
import type { ContentItem, ContentStatus } from "@/lib/content-types";
import {
  formatVietnamDateTime,
  getContentPlatforms,
  getOverallStatus,
  getPostDisplayTitle,
  platformLabels,
  postTypeLabels,
  truncateText,
  type View,
} from "@/app/content/ui/content-presentation";
import { StatusBadge } from "@/app/content/components/StatusBadge";
import { PlatformIcon } from "@/app/content/components/PlatformIcon";

export function DashboardView({
  counts,
  contents,
  setView,
  setStatusFilter,
  setQuery,
  onOpen,
}: {
  counts: Record<string, number>;
  contents: ContentItem[];
  setView: (view: View) => void;
  setStatusFilter: (value: ContentStatus | "all") => void;
  setQuery: (value: string) => void;
  onOpen: (contentId: string) => void;
}) {
  return (
    <>
      <section className="stats" aria-label="Tình hình nội dung">
        {[
          { label: "Tổng nội dung", value: counts.total, icon: Layers3, tone: "total" },
          { label: "Chờ duyệt", value: counts.draft, icon: FileText, tone: "draft" },
          { label: "Đã duyệt", value: counts.approved, icon: FileCheck2, tone: "approved" },
          { label: "Đã lên lịch", value: counts.scheduled, icon: CalendarClock, tone: "scheduled" },
          { label: "Đã đăng", value: counts.published, icon: CircleCheck, tone: "published" },
          { label: "Bài lỗi", value: counts.failed, icon: CircleAlert, tone: "failed" },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div className={`stat ${tone}`} key={label}>
            <div className="stat-heading">
              <span className="stat-icon"><Icon size={16} /></span>
              <span className="stat-label">{label}</span>
            </div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </section>
      <section className="quick-work" aria-labelledby="quick-work-title">
        <div className="quick-work-heading">
          <div>
            <h2 id="quick-work-title">Công việc tiếp theo</h2>
            <p>Chọn nhóm bài cần xử lý</p>
          </div>
          <span className="quick-work-hint">Lối tắt</span>
        </div>
        <div className="quick-work-grid">
          <button className="quick-work-item draft" onClick={() => { setStatusFilter("draft"); setQuery(""); setView("contents"); }}>
            <span className="quick-work-icon"><FileText size={17} /></span>
            <span className="quick-work-copy"><strong>Chờ duyệt</strong><small>Bài cần rà soát</small></span>
            <span className="quick-work-count">{counts.draft}</span><ArrowRight size={15} className="quick-work-arrow" />
          </button>
          <button className="quick-work-item approved" onClick={() => { setStatusFilter("approved"); setQuery(""); setView("contents"); }}>
            <span className="quick-work-icon"><FileCheck2 size={17} /></span>
            <span className="quick-work-copy"><strong>Chờ lên lịch</strong><small>Bài đã được duyệt</small></span>
            <span className="quick-work-count">{counts.approved}</span><ArrowRight size={15} className="quick-work-arrow" />
          </button>
          <button className="quick-work-item scheduled" onClick={() => setView("calendar")}>
            <span className="quick-work-icon"><CalendarClock size={17} /></span>
            <span className="quick-work-copy"><strong>Lịch đăng</strong><small>Bài đã lên lịch</small></span>
            <span className="quick-work-count">{counts.scheduled}</span><ArrowRight size={15} className="quick-work-arrow" />
          </button>
          <button className="quick-work-item failed" onClick={() => setView("failed")}>
            <span className="quick-work-icon"><CircleAlert size={17} /></span>
            <span className="quick-work-copy"><strong>Cần xử lý lỗi</strong><small>Kiểm tra từng nền tảng</small></span>
            <span className="quick-work-count">{counts.failed}</span><ArrowRight size={15} className="quick-work-arrow" />
          </button>
        </div>
      </section>
      <div className="content-grid dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Nội dung gần đây</h2>
              <p className="subtle">Các form mới gửi về</p>
            </div>
            <button className="secondary" onClick={() => setView("contents")}>Mở thư viện</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>Người gửi</th>
                  <th>Nền tảng</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {contents.length ? (
                  contents.map((item) => (
                    <tr className="clickable" key={item.id}>
                      <td>
                        <button className="content-link" onClick={() => onOpen(item.id)}>
                          <span className="recent-title-list">
                            {item.posts.length ? (
                              item.posts.map((post) => (
                                <span
                                  className="recent-title-item"
                                  key={post.id}
                                >
                                  <small>
                                    <PlatformIcon platform={post.platform} size={12} />{" "}
                                    {postTypeLabels[post.postType] ||
                                      platformLabels[post.platform]}
                                  </small>
                                  <strong>
                                    {truncateText(
                                      getPostDisplayTitle(
                                        post,
                                        item.note || "Chưa có tiêu đề",
                                      ),
                                      48,
                                    )}
                                  </strong>
                                </span>
                              ))
                            ) : (
                              <strong>
                                {truncateText(
                                  item.note || "Chưa có tiêu đề",
                                  58,
                                )}
                              </strong>
                            )}
                          </span>
                        </button>
                        <br />
                        <span className="subtle">
                          {formatVietnamDateTime(item.createdAt)}
                        </span>
                      </td>
                      <td>{item.employee}</td>
                      <td className="subtle">{getContentPlatforms(item)}</td>
                      <td>
                        <StatusBadge
                          status={getOverallStatus(item)}
                          label={item.posts.length ? undefined : "Chưa có nội dung"}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="subtle">
                      Chưa có dữ liệu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
