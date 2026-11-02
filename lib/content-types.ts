export type Platform = "facebook" | "linkedin" | "youtube" | "tiktok";
export type PostType =
  | "post"
  | "facebook_reel"
  | "youtube_short"
  | "youtube_video"
  | "tiktok_video";
export type ContentStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";

export type SocialPost = {
  id: string;
  platform: Platform;
  postType: PostType;
  content: string;
  title?: string;
  description?: string;
  tiktokOptions?: import("./tiktok").TikTokOptions | null;
  tiktokChannel?: string | null;
  status: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  error?: string;
};

export type ContentItem = {
  id: string;
  employee: string;
  note: string;
  createdAt: string;
  images: string[];
  videos: string[];
  posts: SocialPost[];
};
