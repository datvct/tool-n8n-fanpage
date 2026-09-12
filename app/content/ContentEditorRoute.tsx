"use client";

import { useEffect, useState } from "react";
import { Spin } from "antd";
import { DetailViewPro } from "@/app/page";
import type { ContentItem, Platform, SocialPost } from "@/lib/content-types";

export default function ContentEditorRoute({ id }: { id: string }) {
  const [content, setContent] = useState<ContentItem | null>(null);
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [saved, setSaved] = useState(false);
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

  function updatePost(_contentId: string, postId: string, update: Partial<SocialPost>) {
    setContent((current) =>
      current
        ? { ...current, posts: current.posts.map((post) => post.id === postId ? { ...post, ...update } : post) }
        : current,
    );
    void fetch(`/api/social-posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }).then(async (response) => {
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error || "Không thể lưu thay đổi.");
      }
    });
  }

  function approvePost() {
    const post = content?.posts.find((item) => item.platform === platform);
    if (content && post?.content.trim()) updatePost(content.id, post.id, { status: "approved", error: undefined });
  }

  function schedulePost(scheduledAt: string) {
    const post = content?.posts.find((item) => item.platform === platform);
    if (content && post?.status === "approved") updatePost(content.id, post.id, { status: "scheduled", scheduledAt });
  }

  if (error) return <main className="shared-page"><div className="shared-error">{error}</div></main>;
  if (!content) return <main className="shared-page"><Spin size="large" /></main>;

  return <DetailViewPro selected={content} platform={platform} setPlatform={setPlatform} onBack={() => window.location.assign("/")} updatePost={updatePost} approvePost={approvePost} schedulePost={schedulePost} saved={saved} setSaved={setSaved} />;
}
