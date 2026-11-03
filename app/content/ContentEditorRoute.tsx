"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { ContentEditor } from "@/app/content/components/ContentEditor";
import type { ContentItem, Platform, PostType, SocialPost } from "@/lib/content-types";
import { getContentTitle } from "@/app/content/ui/content-presentation";
import { WorkspaceHeader } from "@/app/content/components/WorkspaceHeader";
import { useWorkspaceLoading } from "@/app/content/WorkspaceLayout";

export default function ContentEditorRoute({ id, initialPlatform, returnTo = "/" }: { id: string; initialPlatform?: Platform; returnTo?: string }) {
  const router = useRouter();
  const setWorkspaceLoading = useWorkspaceLoading();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [platform, setPlatform] = useState<Platform>(initialPlatform ?? "facebook");
  const [error, setError] = useState("");

  useEffect(() => {
    setWorkspaceLoading(true);
    fetch(`/api/contents/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error);
        const item = result.data as ContentItem;
        setContent(item);
        if (initialPlatform && item.posts.some((post) => post.platform === initialPlatform)) setPlatform(initialPlatform);
        else if (item.posts[0]) setPlatform(item.posts[0].platform);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Không thể tải nội dung."),
      )
      .finally(() => setWorkspaceLoading(false));
  }, [id, initialPlatform, setWorkspaceLoading]);

  async function updatePost(_contentId: string, postId: string, update: Partial<SocialPost>): Promise<boolean> {
    const previousPost = content?.posts.find((post) => post.id === postId);
    setError("");
    setContent((current) =>
      current
        ? { ...current, posts: current.posts.map((post) => post.id === postId ? { ...post, ...update } : post) }
        : current,
    );
    try {
      const response = await fetch(`/api/social-posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (previousPost) setContent((current) => current ? { ...current, posts: current.posts.map((post) => post.id === postId ? previousPost : post) } : current);
        setError(result?.error || "Không thể lưu thay đổi.");
        return false;
      }
      if (result?.data) {
        setContent((current) => current ? { ...current, posts: current.posts.map((post) => post.id === postId ? {
          ...post,
          status: result.data.status,
          scheduledAt: result.data.scheduledAt?.toString?.() ?? (result.data.scheduledAt ? new Date(result.data.scheduledAt).toISOString() : undefined),
          error: result.data.errorMessage ?? undefined,
        } : post) } : current);
      }
      return true;
    } catch {
      if (previousPost) setContent((current) => current ? { ...current, posts: current.posts.map((post) => post.id === postId ? previousPost : post) } : current);
      setError("Không thể kết nối để lưu thay đổi. Hãy tải lại trang trước khi tiếp tục.");
      return false;
    }
  }

  async function createPlatformPost(
    contentId: string,
    targetPlatform: Platform,
    postType: PostType,
    postContent: string,
  ) {
    const response = await fetch(`/api/contents/${contentId}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: targetPlatform, postType, content: postContent }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success)
      throw new Error(result?.error || "Không thể thêm nền tảng đăng bài.");
    const newPost = result.data as SocialPost;
    setContent((current) => current && !current.posts.some((post) => post.platform === targetPlatform)
      ? { ...current, posts: [...current.posts, newPost] }
      : current);
  }

  function approvePost() {
    const post = content?.posts.find((item) => item.platform === platform);
    if (content && post?.content.trim()) updatePost(content.id, post.id, { status: "approved", error: undefined });
  }

  async function schedulePost(scheduledAt: string): Promise<boolean> {
    const post = content?.posts.find((item) => item.platform === platform);
    if (content && post && (post.status === "approved" || (post.status === "scheduled" && post.scheduledAt && new Date(post.scheduledAt) <= new Date())))
      return updatePost(content.id, post.id, { status: "scheduled", scheduledAt });
    return false;
  }

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(returnTo);
  };
  return (
    <>
        <WorkspaceHeader
          title={content ? "Chi tiết bài viết" : "Đang mở bài viết"}
          description={content ? `${content.employee} · ${getContentTitle(content)}` : "Đang tải nội dung bài viết."}
          refreshing={false}
          loading={!content}
          lastSyncedAt={null}
          onRefresh={() => window.location.reload()}
          compact
        />
        {error && <div className="load-error" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
        {!content && !error && <div className="route-content-loading">Đang mở bài viết…</div>}
        {content && (
          <ContentEditor
            selected={content}
            platform={platform}
            setPlatform={setPlatform}
            onBack={goBack}
            onDeleted={() => router.push(returnTo)}
            updatePost={updatePost}
            approvePost={approvePost}
            schedulePost={schedulePost}
            createPlatformPost={createPlatformPost}
          />
        )}
    </>
  );
}
