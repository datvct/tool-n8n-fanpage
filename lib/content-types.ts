export type Platform = "facebook" | "linkedin";
export type ContentStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "published"
  | "failed";

export type SocialPost = {
  id: string;
  platform: Platform;
  content: string;
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
  posts: SocialPost[];
};
