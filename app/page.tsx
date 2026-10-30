"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ContentItem,
  Platform,
  PostType,
  SocialPost,
  ContentStatus,
} from "@/lib/content-types";
import { CircleAlert, RefreshCw } from "lucide-react";
import { ContentSidebar } from "@/app/content/components/ContentSidebar";
import { DashboardSkeleton } from "@/app/content/components/DashboardSkeleton";
import { DashboardView } from "@/app/content/components/DashboardView";
import { ContentListView } from "@/app/content/components/ContentListView";
import { ContentEditor } from "@/app/content/components/ContentEditor";
import { PostListView } from "@/app/content/components/PostListView";
import { CalendarView } from "@/app/content/components/CalendarView";
import { WorkspaceHeader } from "@/app/content/components/WorkspaceHeader";
import { getContentTitle, getOverallStatus, viewTitle, type View } from "@/app/content/ui/content-presentation";


export default function Home() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ContentStatus | "all">("all");
  const [retryingPostId, setRetryingPostId] = useState<string | null>(null);
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
    approved: allPosts.filter((post) => post.status === "approved").length,
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

  async function updatePost(
    contentId: string,
    postId: string,
    update: Partial<SocialPost>,
  ): Promise<boolean> {
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
    try {
      const response = await fetch(`/api/social-posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setLoadError(result?.error || "Không thể lưu thay đổi.");
        void loadContents();
        return false;
      }
      return true;
    } catch {
      setLoadError("Không thể kết nối để lưu thay đổi.");
      void loadContents();
      return false;
    }
  }

  async function createPlatformPost(
    contentId: string,
    targetPlatform: Platform,
    postType: PostType,
    content: string,
  ) {
    const response = await fetch(`/api/contents/${contentId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: targetPlatform, postType, content }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success)
      throw new Error(result?.error || "Không thể thêm nền tảng đăng bài.");

    const newPost = result.data as SocialPost;
    setContents((current) => current.map((item) =>
      item.id === contentId && !item.posts.some((post) => post.platform === targetPlatform)
        ? { ...item, posts: [...item.posts, newPost] }
        : item,
    ));
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

  function onContentDeleted(id: string) {
    setContents((current) => current.filter((item) => item.id !== id));
    setSelectedId((current) => current === id ? null : current);
  }

  function openContent(contentId: string, targetPlatform?: Platform) {
    const item = contents.find((content) => content.id === contentId);
    const requestedPlatform = targetPlatform && item?.posts.some((post) => post.platform === targetPlatform)
      ? targetPlatform
      : item?.posts[0]?.platform;
    if (requestedPlatform) setPlatform(requestedPlatform);
    setSelectedId(contentId);
  }

  async function retryPost(contentId: string, postId: string) {
    if (retryingPostId) return;
    setRetryingPostId(postId);
    try {
      await updatePost(contentId, postId, {
        status: "scheduled",
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
        error: undefined,
      });
    } finally {
      setRetryingPostId(null);
    }
  }

  return (
    <div className="shell">
      <ContentSidebar
        view={view}
        setView={(nextView) => { setSelectedId(null); setView(nextView); }}
        failedCount={counts.failed}
      />
      <main className="main">
        <WorkspaceHeader
          title={selected ? "Chi tiết bài viết" : view === "dashboard" ? "Xin chào, đội ngũ" : viewTitle(view)}
          description={selected ? `${selected.employee} · ${getContentTitle(selected)}` : "Tạo, duyệt và lên lịch nội dung mạng xã hội trong một nơi."}
          refreshing={refreshing}
          loading={loading}
          lastSyncedAt={lastSyncedAt}
          onRefresh={refreshContents}
          compact={Boolean(selected)}
        />
        {!selected && loading && <DashboardSkeleton />}
        {!selected && !loading && loadError && (
          <div className="load-error" role="alert">
            <CircleAlert size={18} />
            <span>{loadError}</span>
            <button className="secondary" onClick={refreshContents} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "spin" : ""} /> Thử lại
            </button>
          </div>
        )}
        {selected && loadError && (
          <div className="load-error" role="alert">
            <CircleAlert size={18} />
            <span>{loadError}</span>
            <button className="secondary" onClick={refreshContents} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "spin" : ""} /> Tải lại
            </button>
          </div>
        )}
        {!loading && !loadError && selected && (
          <ContentEditor
            selected={selected}
            platform={platform}
            setPlatform={setPlatform}
            onBack={() => setSelectedId(null)}
            onDeleted={onContentDeleted}
            updatePost={updatePost}
            approvePost={approvePost}
            schedulePost={schedulePost}
            createPlatformPost={createPlatformPost}
          />
        )}
        {!selected && !loading && !loadError && view === "dashboard" && (
          <DashboardView counts={counts} contents={contents} setView={setView} setStatusFilter={setStatusFilter} setQuery={setQuery} onOpen={openContent} />
        )}
        {!selected && !loading && !loadError && view === "contents" && (
          <ContentListView
            contents={filtered}
            query={query}
            setQuery={setQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            retryPost={retryPost}
            retryingPostId={retryingPostId}
            onDeleted={onContentDeleted}
            onOpen={openContent}
          />
        )}
        {!selected && !loading && !loadError && view === "calendar" && (
          <CalendarView posts={allPosts} onOpen={openContent} />
        )}
        {!selected && !loading && !loadError && view === "published" && (
          <PostListView
            title="Bài đã đăng"
            posts={allPosts.filter((post) => post.status === "published")}
            onOpen={openContent}
          />
        )}
        {!selected && !loading && !loadError && view === "failed" && (
          <PostListView
            title="Bài đăng lỗi"
            posts={allPosts.filter((post) => post.status === "failed")}
            retryPost={retryPost}
            retryingPostId={retryingPostId}
            onOpen={openContent}
          />
        )}
      </main>
    </div>
  );
}
