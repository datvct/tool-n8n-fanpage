import type { ContentItem, ContentStatus, Platform, PostType, SocialPost } from "@/lib/content-types";

export const statusLabels: Record<ContentStatus, string> = {
  draft: "Bản nháp",
  approved: "Đã duyệt",
  scheduled: "Đã lên lịch",
  published: "Đã đăng",
  failed: "Thất bại",
};
export const platformLabels: Record<Platform, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export const postTypeLabels: Record<PostType, string> = {
  post: "Bài viết thường",
  facebook_reel: "Facebook Reel",
  youtube_short: "YouTube Short",
  youtube_video: "YouTube video thường",
  tiktok_video: "TikTok Video",
};
export const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatVietnamDateTime(value?: string | Date) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: VIETNAM_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function vietnamDateInputValue(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function vietnamMonthStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  return new Date(year, month - 1, 1);
}

export function isImageSource(value: string) {
  return value.startsWith("http") || value.startsWith("/api/media");
}

export function isVideoSource(value: string) {
  return value.startsWith("http") || value.startsWith("/api/media");
}

export function truncateText(value: string, maxLength: number) {
  const text = value.trim();
  return text.length > maxLength
    ? `${text.slice(0, maxLength).trimEnd()}...`
    : text;
}

export function getPostDisplayTitle(post: SocialPost, fallback = "Chưa có tiêu đề") {
  const title = post.platform === "youtube" ? post.title?.trim() : "";
  return title || post.content.trim() || fallback;
}

export function getContentPlatforms(item: ContentItem) {
  return (
    [
      ...new Set(
        item.posts.map((post) =>
          post.postType === "post"
            ? platformLabels[post.platform]
            : postTypeLabels[post.postType],
        ),
      ),
    ].join(" · ") || "Chưa chọn nền tảng"
  );
}

export function getPostChannelLabel(post: SocialPost) {
  return post.postType === "post"
    ? platformLabels[post.platform]
    : postTypeLabels[post.postType];
}

export function getContentTitle(item: ContentItem) {
  const firstPost = item.posts.find(
    (post) => post.content.trim() || post.title?.trim(),
  );
  return firstPost
    ? getPostDisplayTitle(firstPost, item.note || "Chưa có tiêu đề")
    : item.note || "Chưa có tiêu đề";
}

export function getOverallStatus(item: ContentItem): ContentStatus {
  const statuses = item.posts.map((post) => post.status);
  if (statuses.includes("failed")) return "failed";
  if (statuses.length > 0 && statuses.every((status) => status === "published"))
    return "published";
  if (statuses.includes("scheduled")) return "scheduled";
  if (statuses.includes("approved")) return "approved";
  return "draft";
}

export type View = "dashboard" | "contents" | "calendar" | "published" | "failed";

export function viewTitle(view: View) {
  return {
    dashboard: "Tổng quan",
    contents: "Thư viện nội dung",
    calendar: "Lịch đăng bài",
    published: "Bài đã đăng",
    failed: "Bài đăng lỗi",
  }[view];
}
