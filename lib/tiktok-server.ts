import type { TikTokCreator } from "./tiktok";

export async function getTikTokCreator(): Promise<TikTokCreator> {
  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) throw new Error("Chưa cấu hình TIKTOK_ACCESS_TOKEN cho tài khoản đăng video.");
  const response = await fetch("https://open.tiktokapis.com/v2/post/publish/creator_info/query/", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  if (!response.ok || result.error?.code !== "ok" || !Array.isArray(result.data?.privacy_level_options))
    throw new Error(`Không thể đọc tài khoản TikTok (${result.error?.code || response.status}).`);
  const data = result.data;
  return {
    creator_username: data.creator_username,
    creator_nickname: data.creator_nickname,
    privacy_level_options: data.privacy_level_options,
    comment_disabled: data.comment_disabled,
    duet_disabled: data.duet_disabled,
    stitch_disabled: data.stitch_disabled,
    max_video_post_duration_sec: data.max_video_post_duration_sec,
  };
}
