"use client";

import { useEffect, useState } from "react";
import { Spin } from "antd";
import { ContentEditor } from "@/app/content/components/ContentEditor";
import type { ContentItem, Platform, PostType, SocialPost } from "@/lib/content-types";

export default function ContentEditorRoute({ id }: { id: string }) {
  const [content, setContent] = useState<ContentItem | null>(null);
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/contents/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error);
        const item = result.data as ContentItem;
        setContent(item);
        if (item.posts[0]) setPlatform(item.posts[0].platform);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "Không thể tải nội dung."),
      );
  }, [id]);

  async function updatePost(_contentId: string, postId: string, update: Partial<SocialPost>): Promise<boolean> {
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
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error || "Không thể lưu thay đổi.");
        return false;
      }
      return true;
    } catch {
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

  function schedulePost(scheduledAt: string) {
    const post = content?.posts.find((item) => item.platform === platform);
    if (content && post?.status === "approved") updatePost(content.id, post.id, { status: "scheduled", scheduledAt });
  }

  if (error && !content) return <main className="shared-page"><div className="shared-error">{error}</div></main>;
  if (!content) return <main className="shared-page"><Spin size="large" /></main>;

  return <>{error && <div className="shared-error" role="alert">{error}</div>}<ContentEditor selected={content} platform={platform} setPlatform={setPlatform} onBack={() => window.location.assign("/")} onDeleted={() => window.location.assign("/")} updatePost={updatePost} approvePost={approvePost} schedulePost={schedulePost} createPlatformPost={createPlatformPost} /></>;
}
