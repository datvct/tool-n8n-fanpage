"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentItem, Platform, SocialPost, ContentStatus } from "@/lib/content-types";
import { CircleAlert, RefreshCw } from "lucide-react";
import { DashboardView } from "@/app/content/components/DashboardView";
import { ContentListView } from "@/app/content/components/ContentListView";
import { PostListView } from "@/app/content/components/PostListView";
import { CalendarView } from "@/app/content/components/CalendarView";
import { WorkspaceHeader } from "@/app/content/components/WorkspaceHeader";
import { viewTitle, type View } from "@/app/content/ui/content-presentation";
import { useWorkspaceLoading } from "@/app/content/WorkspaceLayout";

export default function WorkspaceHome({ initialView }: { initialView: View }) {
  const router = useRouter();
  const setWorkspaceLoading = useWorkspaceLoading();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>(initialView);
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
      setLoadError(error instanceof Error ? error.message : "Không thể tải dữ liệu từ database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setView(initialView);
    setWorkspaceLoading(true);
    void loadContents().finally(() => setWorkspaceLoading(false));
    const timer = window.setInterval(() => void loadContents(), 30000);
    return () => window.clearInterval(timer);
  }, [initialView, setWorkspaceLoading]);

  async function refreshContents() {
    setRefreshing(true);
    await loadContents();
    setRefreshing(false);
  }

  function navigateView(nextView: View) {
    const destinations: Record<View, string> = {
      dashboard: "/",
      contents: "/contents",
      calendar: "/schedule",
      published: "/published",
      failed: "/failed",
    };
    if (destinations[nextView] === window.location.pathname) {
      setView(nextView);
      return;
    }
    router.push(destinations[nextView]);
  }

  const allPosts = contents.flatMap((item) => item.posts.map((post) => ({
    ...post,
    employee: item.employee,
    contentId: item.id,
  })));
  const counts = {
    total: contents.length,
    draft: allPosts.filter((post) => post.status === "draft").length,
    approved: allPosts.filter((post) => post.status === "approved").length,
    scheduled: allPosts.filter((post) => post.status === "scheduled").length,
    published: allPosts.filter((post) => post.status === "published").length,
    failed: allPosts.filter((post) => post.status === "failed").length,
  };
  const filtered = useMemo(() => contents.filter((item) =>
    `${item.employee} ${item.note} ${item.posts.map((post) => post.content).join(" ")}`
      .toLowerCase().includes(query.toLowerCase())), [contents, query]);

  async function updatePost(contentId: string, postId: string, update: Partial<SocialPost>): Promise<boolean> {
    setContents((current) => current.map((item) => item.id !== contentId ? item : {
      ...item,
      posts: item.posts.map((post) => post.id === postId ? { ...post, ...update } : post),
    }));
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

  function onContentDeleted(id: string) {
    setContents((current) => current.filter((item) => item.id !== id));
  }

  function openContent(contentId: string, platform?: Platform) {
    const params = new URLSearchParams({ from: view === "calendar" ? "/schedule" : view === "failed" ? "/failed" : window.location.pathname });
    if (platform) params.set("platform", platform);
    router.push(`/content/${contentId}?${params.toString()}`);
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
    <>
      <WorkspaceHeader
        title={viewTitle(view)}
        description="Tạo, duyệt và lên lịch nội dung mạng xã hội trong một nơi."
        refreshing={refreshing}
        loading={loading}
        lastSyncedAt={lastSyncedAt}
        onRefresh={refreshContents}
      />
      {!loading && loadError && (
        <div className="load-error" role="alert">
          <CircleAlert size={18} /><span>{loadError}</span>
          <button className="secondary" onClick={refreshContents} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "spin" : ""} /> Thử lại
          </button>
        </div>
      )}
      {loading && <div className="route-content-loading">Đang tải dữ liệu hiển thị…</div>}
      {!loading && !loadError && view === "dashboard" && (
        <DashboardView counts={counts} contents={contents} setView={navigateView} setStatusFilter={setStatusFilter} setQuery={setQuery} onOpen={openContent} />
      )}
      {!loading && !loadError && view === "contents" && (
        <ContentListView contents={filtered} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} retryPost={retryPost} retryingPostId={retryingPostId} onDeleted={onContentDeleted} onOpen={openContent} />
      )}
      {!loading && !loadError && view === "calendar" && <CalendarView posts={allPosts} onOpen={openContent} />}
      {!loading && !loadError && view === "published" && <PostListView title="Bài đã đăng" posts={allPosts.filter((post) => post.status === "published")} onOpen={openContent} />}
      {!loading && !loadError && view === "failed" && <PostListView title="Bài đăng lỗi" posts={allPosts.filter((post) => post.status === "failed")} retryPost={retryPost} retryingPostId={retryingPostId} onOpen={openContent} />}
    </>
  );
}
