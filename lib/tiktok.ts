export const tiktokPrivacyLabels = {
  PUBLIC_TO_EVERYONE: "Công khai",
  MUTUAL_FOLLOW_FRIENDS: "Bạn bè",
  FOLLOWER_OF_CREATOR: "Người theo dõi",
  SELF_ONLY: "Chỉ mình tôi",
} as const;

export type TikTokOptions = {
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
  isAigc: boolean;
};

export type TikTokCreator = {
  creator_username: string;
  creator_nickname: string;
  privacy_level_options: string[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
};

export function isTikTokOptions(value: unknown): value is TikTokOptions {
  if (!value || typeof value !== "object") return false;
  const options = value as Record<string, unknown>;
  return typeof options.privacyLevel === "string" &&
    (options.privacyLevel === "" || Object.hasOwn(tiktokPrivacyLabels, options.privacyLevel)) &&
    ["allowComment", "allowDuet", "allowStitch", "brandOrganic", "brandContent", "isAigc"]
      .every((key) => typeof options[key] === "boolean");
}

export function validateTikTokPost(content: string): string | null {
  if (!content.trim() || content.length > 2200) return "Caption TikTok cần từ 1 đến 2.200 ký tự.";
  return null;
}
