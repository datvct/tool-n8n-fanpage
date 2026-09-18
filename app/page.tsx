"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as AntImage } from "antd";
import Link from "next/link";
import {
  ContentItem,
  Platform,
  PostType,
  SocialPost,
  ContentStatus,
} from "@/lib/content-types";
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Library,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
} from "lucide-react";

const statusLabels: Record<ContentStatus, string> = {
  draft: "Bản nháp",
  approved: "Đã duyệt",
  scheduled: "Đã lên lịch",
  published: "Đã đăng",
  failed: "Thất bại",
};
const platformLabels: Record<Platform, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
};
const postTypeLabels: Record<PostType, string> = {
  post: "Bài viết thường",
  facebook_reel: "Facebook Reel",
  youtube_short: "YouTube Short",
  youtube_video: "YouTube video thường",
};

function isImageSource(value: string) {
  return value.startsWith("http") || value.startsWith("/api/media");
}

function isVideoSource(value: string) {
  return value.startsWith("http") || value.startsWith("/api/media");
}

function truncateText(value: string, maxLength: number) {
  const text = value.trim();
  return text.length > maxLength
    ? `${text.slice(0, maxLength).trimEnd()}...`
    : text;
}

function getPostDisplayTitle(post: SocialPost, fallback = "Chưa có tiêu đề") {
  const title = post.platform === "youtube" ? post.title?.trim() : "";
  return title || post.content.trim() || fallback;
}

function getContentPlatforms(item: ContentItem) {
  return [...new Set(
    item.posts.map(
      (post) => postTypeLabels[post.postType] || platformLabels[post.platform],
    ),
  )].join(" · ") || "Chưa chọn nền tảng";
}

type View = "dashboard" | "contents" | "calendar" | "published" | "failed";

export default function Home() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  async function loadContents() {
    try {
      setLoadError("");
      const response = await fetch("/api/contents", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setContents(result.data);
      setLastSyncedAt(new Date());
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Không thể tải dữ liệu từ database.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContents();
    const timer = window.setInterval(() => void loadContents(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function refreshContents() {
    setRefreshing(true);
    await loadContents();
    setRefreshing(false);
  }

  const selected = contents.find((item) => item.id === selectedId) ?? null;
  const allPosts = contents.flatMap((item) =>
    item.posts.map((post) => ({
      ...post,
      employee: item.employee,
      contentId: item.id,
    })),
  );
  const counts = {
    total: contents.length,
    draft: allPosts.filter((post) => post.status === "draft").length,
    scheduled: allPosts.filter((post) => post.status === "scheduled").length,
    published: allPosts.filter((post) => post.status === "published").length,
    failed: allPosts.filter((post) => post.status === "failed").length,
  };

  const filtered = useMemo(
    () =>
      contents.filter((item) =>
        `${item.employee} ${item.note} ${item.posts.map((post) => post.content).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [contents, query],
  );

  function updatePost(
    contentId: string,
    postId: string,
    update: Partial<SocialPost>,
  ) {
    setContents((current) =>
      current.map((item) =>
        item.id !== contentId
          ? item
          : {
              ...item,
              posts: item.posts.map((post) =>
                post.id === postId ? { ...post, ...update } : post,
              ),
            },
      ),
    );
    void fetch(`/api/social-posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).then(async (response) => {
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setLoadError(result?.error || "Không thể lưu thay đổi.");
        void loadContents();
      }
    });
  }

  function approvePost() {
    if (!selected) return;
    const post = selected.posts.find((item) => item.platform === platform);
    if (post && post.content.trim())
      updatePost(selected.id, post.id, {
        status: "approved",
        error: undefined,
      });
  }

  function schedulePost(scheduledAt: string) {
    if (!selected) return;
    const post = selected.posts.find((item) => item.platform === platform);
    if (!post || post.status !== "approved") return;
    updatePost(selected.id, post.id, {
      status: "scheduled",
      scheduledAt,
    });
  }

  function retryPost(contentId: string, postId: string) {
    updatePost(contentId, postId, {
      status: "scheduled",
      scheduledAt: "2026-09-10 09:30",
      error: undefined,
    });
  }

  if (selected)
    return (
      <DetailViewPro
        selected={selected}
        platform={platform}
        setPlatform={setPlatform}
        onBack={() => setSelectedId(null)}
        updatePost={updatePost}
        approvePost={approvePost}
        schedulePost={schedulePost}
        saved={saved}
        setSaved={setSaved}
      />
    );

  return (
    <div className="shell">
      <SidebarPro
        view={view}
        setView={setView}
        failedCount={counts.failed}
      />
      <main className="main">
        <header className="topbar">
          <div className="heading-block">
            <div className="eyebrow">
              Vận hành nội dung <span>/</span> Tháng 09, 2026
            </div>
            <h1>
              {view === "dashboard" ? "Xin chào, đội ngũ" : viewTitle(view)}
            </h1>
            <p className="subtle">
              Tạo, duyệt và lên lịch nội dung mạng xã hội trong một nơi.
            </p>
          </div>
          <div className="header-actions">
            <button
              className="secondary refresh-button"
              onClick={refreshContents}
              disabled={refreshing || loading}
              title="Tải lại dữ liệu từ database"
            >
              <RefreshCw size={15} className={refreshing ? "spin" : ""} />
              Làm mới
            </button>
            <div className="sync-pill">
              <span className="online-dot" /> n8n đang hoạt động
            </div>
            <a
              className="primary"
              href={
                process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
                "https://docs.google.com/forms/d/e/1FAIpQLSfyeRJtUGn6NheKkxV5prh6lu5iw937V-funOuSlUi5eXS9vQ/viewform"
              }
              target="_blank"
              rel="noreferrer"
            >
              <span className="button-icon">+</span> Nội dung mới
            </a>
          </div>
        </header>
        {lastSyncedAt && !loading && (
          <div className="sync-meta">
            Cập nhật lúc {lastSyncedAt.toLocaleTimeString("vi-VN")}
          </div>
        )}
        {loading && <p className="subtle">Đang tải dữ liệu từ database...</p>}
        {!loading && loadError && (
          <p className="subtle" style={{ color: "var(--red-ink)" }}>
            {loadError}
          </p>
        )}
        {!loading && !loadError && view === "dashboard" && (
          <Dashboard counts={counts} contents={contents} />
        )}
        {!loading && !loadError && view === "contents" && (
          <ContentList
            contents={filtered}
            query={query}
            setQuery={setQuery}
            retryPost={retryPost}
          />
        )}
        {!loading && !loadError && view === "calendar" && (
          <Calendar
            posts={allPosts.filter((post) => post.status === "scheduled")}
          />
        )}
        {!loading && !loadError && view === "published" && (
          <PostList
            title="Bài đã đăng"
            posts={allPosts.filter((post) => post.status === "published")}
          />
        )}
        {!loading && !loadError && view === "failed" && (
          <PostList
            title="Bài đăng lỗi"
            posts={allPosts.filter((post) => post.status === "failed")}
            retryPost={retryPost}
          />
        )}
      </main>
    </div>
  );
}

function viewTitle(view: View) {
  return {
    dashboard: "Tổng quan",
    contents: "Thư viện nội dung",
    calendar: "Lịch đăng bài",
    published: "Bài đã đăng",
    failed: "Bài đăng lỗi",
  }[view];
}

function Sidebar({
  view,
  setView,
}: {
  view: View;
  setView: (view: View) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <img src="/images/logo.png" alt="Content Flow" />
        </div>
        <div>
          <strong>EPCB</strong>
          <span>Social workspace</span>
        </div>
      </div>
      <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="nav">
        {(
          ["dashboard", "contents", "calendar", "published", "failed"] as View[]
        ).map((item) => (
          <button
            className={view === item ? "active" : ""}
            key={item}
            onClick={() => setView(item)}
          >
            <span className={`nav-icon nav-${item}`} />
            {
              {
                dashboard: "Tổng quan",
                contents: "Thư viện nội dung",
                calendar: "Lịch đăng bài",
                published: "Bài đã đăng",
                failed: "Bài đăng lỗi",
              }[item]
            }
            {item === "failed" && <span className="nav-count">1</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="automation-card">
          <div className="automation-title">
            <span className="online-dot" /> Tự động hóa
          </div>
          <p>n8n đang kiểm tra lịch đăng mỗi phút.</p>
          <span className="automation-link">
            Đã kết nối tốt <b>→</b>
          </span>
        </div>
        <div className="user-chip">
          <div className="avatar">AD</div>
          <div>
            <strong>Admin</strong>
            <span>Quản trị viên</span>
          </div>
          <span className="dots">•••</span>
        </div>
      </div>
    </aside>
  );
}

function SidebarPro({
  view,
  setView,
  failedCount,
}: {
  view: View;
  setView: (view: View) => void;
  failedCount: number;
}) {
  const items: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { id: "contents", label: "Thư viện nội dung", icon: Library },
    { id: "calendar", label: "Lịch đăng bài", icon: CalendarDays },
    { id: "published", label: "Bài đã đăng", icon: CircleCheck },
    { id: "failed", label: "Bài đăng lỗi", icon: CircleAlert },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo">
          <img src="/images/logo.png" alt="Content Flow" />
        </div>
        <div>
          <strong>Content flow</strong>
          <span>Social workspace</span>
        </div>
      </div>
      <div className="workspace-label">KHÔNG GIAN LÀM VIỆC</div>
      <nav className="nav">
        {items.map(({ id, label, icon: Icon }) => (
          <button
            className={view === id ? "active" : ""}
            key={id}
            onClick={() => setView(id)}
          >
            <Icon size={17} strokeWidth={1.8} />
            {label}
            {id === "failed" && failedCount > 0 && (
              <span className="nav-count">{failedCount}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="automation-card">
          <div className="automation-title">
            <span className="online-dot" /> Tự động hóa
          </div>
          <p>n8n đang kiểm tra lịch đăng mỗi phút.</p>
          <span className="automation-link">
            Đã kết nối tốt <b>→</b>
          </span>
        </div>
        <div className="user-chip">
          <div className="avatar">AD</div>
          <div>
            <strong>Admin</strong>
            <span>Quản trị viên</span>
          </div>
          <MoreHorizontal className="dots" size={17} />
        </div>
      </div>
    </aside>
  );
}

function Dashboard({
  counts,
  contents,
}: {
  counts: Record<string, number>;
  contents: ContentItem[];
}) {
  const upcoming = contents.flatMap((item) =>
    item.posts
      .filter((post) => post.status === "scheduled")
      .map((post) => ({ ...post, employee: item.employee, id: item.id })),
  );
  return (
    <>
      <section className="stats">
        {[
          ["Tổng nội dung", counts.total],
          ["Bài nháp", counts.draft],
          ["Đã lên lịch", counts.scheduled],
          ["Đã đăng", counts.published],
          ["Thất bại", counts.failed],
        ].map(([label, value], index) => (
          <div className="stat" key={String(label)}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${index === 3 ? "stat-accent" : ""}`}>
              {value}
            </div>
          </div>
        ))}
      </section>
      <div className="content-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Nội dung gần đây</h2>
              <p className="subtle">Các form mới gửi về</p>
            </div>
            {contents[0] ? (
              <Link className="secondary" href={`/content/${contents[0].id}`}>
                Xem tất cả
              </Link>
            ) : (
              <button className="secondary" disabled>
                Xem tất cả
              </button>
            )}
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
                        <Link
                          className="content-link"
                          href={`/content/${item.id}`}
                        >
                          <span className="recent-title-list">
                            {item.posts.length ? (
                              item.posts.map((post) => (
                                <span className="recent-title-item" key={post.id}>
                                  <small>
                                    {postTypeLabels[post.postType] || platformLabels[post.platform]}
                                  </small>
                                  <strong>
                                    {truncateText(
                                      getPostDisplayTitle(post, item.note || "Chưa có tiêu đề"),
                                      48,
                                    )}
                                  </strong>
                                </span>
                              ))
                            ) : (
                              <strong>{truncateText(item.note || "Chưa có tiêu đề", 58)}</strong>
                            )}
                          </span>
                        </Link>
                        <br />
                        <span className="subtle">{item.createdAt}</span>
                      </td>
                      <td>{item.employee}</td>
                      <td className="subtle">{getContentPlatforms(item)}</td>
                      <td>
                        <span
                          className={`badge ${item.posts.some((post) => post.status === "failed") ? "failed" : item.posts[0].status}`}
                        >
                          {statusLabels[item.posts[0].status]}
                        </span>
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
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Sắp đăng</h2>
              <p className="subtle">Các bài đã được lên lịch</p>
            </div>
          </div>
          <div className="side-list">
            {upcoming.length ? (
              upcoming.map((post) => (
                <div className="upcoming" key={post.id}>
                  <div className="date-box">
                    <small>THÁNG 9</small>10
                  </div>
                  <div>
                    <h3>
                      {postTypeLabels[post.postType] || platformLabels[post.platform]}{" "}
                      <span className="subtle">· 09:30</span>
                    </h3>
                    <p className="subtle">{post.employee}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="subtle" style={{ padding: "20px 0" }}>
                Chưa có bài sắp đăng.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function ContentList({
  contents,
  query,
  setQuery,
  retryPost,
}: {
  contents: ContentItem[];
  query: string;
  setQuery: (value: string) => void;
  retryPost: (contentId: string, postId: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>Tất cả nội dung</h2>
          <p className="subtle">{contents.length} nội dung</p>
        </div>
      </div>
      <div className="filters">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Tìm người gửi, ghi chú hoặc nội dung..."
        />
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
            {contents.map((item) =>
              item.posts.map((post) => (
                <tr key={post.id}>
                  <td>
                    <strong>{truncateText(getPostDisplayTitle(post), 48)}</strong>
                  </td>
                  <td>{item.employee}</td>
              <td>
                {postTypeLabels[post.postType] || platformLabels[post.platform]}
              </td>
                  <td>
                    <span className={`badge ${post.status}`}>
                      {statusLabels[post.status]}
                    </span>
                  </td>
                  <td>
                    {post.status === "failed" ? (
                      <button
                        className="secondary"
                        onClick={() => retryPost(item.id, post.id)}
                      >
                        Thử lại
                      </button>
                    ) : (
                      <Link className="secondary" href={`/content/${item.id}`}>
                        Mở bài
                      </Link>
                    )}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailView({
  selected,
  platform,
  setPlatform,
  onBack,
  updatePost,
  approvePost,
  schedulePost,
  saved,
  setSaved,
}: {
  selected: ContentItem;
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  onBack: () => void;
  updatePost: (
    contentId: string,
    postId: string,
    update: Partial<SocialPost>,
  ) => void;
  approvePost: () => void;
  schedulePost: (scheduledAt: string) => void;
  saved: boolean;
  setSaved: (value: boolean) => void;
}) {
  const post = selected.posts.find((item) => item.platform === platform) ?? {
    id: "",
    platform,
    postType: "post" as const,
    content: "",
    status: "draft" as const,
  };
  const hasPost = Boolean(post.id);
  return (
    <div className="detail">
      <div className="detail-top">
        <div>
          <button className="back" onClick={onBack}>
            ← Quay lại thư viện
          </button>
          <h1 style={{ marginTop: 16 }}>Chi tiết nội dung</h1>
          <p className="subtle">
            {selected.employee} · Tạo ngày {selected.createdAt}
          </p>
        </div>
        <span className={`badge ${hasPost ? post.status : "draft"}`}>
          {hasPost ? statusLabels[post.status] : "Chưa có nội dung"}
        </span>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Hình ảnh</h2>
            <p className="subtle">
              {selected.images.length} ảnh từ Google Drive
            </p>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div className="image-row">
            <AntImage.PreviewGroup>
              {selected.images.map((image) => (
                <div className="image" key={image}>
                  {isImageSource(image) ? (
                    <AntImage
                      src={image}
                      alt="Ảnh công việc"
                      preview={{ mask: "Xem ảnh lớn" }}
                      width="100%"
                      height="100%"
                    />
                  ) : (
                    image
                  )}
                </div>
              ))}
            </AntImage.PreviewGroup>
          </div>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Ghi chú công việc</h2>
            <p className="subtle">Dữ liệu từ Google Form</p>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div className="note">{selected.note}</div>
        </div>
      </section>
      <section className="panel">
        <div className="tabs">
          {(["facebook", "linkedin", "youtube"] as Platform[]).map((item) => (
            <button
              className={platform === item ? "active" : ""}
              key={item}
              disabled={!selected.posts.some((post) => post.platform === item)}
              onClick={() => setPlatform(item)}
            >
              {platformLabels[item]}
            </button>
          ))}
        </div>
        <div className="editor-grid">
          <div>
            <h3 style={{ marginBottom: 10 }}>Chỉnh sửa nội dung</h3>
            <textarea
              value={post.content}
              disabled={!hasPost || post.status === "published"}
              onChange={(event) =>
                updatePost(selected.id, post.id, {
                  content: event.target.value,
                  status: post.status === "approved" ? "draft" : post.status,
                })
              }
            />
          </div>
          <div>
            <h3 style={{ marginBottom: 10 }}>
              Xem trước {platformLabels[platform]}
            </h3>
            <div className="preview">{post.content}</div>
            <p className="subtle" style={{ marginTop: 10 }}>
              Múi giờ: Asia/Ho_Chi_Minh
            </p>
          </div>
        </div>
        <div className="actions">
          <button className="secondary" onClick={() => setSaved(true)}>
            Lưu thay đổi
          </button>
          {post.status === "draft" && (
            <button
              className="secondary"
              onClick={approvePost}
              disabled={!hasPost || !post.content.trim()}
            >
              Duyệt bài
            </button>
          )}
          <button
            className="primary"
            onClick={() => schedulePost("2026-09-10 09:30")}
            disabled={!hasPost || post.status !== "approved"}
          >
            Lên lịch
          </button>
        </div>
        {saved && (
          <p
            className="subtle"
            style={{
              padding: "0 20px 18px",
              textAlign: "right",
              color: "var(--green)",
            }}
          >
            Đã lưu thay đổi
          </p>
        )}
      </section>
    </div>
  );
}

export function DetailViewPro({
  selected,
  platform,
  setPlatform,
  onBack,
  updatePost,
  approvePost,
  schedulePost,
  saved,
  setSaved,
}: {
  selected: ContentItem;
  platform: Platform;
  setPlatform: (platform: Platform) => void;
  onBack: () => void;
  updatePost: (
    contentId: string,
    postId: string,
    update: Partial<SocialPost>,
  ) => void;
  approvePost: () => void;
  schedulePost: (scheduledAt: string) => void;
  saved: boolean;
  setSaved: (value: boolean) => void;
}) {
  const post = selected.posts.find((item) => item.platform === platform) ?? {
    id: "",
    platform,
    postType: "post" as const,
    content: "",
    status: "draft" as const,
  };
  const hasPost = Boolean(post.id);
  const [modal, setModal] = useState<"approve" | "schedule" | null>(null);
  const tomorrow = new Date(Date.now() + 86400000);
  const defaultDate = tomorrow.toISOString().slice(0, 10);
  const [scheduleDate, setScheduleDate] = useState(defaultDate);
  const [scheduleTime, setScheduleTime] = useState("09:30");
  const [scheduleError, setScheduleError] = useState("");

  function confirmSchedule() {
    const selectedDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (
      !scheduleDate ||
      !scheduleTime ||
      Number.isNaN(selectedDateTime.getTime()) ||
      selectedDateTime <= new Date()
    ) {
      setScheduleError("Vui lòng chọn thời gian ở tương lai.");
      return;
    }
    schedulePost(`${scheduleDate} ${scheduleTime}`);
    setModal(null);
    setScheduleError("");
  }

  return (
    <div className="editor-page">
      <header className="editor-header">
        <div>
          <button className="editor-back" onClick={onBack}>
            <ArrowLeft size={16} /> Quay lại thư viện
          </button>
          <div className="editor-title-row">
            <div>
              <div className="eyebrow">Biên tập nội dung</div>
              <h1>Chi tiết bài viết</h1>
              <p className="subtle">
                {selected.employee} <span className="meta-dot">•</span> Tạo ngày{" "}
                {selected.createdAt}
              </p>
            </div>
            <span className={`badge ${hasPost ? post.status : "draft"}`}>
              {hasPost ? statusLabels[post.status] : "Chưa có nội dung"}
            </span>
          </div>
        </div>
      </header>
      <div className="editor-layout">
        <aside className="editor-context">
          <section className="context-section">
            <div className="context-heading">
              <FileText size={16} />
              <span>Thông tin công việc</span>
            </div>
            <div className="context-note">{selected.note}</div>
          </section>
          <section className="context-section">
            <div className="context-heading">
              <ImageIcon size={16} />
              <span>Media đính kèm</span>
              <small>
                {selected.images.length} ảnh
                {selected.videos.length ? ` · ${selected.videos.length} video` : ""}
              </small>
            </div>
            <div className="context-images">
              <AntImage.PreviewGroup>
                {selected.images.map((image) => (
                  <div className="context-image" key={image}>
                    {isImageSource(image) ? (
                      <AntImage
                        src={image}
                        alt="Ảnh công việc"
                        preview={{ mask: "Xem ảnh lớn" }}
                        width="100%"
                        height="100%"
                      />
                    ) : (
                      image
                    )}
                  </div>
                ))}
              </AntImage.PreviewGroup>
            </div>
            {selected.videos.length > 0 && (
              <div className="context-videos">
                {selected.videos.map((video) => (
                  <video
                    className="context-video"
                    key={video}
                    src={isVideoSource(video) ? video : undefined}
                    controls
                    preload="metadata"
                    aria-label="Video đính kèm"
                  />
                ))}
              </div>
            )}
          </section>
          <section className="context-section context-meta">
            <div>
              <span>Nguồn dữ liệu</span>
              <strong>Google Form</strong>
            </div>
            <div>
              <span>Người gửi</span>
              <strong>{selected.employee}</strong>
            </div>
            <div>
              <span>Múi giờ</span>
              <strong>Asia/Ho_Chi_Minh</strong>
            </div>
          </section>
        </aside>
        <main className="editor-workspace">
          <div className="platform-bar">
            <div>
              <span className="workspace-label-light">NỀN TẢNG ĐĂNG</span>
              <div className="platform-tabs">
                {(["facebook", "linkedin", "youtube"] as Platform[]).map((item) => (
                  <button
                    className={platform === item ? "active" : ""}
                    key={item}
                    disabled={
                      !selected.posts.some((post) => post.platform === item)
                    }
                    title={
                      selected.posts.some((post) => post.platform === item)
                        ? undefined
                        : `Chưa có nội dung ${platformLabels[item]}`
                    }
                    onClick={() => setPlatform(item)}
                  >
                    {platformLabels[item]}
                  </button>
                ))}
              </div>
            </div>
            <div className="editor-tools">
              <button title="Xem trước">
                <Eye size={16} /> Xem trước
              </button>
              <span className="tool-divider" />
              <span className="character-count">
                {post.content.length} ký tự
              </span>
            </div>
          </div>
          <div className="writing-grid">
            <section className="writing-panel">
              <div className="writing-panel-head">
                <div>
                  <h2>Nội dung bài đăng</h2>
                  <p className="subtle">
                    Bạn có thể chỉnh sửa nội dung AI trước khi duyệt.
                  </p>
                </div>
                <span className="ai-tag">AI đã tạo</span>
              </div>
              {hasPost && post.platform === "youtube" && (
                <div className="video-copy-fields">
                  <label>
                    <span>
                      {post.postType === "youtube_short"
                        ? "Tiêu đề YouTube Short"
                        : "Tiêu đề video thường"}
                    </span>
                    <input
                      className="video-title-input"
                      value={post.title ?? ""}
                      maxLength={100}
                      disabled={post.status === "published"}
                      placeholder="Nhập tiêu đề video"
                      onChange={(event) =>
                        updatePost(selected.id, post.id, {
                          title: event.target.value,
                          status:
                            post.status === "approved" ? "draft" : post.status,
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>Mô tả video</span>
                    <textarea
                      className="video-description-input"
                      value={post.description ?? ""}
                      rows={4}
                      disabled={post.status === "published"}
                      placeholder="Nhập mô tả video"
                      onChange={(event) =>
                        updatePost(selected.id, post.id, {
                          description: event.target.value,
                          status:
                            post.status === "approved" ? "draft" : post.status,
                        })
                      }
                    />
                  </label>
                </div>
              )}
              <textarea
                className="pro-textarea"
                value={post.content}
                disabled={!hasPost || post.status === "published"}
                onChange={(event) =>
                  updatePost(selected.id, post.id, {
                    content: event.target.value,
                    status: post.status === "approved" ? "draft" : post.status,
                  })
                }
              />
              <div className="writing-footer">
                <span>Đã lưu tự động khi bấm lưu</span>
                <button className="secondary" onClick={() => setSaved(true)}>
                  <Save size={15} /> Lưu thay đổi
                </button>
              </div>
            </section>
            <section className="preview-panel">
              <div className="preview-head">
                <div>
                  <h2>Xem trước</h2>
                  <p className="subtle">Hiển thị gần giống bài đăng thật</p>
                </div>
                <span className="preview-platform">
                  {hasPost
                    ? postTypeLabels[post.postType] || platformLabels[platform]
                    : platformLabels[platform]}
                </span>
              </div>
              <div className={`social-preview ${platform}`}>
                <div className="social-preview-head">
                  <div className="preview-avatar">
                    <img src="/images/logo.png" alt="EPCB" />
                  </div>
                  <div>
                    <strong>EPCB</strong>
                    <span>Vừa xong · 🌐</span>
                  </div>
                  <MoreHorizontal size={17} />
                </div>
                <div className="social-copy">
                  {hasPost
                    ? post.content
                    : `Chưa có nội dung ${platformLabels[platform]}.`}
                </div>
                <div className={`preview-image ${selected.videos.length ? "has-video" : ""}`}>
                  {selected.videos.length ? (
                    <div className={`preview-video-wrap ${post.postType}`}>
                      <video
                        className="preview-video"
                        src={isVideoSource(selected.videos[0]) ? selected.videos[0] : undefined}
                        controls
                        preload="metadata"
                        playsInline
                        aria-label={postTypeLabels[post.postType]}
                      />
                      <span className="video-type-chip">
                        {postTypeLabels[post.postType]}
                      </span>
                    </div>
                  ) : selected.images.length ? (
                    <AntImage.PreviewGroup>
                      <div
                        className={`preview-images count-${Math.min(selected.images.length, 3)}`}
                      >
                        {selected.images.map((image) =>
                          isImageSource(image) ? (
                            <AntImage
                              key={image}
                              src={image}
                              alt="Ảnh bài đăng"
                              preview={{ mask: "Xem ảnh lớn" }}
                            />
                          ) : null,
                        )}
                      </div>
                    </AntImage.PreviewGroup>
                  ) : (
                    "Media bài đăng"
                  )}
                </div>
                {platform === "youtube" && hasPost && (
                  <div className="youtube-preview-copy">
                    <strong>{post.title || "Chưa có tiêu đề video"}</strong>
                    <p>{post.description || "Chưa có mô tả video"}</p>
                  </div>
                )}
                <div className="preview-actions">
                  <span>♡ Thích</span>
                  <span>◯ Bình luận</span>
                  <span>↗ Chia sẻ</span>
                </div>
              </div>
            </section>
          </div>
          <div className="editor-action-bar">
            <div>
              {saved && (
                <span className="saved-message">
                  <Check size={15} /> Đã lưu thay đổi
                </span>
              )}
            </div>
            <div className="action-buttons">
              {post.status === "draft" && (
                <button
                  className="secondary"
                  onClick={() => setModal("approve")}
                  disabled={!hasPost || !post.content.trim()}
                >
                  <Check size={15} /> Duyệt bài
                </button>
              )}
              <button
                className="primary"
                onClick={() => setModal("schedule")}
                disabled={!hasPost || post.status !== "approved"}
              >
                <CalendarClock size={15} /> Lên lịch đăng
              </button>
            </div>
          </div>
          {modal && (
            <div
              className="modal-backdrop"
              role="presentation"
              onMouseDown={(event) =>
                event.target === event.currentTarget && setModal(null)
              }
            >
              <section
                className="confirm-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                {modal === "approve" ? (
                  <>
                    <div className="modal-icon approve-icon">
                      <Check size={20} />
                    </div>
                    <h2 id="modal-title">Duyệt bài viết?</h2>
                    <p>
                      Bài viết {platformLabels[platform]} sẽ chuyển sang trạng
                      thái đã duyệt và sẵn sàng để lên lịch.
                    </p>
                    <div className="modal-actions">
                      <button
                        className="secondary"
                        onClick={() => setModal(null)}
                      >
                        Hủy
                      </button>
                      <button
                        className="primary"
                        onClick={() => {
                          approvePost();
                          setModal(null);
                        }}
                      >
                        <Check size={15} /> Xác nhận duyệt
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="modal-icon schedule-icon">
                      <CalendarClock size={20} />
                    </div>
                    <h2 id="modal-title">Lên lịch đăng bài</h2>
                    <p>
                      Chọn thời gian đăng cho bài {platformLabels[platform]}.
                    </p>
                    <div className="schedule-fields">
                      <label>
                        Ngày đăng
                        <input
                          type="date"
                          min={new Date().toISOString().slice(0, 10)}
                          value={scheduleDate}
                          onChange={(event) =>
                            setScheduleDate(event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Giờ đăng
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(event) =>
                            setScheduleTime(event.target.value)
                          }
                        />
                      </label>
                    </div>
                    <div className="timezone-note">
                      <CalendarDays size={14} /> Múi giờ: Asia/Ho_Chi_Minh
                    </div>
                    {scheduleError && (
                      <p className="modal-error">{scheduleError}</p>
                    )}
                    <div className="modal-actions">
                      <button
                        className="secondary"
                        onClick={() => setModal(null)}
                      >
                        Hủy
                      </button>
                      <button className="primary" onClick={confirmSchedule}>
                        <CalendarClock size={15} /> Xác nhận lên lịch
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function PostList({
  title,
  posts,
  retryPost,
}: {
  title: string;
  posts: (SocialPost & { employee: string; contentId: string })[];
  retryPost?: (contentId: string, postId: string) => void;
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
                <td>{platformLabels[post.platform]}</td>
                <td>{truncateText(getPostDisplayTitle(post), 55)}</td>
                <td>{post.employee}</td>
                <td>
                  <span className={`badge ${post.status}`}>
                    {statusLabels[post.status]}
                  </span>
                </td>
                <td className="subtle">
                  {post.error ?? post.scheduledAt ?? "Đăng thành công"}
                </td>
                <td>
                  {retryPost && (
                    <button
                      className="secondary"
                      onClick={() => retryPost(post.contentId, post.id)}
                    >
                      Thử lại
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Calendar({
  posts,
}: {
  posts: (SocialPost & { employee: string; contentId: string })[];
}) {
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
  }).format(month);

  function scheduledDateKey(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.slice(0, 10);
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  const monthPosts = posts.filter((post) =>
    scheduledDateKey(post.scheduledAt).startsWith(monthKey),
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <h2>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</h2>
          <p className="subtle">Bài đã lên lịch · Asia/Ho_Chi_Minh</p>
        </div>
        <div className="calendar-nav">
          <button
            className="secondary"
            aria-label="Tháng trước"
            onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
          >
            ←
          </button>
          <button
            className="secondary"
            onClick={() => {
              const today = new Date();
              setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            }}
          >
            Tháng hiện tại
          </button>
          <button
            className="secondary"
            aria-label="Tháng sau"
            onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
          >
            →
          </button>
        </div>
      </div>
      <div className="calendar">
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
          <div className="day" key={day}>
            <strong>{day}</strong>
          </div>
        ))}
        {Array.from({ length: firstDay }, (_, index) => (
          <div className="day calendar-empty" key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dayKey = `${monthKey}-${String(day).padStart(2, "0")}`;
          const events = monthPosts.filter(
            (post) => scheduledDateKey(post.scheduledAt) === dayKey,
          );
          return (
            <div className="day" key={day}>
              <div className="day-num">{day}</div>
              {events.map((event) => (
                <div className="event" key={event.id}>
                  {postTypeLabels[event.postType] || platformLabels[event.platform]} ·{" "}
                  {event.scheduledAt
                    ? new Intl.DateTimeFormat("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(event.scheduledAt))
                    : ""}
                  <br />
                  {event.employee}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
