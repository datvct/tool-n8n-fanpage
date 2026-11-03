"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import type { ContentItem, Platform } from "@/lib/content-types";
import { WorkspaceHeader } from "@/app/content/components/WorkspaceHeader";
import { CalendarView } from "@/app/content/components/CalendarView";
import { PostListView } from "@/app/content/components/PostListView";
import { useWorkspaceLoading } from "@/app/content/WorkspaceLayout";

export default function PostQueueRoute({ view }: { view: "calendar" | "failed" }) {
  const router = useRouter();
  const setWorkspaceLoading = useWorkspaceLoading();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [retryingPostId, setRetryingPostId] = useState<string | null>(null);

  async function loadContents() {
    try {
      setError("");
      const response = await fetch("/api/contents", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error);
      setContents(result.data);
      setLastSyncedAt(new Date());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setWorkspaceLoading(true);
    void loadContents().finally(() => setWorkspaceLoading(false));
  }, [setWorkspaceLoading]);

  async function refresh() {
    setRefreshing(true);
    await loadContents();
    setRefreshing(false);
  }

  const posts = contents.flatMap((item) => item.posts.map((post) => ({
    ...post,
    employee: item.employee,
    contentId: item.id,
  })));

  function openContent(contentId: string, platform?: Platform) {
    const params = new URLSearchParams({ from: view === "calendar" ? "/schedule" : "/failed" });
    if (platform) params.set("platform", platform);
    const query = `?${params.toString()}`;
    router.push(`/content/${contentId}${query}`);
  }

  async function retryPost(contentId: string, postId: string) {
    if (retryingPostId) return;
    setRetryingPostId(postId);
    try {
      const response = await fetch(`/api/social-posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "scheduled", scheduledAt: new Date(Date.now() + 60_000).toISOString() }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) setError(result?.error || "Không thể thử đăng lại.");
      await loadContents();
    } finally {
      setRetryingPostId(null);
    }
  }

  return (
    <>
        <WorkspaceHeader
          title={view === "calendar" ? "Lịch đăng bài" : "Bài đăng lỗi"}
          description={view === "calendar" ? "Theo dõi và chỉnh lịch các bài đã lên lịch." : "Kiểm tra lỗi và thử đăng lại bài viết."}
          refreshing={refreshing}
          loading={loading}
          lastSyncedAt={lastSyncedAt}
          onRefresh={refresh}
        />
        {error && <div className="load-error" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
        {loading ? <div className="route-content-loading">Đang tải dữ liệu hiển thị…</div> : view === "calendar" ? (
          <CalendarView posts={posts} onOpen={openContent} />
        ) : (
          <PostListView
            title="Bài đã đăng lỗi"
            posts={posts.filter((post) => post.status === "failed")}
            retryPost={retryPost}
            retryingPostId={retryingPostId}
            onOpen={openContent}
          />
        )}
    </>
  );
}
