export type Platform = "facebook" | "linkedin" | "youtube";
export type PostType =
  | "post"
  | "facebook_reel"
  | "youtube_short"
  | "youtube_video";
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
  status: ContentStatus;
  scheduledAt?: string;
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
